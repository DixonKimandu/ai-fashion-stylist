import { NextRequest } from 'next/server';

type InventoryItem = { id: number; src: string; alt: string };

const getGcsUrl = (bucketName: string, filePath: string): string => {
  return `https://storage.googleapis.com/${bucketName}/${filePath}`;
};

const getAltFromFilename = (filename: string): string => {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  return nameWithoutExt
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const getFallbackInventory = async (): Promise<InventoryItem[]> => {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/inventory.example.json`, { cache: 'no-store' });
    const data = await res.json();
    return (data as any[]).map((item: any) => ({
      id: item.id,
      src: `/images/${item.filename}`,
      alt: item.alt || getAltFromFilename(item.filename),
    }));
  } catch {
    return [];
  }
};

export async function GET(_req: NextRequest) {
  const bucketName = process.env.GCS_BUCKET_NAME || 'maker-suite-images';
  const inventoryPath = process.env.GCS_INVENTORY_PATH;

  // If metadata JSON path is provided, fetch that
  if (inventoryPath) {
    try {
      const inventoryUrl = getGcsUrl(bucketName, inventoryPath);
      const response = await fetch(inventoryUrl, { cache: 'no-store' });
      if (!response.ok) {
        const fallback = await getFallbackInventory();
        return new Response(JSON.stringify(fallback), { status: 200 });
      }
      const data = await response.json();
      if (!Array.isArray(data)) {
        const fallback = await getFallbackInventory();
        return new Response(JSON.stringify(fallback), { status: 200 });
      }
      const inventory: InventoryItem[] = data
        .filter((item: any) => item.src || item.filename)
        .map((item: any, index: number) => {
          const src = item.filename ? getGcsUrl(bucketName, item.filename) : item.src;
          const alt = item.alt || item.name || getAltFromFilename(item.filename || src.split('/').pop() || `item-${index + 1}`);
          return { id: item.id || index + 1, src, alt };
        });
      return new Response(JSON.stringify(inventory), { status: 200 });
    } catch {
      const fallback = await getFallbackInventory();
      return new Response(JSON.stringify(fallback), { status: 200 });
    }
  }

  // Otherwise, list files at bucket root using XML API and simple parsing
  try {
    const listUrl = `https://storage.googleapis.com/${bucketName}?prefix=`;
    const response = await fetch(listUrl, { cache: 'no-store' });
    if (!response.ok) {
      const fallback = await getFallbackInventory();
      return new Response(JSON.stringify(fallback), { status: 200 });
    }
    const xmlText = await response.text();
    const keyMatches = Array.from(xmlText.matchAll(/<Key>([^<]+)<\/Key>/g)).map(m => m[1]);
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
    const imageFiles = keyMatches.filter(filename => !filename.includes('/') && imageExtensions.some(ext => filename.toLowerCase().endsWith(ext)));
    if (imageFiles.length === 0) {
      const fallback = await getFallbackInventory();
      return new Response(JSON.stringify(fallback), { status: 200 });
    }
    const inventory: InventoryItem[] = imageFiles.map((filename, index) => ({
      id: index + 1,
      src: getGcsUrl(bucketName, filename),
      alt: getAltFromFilename(filename),
    }));
    return new Response(JSON.stringify(inventory), { status: 200 });
  } catch {
    const fallback = await getFallbackInventory();
    return new Response(JSON.stringify(fallback), { status: 200 });
  }
}

