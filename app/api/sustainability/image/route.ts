import { NextRequest } from 'next/server';
import { getGenAi, imageModality } from '../../../../lib/ai';

export async function POST(req: NextRequest) {
  try {
    const { imagePrompt, userImages } = await req.json();
    const ai = getGenAi();

    const imageParts = (userImages || []).map((img: any) => ({ inlineData: { data: img.base64, mimeType: img.mimeType } }));

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: imagePrompt }, ...imageParts] },
      config: { responseModalities: [imageModality] },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64ImageBytes: string = part.inlineData.data || '';
        const dataUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
        return new Response(JSON.stringify({ imageDataUrl: dataUrl }), { status: 200 });
      }
    }
    return new Response(JSON.stringify({ error: 'No image generated' }), { status: 422 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Failed to generate image' }), { status: 500 });
  }
}

