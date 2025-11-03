import React, { useState, useCallback } from 'react';
import { Loader2, Image as ImageIcon, UploadCloud, Recycle, Download, FileText } from 'lucide-react';
import { getToteBagDesign, generateToteBagImage } from '../services/sustainabilityService';
import { downloadImage, downloadToteBagPDF } from '../utils/downloadUtils';
import type { ToteBagRecommendation } from '../types';
import Card from './Card';

const imageUrlToBase64 = async (url: string): Promise<{ base64: string, mimeType: string }> => {
  const response = await fetch(url);
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

const Sustainability: React.FC = () => {
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [additionalMaterial, setAdditionalMaterial] = useState<string>('plain');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<ToteBagRecommendation | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const materialOptions = [
    { value: 'plain', label: 'Plain (Uploaded Clothing Only)' },
    { value: 'denim', label: 'Denim' },
    { value: 'khaki', label: 'Khaki' },
    { value: 'corduroy', label: 'Corduroy' }
  ];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      setImageFiles(fileArray);
      setError(null);
      
      const readers = fileArray.map((file: File) => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      Promise.all(readers).then(urls => {
        setImagePreviewUrls(urls);
      }).catch(err => {
        console.error('Error reading files:', err);
        setError('Failed to read image files');
      });
    } else {
      setImageFiles([]);
      setImagePreviewUrls([]);
    }
  };

  const handleSubmit = useCallback(async () => {
    if (imageFiles.length === 0) {
      setError('Please upload at least one old clothing item.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setRecommendation(null);
    setGeneratedImageUrl(null);

    try {
      setLoadingMessage('Processing your old clothing...');
      const userImagesData = await Promise.all(
        imageFiles.map(file => fileToBase64(file))
      );

      setLoadingMessage('Analyzing clothing material and designing your tote bag...');
      const rec = await getToteBagDesign(userImagesData, additionalMaterial === 'plain' ? undefined : additionalMaterial);
      setRecommendation(rec);

      setLoadingMessage('Generating the tote bag design...');
      const imageUrl = await generateToteBagImage(rec.image_description, userImagesData);
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
  }, [imageFiles, additionalMaterial]);

  return (
    <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card className="flex flex-col gap-6">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Recycle className="text-green-500" size={24} />
            Upload Old Clothing
          </h2>
          <label htmlFor="sustainability-file-upload" className="cursor-pointer group">
            <div className="w-full aspect-video border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 group-hover:border-green-500 dark:group-hover:border-green-400 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
              {imagePreviewUrls.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 w-full h-full p-2">
                  {imagePreviewUrls.map((url, index) => (
                    <img key={index} src={url} alt={`Old clothing ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                  ))}
                </div>
              ) : (
                <>
                  <UploadCloud size={40} className="mb-2"/>
                  <span className="font-semibold">Click to upload old clothing items</span>
                  <span className="text-sm">PNG, JPG, WEBP (multiple files supported)</span>
                </>
              )}
            </div>
          </label>
          <input 
            id="sustainability-file-upload" 
            name="sustainability-file-upload" 
            type="file" 
            className="sr-only" 
            accept="image/png, image/jpeg, image/webp" 
            multiple
            onChange={handleFileChange} 
          />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Additional Material (Optional)</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {additionalMaterial === 'plain' 
              ? 'Default: Using only your uploaded clothing for a plain design'
              : `Incorporate ${materialOptions.find(m => m.value === additionalMaterial)?.label} material alongside your uploaded clothing for design variety`}
          </p>
          <select
            value={additionalMaterial}
            onChange={(e) => setAdditionalMaterial(e.target.value)}
            className="w-full p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
          >
            {materialOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {recommendation && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg mt-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">Detected Material from Upload:</p>
              <p className="text-lg font-semibold text-green-700 dark:text-green-400">
                {recommendation.material_type.charAt(0).toUpperCase() + recommendation.material_type.slice(1)}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={isLoading || imageFiles.length === 0}
          className="w-full flex items-center justify-center gap-2 bg-green-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-green-400 dark:disabled:bg-green-800 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" />
              <span>{loadingMessage || 'Designing...'}</span>
            </>
          ) : (
            <>
              <Recycle />
              <span>Create Tote Bag</span>
            </>
          )}
        </button>
        
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      </Card>

      <Card>
        <div className="flex flex-col h-full">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Your Tote Bag Design</h2>
          {isLoading && (
            <div className="flex-grow flex flex-col items-center justify-center text-center">
              <Loader2 className="w-12 h-12 text-green-500 animate-spin mb-4" />
              <p className="text-lg font-medium">{loadingMessage}</p>
              <p className="text-gray-500">Creating your sustainable design...</p>
            </div>
          )}
          {!isLoading && !recommendation && (
            <div className="flex-grow flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400">
              <ImageIcon size={48} className="mb-4"/>
              <p>Your tote bag design will appear here.</p>
            </div>
          )}
          {recommendation && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-xl font-bold text-green-500 dark:text-green-400">{recommendation.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 mt-1">{recommendation.description}</p>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">Material: {recommendation.material_type.charAt(0).toUpperCase() + recommendation.material_type.slice(1)}</h4>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Design Features</h4>
                <div className="flex flex-wrap gap-2">
                  {recommendation.design_features.map((feature, index) => (
                    <span key={index} className="bg-gray-200 dark:bg-gray-700 text-sm px-3 py-1 rounded-full">{feature}</span>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Color Palette</h4>
                <div className="flex flex-wrap gap-2">
                  {recommendation.color_palette.map((color, index) => (
                    <span key={index} className="text-sm px-3 py-1 rounded-full border dark:border-gray-600" style={{ backgroundColor: color, color: '#fff', textShadow: '1px 1px 2px #000' }}>{color}</span>
                  ))}
                </div>
              </div>
              
              <div className="mt-6">
                {generatedImageUrl ? (
                  <>
                    <img src={generatedImageUrl} alt="Generated tote bag" className="w-full rounded-lg shadow-md animate-fade-in mb-4" />
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          if (!generatedImageUrl) return;
                          setIsDownloading(true);
                          try {
                            await downloadImage(generatedImageUrl, `tote-bag-${recommendation.title.toLowerCase().replace(/\s+/g, '-')}`);
                          } catch (err) {
                            setError(err instanceof Error ? err.message : 'Failed to download image');
                          } finally {
                            setIsDownloading(false);
                          }
                        }}
                        disabled={isDownloading}
                        className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-green-400 dark:disabled:bg-green-800 disabled:cursor-not-allowed transition-colors"
                      >
                        {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                        <span>Download Image</span>
                      </button>
                      <button
                        onClick={async () => {
                          if (!generatedImageUrl || !recommendation) return;
                          setIsDownloading(true);
                          try {
                            await downloadToteBagPDF(recommendation, generatedImageUrl, `tote-bag-${recommendation.title.toLowerCase().replace(/\s+/g, '-')}`);
                          } catch (err) {
                            setError(err instanceof Error ? err.message : 'Failed to generate PDF');
                          } finally {
                            setIsDownloading(false);
                          }
                        }}
                        disabled={isDownloading}
                        className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-green-400 dark:disabled:bg-green-800 disabled:cursor-not-allowed transition-colors"
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

export default Sustainability;
