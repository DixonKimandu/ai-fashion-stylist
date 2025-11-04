import { NextRequest } from 'next/server';
import { getGenAi, outfitRecommendationSchema, stylingSystemInstruction } from '../../../../lib/ai';

// Increase body size limit for image uploads
export const maxDuration = 60; // 60 seconds timeout
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return new Response(
        JSON.stringify({ error: 'Failed to parse request body. The request may be too large or malformed.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { prompt, userImage, inventoryImages } = body;
    
    if (!prompt || !userImage || !inventoryImages) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: prompt, userImage, or inventoryImages' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const ai = getGenAi();

    const userImagePart = { inlineData: { data: userImage.base64, mimeType: userImage.mimeType } };
    const inventoryImageParts = (inventoryImages || []).map((img: any) => ({ inlineData: { data: img.base64, mimeType: img.mimeType } }));

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: `Style the user's garment (first image) using items from the inventory (subsequent images) for: "${prompt}"` }, userImagePart, ...inventoryImageParts] }],
      config: {
        systemInstruction: stylingSystemInstruction,
        responseMimeType: 'application/json',
        responseSchema: outfitRecommendationSchema,
      },
    });

    const jsonText = response.text?.trim() || '';
    return new Response(jsonText, { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Failed to generate recommendation' }), { status: 500 });
  }
}

