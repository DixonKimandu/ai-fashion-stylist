import type { InventoryItem } from '../types';

export const fetchInventoryFromGCS = async (): Promise<InventoryItem[]> => {
  const res = await fetch('/api/inventory', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Failed to load inventory from Google Cloud Storage');
  }
  return res.json();
};

