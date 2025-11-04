'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Loader2, Zap, Shirt, Sun, UploadCloud, Image as ImageIcon, Download, FileText } from 'lucide-react';
import { getOutfitRecommendation, generateOutfitImage } from '../services/geminiService';
import { fetchInventoryFromGCS } from '../services/gcsInventoryService';
import { downloadImage, downloadOutfitPDF } from '../utils/downloadUtils';
import type { OutfitRecommendation, InventoryItem } from '../types';
import Card from './Card';

const imageUrlToBase64 = async (url: string, timeout = 30000, retries = 2): Promise<{ base64: string, mimeType: string }> => {
  // Retry logic for mobile networks which can be flaky
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Use AbortController for timeout on mobile
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, { 
        signal: controller.signal,
        // Add cache control for mobile browsers
        cache: 'no-cache',
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image from ${url}: ${response.statusText}`);
      }
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve({ base64, mimeType: blob.type });
        };
        reader.onerror = (error) => reject(error);
      });
    } catch (error) {
      // If this is the last attempt, throw the error
      if (attempt === retries) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error(`Request timeout while fetching image from ${url}`);
        }
        throw error;
      }
      // Otherwise, wait a bit before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  throw new Error(`Failed to fetch image from ${url} after ${retries + 1} attempts`);
};

const fileToBase64 = (file: File): Promise<{ base64: string, mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = (error) => reject(error);
  });
};

const Styling: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<OutfitRecommendation | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState<boolean>(true);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  // Fetch inventory from GCS on component mount
  useEffect(() => {
    const loadInventory = async () => {
      setIsLoadingInventory(true);
      try {
        const items = await fetchInventoryFromGCS();
        setInventory(items);
      } catch (err) {
        console.error('Failed to load inventory:', err);
        setError(err instanceof Error ? err.message : 'Failed to load inventory from Google Cloud Storage');
      } finally {
        setIsLoadingInventory(false);
      }
    };

    loadInventory();
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviewUrl(reader.result as string);
        setError(null); // Clear previous errors
      };
      reader.readAsDataURL(file);
    } else {
      setImageFile(null);
      setImagePreviewUrl(null);
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!imageFile || !prompt) {
      setError('Please upload a garment and provide a style context.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setRecommendation(null);
    setGeneratedImageUrl(null);

    try {
      setLoadingMessage('Preparing your garment...');
      const userImageData = await fileToBase64(imageFile);
      
      setLoadingMessage('Fetching inventory items...');
      if (inventory.length === 0) {
        throw new Error('Inventory is not loaded. Please wait and try again.');
      }

      // Process images in batches to avoid overwhelming mobile browsers
      // Mobile browsers typically support 6-8 concurrent connections max
      const BATCH_SIZE = 4; // Process 4 images at a time
      const inventoryImagesData: { base64: string, mimeType: string }[] = [];
      
      for (let i = 0; i < inventory.length; i += BATCH_SIZE) {
        const batch = inventory.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(inventory.length / BATCH_SIZE);
        
        setLoadingMessage(`Fetching inventory items... (${batchNumber}/${totalBatches})`);
        
        try {
          // Process each item in the batch individually to handle failures gracefully
          const batchResults = await Promise.allSettled(
            batch.map(item => imageUrlToBase64(item.src))
          );
          
          // Only add successfully processed images
          batchResults.forEach((result, idx) => {
            if (result.status === 'fulfilled') {
              inventoryImagesData.push(result.value);
            } else {
              console.warn(`Failed to fetch image ${batch[idx].src}:`, result.reason);
            }
          });
        } catch (batchError) {
          console.error(`Error processing batch ${batchNumber}:`, batchError);
          // Continue with next batch instead of failing completely
          // This makes it more resilient on mobile
        }
        
        // Small delay between batches to avoid overwhelming mobile networks
        if (i + BATCH_SIZE < inventory.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      if (inventoryImagesData.length === 0) {
        throw new Error('Failed to fetch any inventory images. Please check your connection and try again.');
      }

      setLoadingMessage('Analyzing garment & styling...');
      const rec = await getOutfitRecommendation(prompt, userImageData, inventoryImagesData);
      setRecommendation(rec);

      setLoadingMessage('Generating the final look...');
      const imageUrl = await generateOutfitImage(rec.image_description);
      setGeneratedImageUrl(imageUrl);

    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [imageFile, prompt, inventory]);

  return (
    <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card className="flex flex-col gap-6">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">1. Upload Your Garment</h2>
          <label htmlFor="file-upload" className="cursor-pointer group">
            <div className="w-full aspect-video border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 group-hover:border-indigo-500 dark:group-hover:border-indigo-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {imagePreviewUrl ? (
                <img src={imagePreviewUrl} alt="Your garment preview" className="w-full h-full object-contain rounded-lg p-2" />
              ) : (
                <>
                  <UploadCloud size={40} className="mb-2"/>
                  <span className="font-semibold">Click to upload an image</span>
                  <span className="text-sm">PNG, JPG, WEBP</span>
                </>
              )}
            </div>
          </label>
          <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} />
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Our Inventory</h2>
          {isLoadingInventory ? (
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 aspect-square flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                </div>
              ))}
            </div>
          ) : inventory.length > 0 ? (
            <div className="grid grid-cols-4 gap-4">
              {inventory.map((item) => (
                <div key={item.id} className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  <img src={item.src} alt={item.alt} className="w-full h-full object-cover aspect-square" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 py-4">
              <p>No inventory items available</p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">2. Style Context</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">E.g., "Style this for a casual summer picnic"</p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the event or vibe..."
            className="w-full p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            rows={3}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={isLoading || !imageFile || !prompt}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" />
              <span>{loadingMessage || 'Styling...'}</span>
            </>
          ) : (
            <>
              <Zap />
              <span>Style It!</span>
            </>
          )}
        </button>
        
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      </Card>

      <Card>
        <div className="flex flex-col h-full">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Your Styled Look</h2>
          {isLoading && (
            <div className="flex-grow flex flex-col items-center justify-center text-center">
              <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
              <p className="text-lg font-medium">{loadingMessage}</p>
              <p className="text-gray-500">The AI is working its magic...</p>
            </div>
          )}
          {!isLoading && !recommendation && (
            <div className="flex-grow flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400">
              <ImageIcon size={48} className="mb-4"/>
              <p>Your outfit recommendation and generated image will appear here.</p>
            </div>
          )}
          {recommendation && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-xl font-bold text-indigo-500 dark:text-indigo-400">{recommendation.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 mt-1">{recommendation.justification}</p>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2"><Shirt size={20}/> Accessories</h4>
                <div className="flex flex-wrap gap-2">
                  {recommendation.accessories.map((item, index) => (
                    <span key={index} className="bg-gray-200 dark:bg-gray-700 text-sm px-3 py-1 rounded-full">{item}</span>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2"><Sun size={20}/> Color Palette</h4>
                <div className="flex flex-wrap gap-2">
                  {recommendation.color_palette.map((color, index) => (
                    <span key={index} className="text-sm px-3 py-1 rounded-full border dark:border-gray-600" style={{ backgroundColor: color, color: '#fff', textShadow: '1px 1px 2px #000' }}>{color}</span>
                  ))}
                </div>
              </div>
              
              <div className="mt-6">
                {generatedImageUrl ? (
                  <>
                    <img src={generatedImageUrl} alt="Generated outfit" className="w-full rounded-lg shadow-md animate-fade-in mb-4" />
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          if (!generatedImageUrl) return;
                          setIsDownloading(true);
                          try {
                            await downloadImage(generatedImageUrl, `outfit-${recommendation.title.toLowerCase().replace(/\s+/g, '-')}`);
                          } catch (err) {
                            setError(err instanceof Error ? err.message : 'Failed to download image');
                          } finally {
                            setIsDownloading(false);
                          }
                        }}
                        disabled={isDownloading}
                        className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 disabled:cursor-not-allowed transition-colors"
                      >
                        {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                        <span>Download Image</span>
                      </button>
                      <button
                        onClick={async () => {
                          if (!generatedImageUrl || !recommendation) return;
                          setIsDownloading(true);
                          try {
                            await downloadOutfitPDF(recommendation, generatedImageUrl, `outfit-${recommendation.title.toLowerCase().replace(/\s+/g, '-')}`);
                          } catch (err) {
                            setError(err instanceof Error ? err.message : 'Failed to generate PDF');
                          } finally {
                            setIsDownloading(false);
                          }
                        }}
                        disabled={isDownloading}
                        className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 disabled:cursor-not-allowed transition-colors"
                      >
                        {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                        <span>Download PDF</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="w-full aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    {isLoading && loadingMessage.includes('Generating') && <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Styling;
