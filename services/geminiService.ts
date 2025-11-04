import type { OutfitRecommendation } from '../types';

export const getOutfitRecommendation = async (
  prompt: string,
  userImage: { base64: string; mimeType: string },
  inventoryImages: { base64: string; mimeType: string }[]
): Promise<OutfitRecommendation> => {
  try {
    const body = JSON.stringify({ prompt, userImage, inventoryImages });
    const bodySizeMB = new Blob([body]).size / (1024 * 1024);
    
    if (bodySizeMB > 50) {
      throw new Error(`Request body is too large (${bodySizeMB.toFixed(2)}MB). Please reduce the number of inventory images.`);
    }

    const res = await fetch('/api/styling/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to get outfit recommendation (${res.status} ${res.statusText})`);
    }
    return res.json();
  } catch (err) {
    if (err instanceof Error) {
      // Re-throw with more context if it's already an Error
      if (err.message.includes('fetch failed') || err.message.includes('network')) {
        throw new Error(`Network error: Unable to reach the server. Please check your connection and ensure the server is running. Original error: ${err.message}`);
      }
      throw err;
    }
    throw new Error('Failed to get outfit recommendation: Unknown error');
  }
};

export const generateOutfitImage = async (imagePrompt: string): Promise<string> => {
  const res = await fetch('/api/styling/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imagePrompt }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate outfit image');
  }
  const data = await res.json();
  return data.imageDataUrl as string;
};
