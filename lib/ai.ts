import { GoogleGenAI, Type, Modality } from "@google/genai";

export function getGenAi() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }
  return new GoogleGenAI({ apiKey });
}

export const outfitRecommendationSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    justification: { type: Type.STRING },
    accessories: { type: Type.ARRAY, items: { type: Type.STRING } },
    color_palette: { type: Type.ARRAY, items: { type: Type.STRING } },
    image_description: { type: Type.STRING },
  },
  required: ["title", "justification", "accessories", "color_palette", "image_description"],
};

export const stylingSystemInstruction = "You are a world-class fashion stylist. Your task is to analyze a clothing item provided by the user (the first image) and a collection of inventory items (the subsequent images). Based on the user's context, create a complete, fashionable outfit by pairing the user's item with suitable items from the inventory. Your text response must be strictly in the form of a JSON object that adheres to the provided schema. The `image_description` should vividly describe a person wearing the complete, final outfit for image generation. Be creative and professional.";

export const toteBagRecommendationSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    material_type: { type: Type.STRING },
    design_features: { type: Type.ARRAY, items: { type: Type.STRING } },
    color_palette: { type: Type.ARRAY, items: { type: Type.STRING } },
    image_description: { type: Type.STRING },
  },
  required: ["title", "description", "material_type", "design_features", "color_palette", "image_description"],
};

export const sustainabilitySystemInstruction = "You are a sustainable fashion designer specializing in upcycling old clothing into functional and stylish tote bags. Analyze the uploaded clothing items carefully - examine their fabric type, texture, patterns, colors, and distinctive features. Create a tote bag design that DIRECTLY incorporates and transforms these specific visual elements from the uploaded clothing into the bag design. Detect the material type from what you see in the images. Your design should preserve recognizable elements from the original clothing (patterns, textures, seams, pockets, etc.) while creating a functional tote bag. If an additional material type is specified, incorporate that material into the design alongside the uploaded clothing to create variety and interesting combinations. Your text response must be strictly in the form of a JSON object that adheres to the provided schema. The `image_description` is critical - it must vividly describe a tote bag that visibly incorporates the specific visual characteristics, patterns, textures, and details from the uploaded clothing images.";

export const imageModality = Modality.IMAGE;

