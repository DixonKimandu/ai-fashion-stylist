import { NextRequest } from 'next/server';
import { getGenAi, sustainabilitySystemInstruction, toteBagRecommendationSchema } from '../../../../lib/ai';

export async function POST(req: NextRequest) {
  try {
    const { userImages, additionalMaterial } = await req.json();
    const ai = getGenAi();

    const imageParts = (userImages || []).map((img: any) => ({ inlineData: { data: img.base64, mimeType: img.mimeType } }));

    let textInstruction = `Analyze these uploaded old clothing items carefully. Detect the material type and fabric characteristics. Create a sustainable tote bag design that DIRECTLY incorporates the visual elements from these specific clothing items - their patterns, textures, colors, seams, pockets, and distinctive features.`;
    if (additionalMaterial) {
      textInstruction += ` Additionally, incorporate ${additionalMaterial} material into the design alongside the uploaded clothing to create a unique combination and design variety.`;
    } else {
      textInstruction += ` Use ONLY the uploaded clothing material - create a plain, simple design that showcases the original clothing without additional materials.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: textInstruction }, ...imageParts] }],
      config: {
        systemInstruction: sustainabilitySystemInstruction,
        responseMimeType: 'application/json',
        responseSchema: toteBagRecommendationSchema,
      },
    });

    const jsonText = response.text?.trim() || '';
    return new Response(jsonText, { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Failed to generate tote bag design' }), { status: 500 });
  }
}

