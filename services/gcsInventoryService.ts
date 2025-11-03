import type { InventoryItem } from '../types';
import fallbackInventory from '../inventory.example.json';

const GCS_BUCKET_NAME = import.meta.env.VITE_GCS_BUCKET_NAME || 'maker-suite-images';
const GCS_INVENTORY_PATH = import.meta.env.VITE_GCS_INVENTORY_PATH; // Optional: path to inventory.json metadata file

/**
 * Constructs a public GCS URL for a file
 */
const getGcsUrl = (bucketName: string, filePath: string): string => {
  return `https://storage.googleapis.com/${bucketName}/${filePath}`;
};

/**
 * Extracts filename without extension for alt text
 */
const getAltFromFilename = (filename: string): string => {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  // Convert kebab-case or snake_case to Title Case
  return nameWithoutExt
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Lists all objects in a GCS bucket using XML API
 * Note: This requires the bucket to be public
 */
const listBucketObjects = async (bucketName: string, prefix: string = ''): Promise<string[]> => {
  // Use GCS XML API to list bucket contents
  const listUrl = `https://storage.googleapis.com/${bucketName}?prefix=${encodeURIComponent(prefix)}`;
  
  try {
    const response = await fetch(listUrl);
    
    if (!response.ok) {
      throw new Error(
        `Failed to list bucket objects: ${response.status} ${response.statusText}. ` +
        `Please ensure the bucket "${bucketName}" is public.`
      );
    }
    
    const xmlText = await response.text();
    
    // Parse XML response to extract object keys
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    // Check for errors
    const errorNode = xmlDoc.querySelector('Error');
    if (errorNode) {
      const code = errorNode.querySelector('Code')?.textContent || 'Unknown';
      const message = errorNode.querySelector('Message')?.textContent || 'Unknown error';
      throw new Error(`GCS Error: ${code} - ${message}`);
    }
    
    // Extract all Key elements (object names)
    // The XML structure is: <Contents><Key>filename</Key></Contents>
    const contents = xmlDoc.querySelectorAll('Contents');
    const keys: string[] = [];
    contents.forEach(content => {
      const keyElement = content.querySelector('Key');
      if (keyElement && keyElement.textContent) {
        keys.push(keyElement.textContent);
      }
    });
    
    return keys.filter(key => key.length > 0);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to list bucket objects');
  }
};

/**
 * Gets the local public image URL for fallback images
 * In Vite, files in the public folder are served from the root
 */
const getLocalImageUrl = (filename: string): string => {
  return `/images/${filename}`;
};

/**
 * Loads fallback inventory from the example file using local public folder images
 */
const getFallbackInventory = (): InventoryItem[] => {
  return (fallbackInventory as any[]).map((item: any) => ({
    id: item.id,
    src: getLocalImageUrl(item.filename),
    alt: item.alt || getAltFromFilename(item.filename)
  }));
};

/**
 * Fetches inventory items from Google Cloud Storage
 * Supports two modes:
 * 1. If GCS_INVENTORY_PATH is set: fetch from JSON metadata file
 * 2. Otherwise: list all image files from bucket root
 * 
 * Falls back to example inventory if GCS fetch fails or bucket is empty
 */
export const fetchInventoryFromGCS = async (): Promise<InventoryItem[]> => {
  const bucketName = GCS_BUCKET_NAME;
  
  // If inventory path is specified, use metadata file approach
  if (GCS_INVENTORY_PATH) {
    const inventoryUrl = getGcsUrl(bucketName, GCS_INVENTORY_PATH);
    
    try {
      const response = await fetch(inventoryUrl);
      
      if (!response.ok) {
        console.warn(`Failed to fetch inventory from GCS, using fallback: ${response.status} ${response.statusText}`);
        return getFallbackInventory();
      }
      
      const data = await response.json();
      
      // Validate the response structure
      if (!Array.isArray(data)) {
        console.warn('Invalid inventory data format, using fallback');
        return getFallbackInventory();
      }
      
      // Ensure all items have the required properties and construct full GCS URLs
      const inventory: InventoryItem[] = data
        .filter((item: any) => item.src || item.filename) // Filter out invalid items
        .map((item: any, index: number) => {
          // If the item has a relative path (filename), construct the full GCS URL
          // If filename doesn't start with bucket path, assume it's at root
          const src = item.filename 
            ? getGcsUrl(bucketName, item.filename.startsWith(bucketName) ? item.filename : item.filename)
            : item.src;
          
          return {
            id: item.id || index + 1,
            src,
            alt: item.alt || item.name || getAltFromFilename(item.filename || src.split('/').pop() || `item-${index + 1}`)
          };
        });
      
      // Return empty array fallback if no valid items found
      if (inventory.length === 0) {
        console.warn('No valid inventory items found, using fallback');
        return getFallbackInventory();
      }
      
      return inventory;
    } catch (error) {
      console.warn('Error fetching inventory from GCS, using fallback:', error);
      return getFallbackInventory();
    }
  }
  
  // Otherwise, list images directly from bucket root
  try {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
    const allObjects = await listBucketObjects(bucketName, '');
    
    // Filter for image files at root level (no slashes in path)
    const imageFiles = allObjects.filter(filename => {
      const isAtRoot = !filename.includes('/');
      const isImage = imageExtensions.some(ext => 
        filename.toLowerCase().endsWith(ext)
      );
      return isAtRoot && isImage;
    });
    
    // If bucket is empty, use fallback
    if (imageFiles.length === 0) {
      console.warn(`No image files found at the root of bucket "${bucketName}", using fallback`);
      return getFallbackInventory();
    }
    
    // Create inventory items from image files
    const inventory: InventoryItem[] = imageFiles.map((filename, index) => ({
      id: index + 1,
      src: getGcsUrl(bucketName, filename),
      alt: getAltFromFilename(filename)
    }));
    
    return inventory;
  } catch (error) {
    console.warn('Error listing bucket objects, using fallback inventory:', error);
    return getFallbackInventory();
  }
};

