import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import type { ToteBagRecommendation } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const toteBagRecommendationSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "A catchy title for the tote bag design." },
    description: { type: Type.STRING, description: "A detailed description of the tote bag design and how it incorporates the old clothing material, including specific visual elements from the uploaded items." },
    material_type: { type: Type.STRING, description: "The detected material type from the uploaded clothing (denim, khaki, corduroy, or other fabric types like cotton, polyester, etc.)." },
    design_features: {
      type: Type.ARRAY,
      description: "List of specific design features, patterns, or details that make this tote bag unique, including how elements from the uploaded clothing (pockets, seams, patches, patterns, textures) are incorporated.",
      items: { type: Type.STRING }
    },
    color_palette: {
      type: Type.ARRAY,
      description: "Color palette extracted directly from the old clothing images that will be used in the tote bag design.",
      items: { type: Type.STRING }
    },
    image_description: {
      type: Type.STRING,
      description: "A detailed, vivid description of the tote bag design for image generation. The description must specifically incorporate visual elements from the uploaded clothing items (patterns, textures, colors, details, fabric characteristics). Describe how the actual uploaded clothing is transformed into the tote bag - include specific visual details like fabric texture, patterns, color schemes, and any distinctive features visible in the uploaded images. If an additional material was specified, clearly describe how it is incorporated alongside the uploaded clothing (accents, handles, patches, complementary sections, etc.). If no additional material was specified, describe a plain design using only the uploaded clothing."
    }
  },
  required: ["title", "description", "material_type", "design_features", "color_palette", "image_description"]
};

const systemInstruction = "You are a sustainable fashion designer specializing in upcycling old clothing into functional and stylish tote bags. Analyze the uploaded clothing items carefully - examine their fabric type, texture, patterns, colors, and distinctive features. Create a tote bag design that DIRECTLY incorporates and transforms these specific visual elements from the uploaded clothing into the bag design. Detect the material type from what you see in the images. Your design should preserve recognizable elements from the original clothing (patterns, textures, seams, pockets, etc.) while creating a functional tote bag. If an additional material type is specified, incorporate that material into the design alongside the uploaded clothing to create variety and interesting combinations. Your text response must be strictly in the form of a JSON object that adheres to the provided schema. The `image_description` is critical - it must vividly describe a tote bag that visibly incorporates the specific visual characteristics, patterns, textures, and details from the uploaded clothing images.";

export const getToteBagDesign = async (
  userImages: { base64: string; mimeType: string }[],
  additionalMaterial?: string
): Promise<ToteBagRecommendation> => {
  const imageParts = userImages.map(img => ({
    inlineData: {
      data: img.base64,
      mimeType: img.mimeType,
    }
  }));

  let textInstruction = `Analyze these uploaded old clothing items carefully. Detect the material type and fabric characteristics. Create a sustainable tote bag design that DIRECTLY incorporates the visual elements from these specific clothing items - their patterns, textures, colors, seams, pockets, and distinctive features. Transform these exact garments into a functional, stylish tote bag that preserves and showcases the unique visual characteristics of the uploaded clothing.`;
  
  if (additionalMaterial) {
    textInstruction += ` Additionally, incorporate ${additionalMaterial} material into the design alongside the uploaded clothing to create a unique combination and design variety. Blend the ${additionalMaterial} material with the uploaded clothing in creative ways - use it for accents, handles, patches, or complementary sections of the bag.`;
  } else {
    textInstruction += ` Use ONLY the uploaded clothing material - create a plain, simple design that showcases the original clothing without additional materials.`;
  }

  const textPart = {
    text: textInstruction,
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ parts: [textPart, ...imageParts] }],
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: toteBagRecommendationSchema,
    },
  });

  const jsonText = response.text.trim();
  try {
    return JSON.parse(jsonText) as ToteBagRecommendation;
  } catch (e) {
    console.error("Failed to parse JSON response:", jsonText);
    throw new Error("The AI returned an invalid response format. Please try again.");
  }
};

export const generateToteBagImage = async (
  imagePrompt: string,
  userImages?: { base64: string; mimeType: string }[]
): Promise<string> => {
  const textPart = { text: imagePrompt };
  
  const imageParts = userImages?.map(img => ({
    inlineData: {
      data: img.base64,
      mimeType: img.mimeType,
    }
  })) || [];

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [textPart, ...imageParts],
    },
    config: {
      responseModalities: [Modality.IMAGE],
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      const base64ImageBytes: string = part.inlineData.data;
      return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
    }
  }

  throw new Error("No image was generated by the AI. The description might have been too complex.");
};
