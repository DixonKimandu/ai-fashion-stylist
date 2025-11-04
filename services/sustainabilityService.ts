import type { ToteBagRecommendation } from '../types';

export const getToteBagDesign = async (
  userImages: { base64: string; mimeType: string }[],
  additionalMaterial?: string
): Promise<ToteBagRecommendation> => {
  const res = await fetch('/api/sustainability/design', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userImages, additionalMaterial }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to get tote bag design');
  }
  return res.json();
};

export const generateToteBagImage = async (
  imagePrompt: string,
  userImages?: { base64: string; mimeType: string }[]
): Promise<string> => {
  const res = await fetch('/api/sustainability/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imagePrompt, userImages }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate tote bag image');
  }
  const data = await res.json();
  return data.imageDataUrl as string;
};
