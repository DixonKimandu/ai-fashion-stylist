import jsPDF from 'jspdf';
import type { OutfitRecommendation, ToteBagRecommendation } from '../types';

/**
 * Downloads an image from a URL
 */
export const downloadImage = async (imageUrl: string, filename: string = 'design-image'): Promise<void> => {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.includes('.') ? filename : `${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
};

/**
 * Converts an image URL to base64 data URL
 */
const imageUrlToDataUrl = async (imageUrl: string): Promise<string> => {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Generates and downloads a PDF with outfit recommendation details and image
 */
export const downloadOutfitPDF = async (
  recommendation: OutfitRecommendation,
  imageUrl: string,
  filename: string = 'outfit-design'
): Promise<void> => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    let yPosition = margin;

    // Add title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(recommendation.title, margin, yPosition);
    yPosition += 10;

    // Add justification
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const justificationLines = doc.splitTextToSize(recommendation.justification, contentWidth);
    doc.text(justificationLines, margin, yPosition);
    yPosition += justificationLines.length * 6 + 5;

    // Add accessories section
    if (recommendation.accessories.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Accessories:', margin, yPosition);
      yPosition += 7;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      recommendation.accessories.forEach((accessory, index) => {
        doc.text(`• ${accessory}`, margin + 5, yPosition);
        yPosition += 6;
      });
      yPosition += 3;
    }

    // Add color palette section
    if (recommendation.color_palette.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Color Palette:', margin, yPosition);
      yPosition += 7;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const colorText = recommendation.color_palette.join(', ');
      const colorLines = doc.splitTextToSize(colorText, contentWidth);
      doc.text(colorLines, margin, yPosition);
      yPosition += colorLines.length * 6 + 5;
    }

    // Add image
    try {
      const imageDataUrl = await imageUrlToDataUrl(imageUrl);
      
      // Calculate image dimensions to fit within page
      const maxImageWidth = contentWidth;
      const maxImageHeight = pageHeight - yPosition - margin - 10;
      
      // Get image dimensions
      const img = new Image();
      img.src = imageDataUrl;
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const imgWidth = img.width;
      const imgHeight = img.height;
      const imgAspectRatio = imgWidth / imgHeight;

      let displayWidth = maxImageWidth;
      let displayHeight = maxImageWidth / imgAspectRatio;

      if (displayHeight > maxImageHeight) {
        displayHeight = maxImageHeight;
        displayWidth = maxImageHeight * imgAspectRatio;
      }

      // Add image to PDF
      doc.addImage(imageDataUrl, 'PNG', margin, yPosition, displayWidth, displayHeight);
    } catch (imageError) {
      console.error('Error adding image to PDF:', imageError);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('Image could not be loaded', margin, yPosition);
    }

    // Save PDF
    doc.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

/**
 * Generates and downloads a PDF with tote bag recommendation details and image
 */
export const downloadToteBagPDF = async (
  recommendation: ToteBagRecommendation,
  imageUrl: string,
  filename: string = 'tote-bag-design'
): Promise<void> => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    let yPosition = margin;

    // Add title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(recommendation.title, margin, yPosition);
    yPosition += 10;

    // Add description
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const descriptionLines = doc.splitTextToSize(recommendation.description, contentWidth);
    doc.text(descriptionLines, margin, yPosition);
    yPosition += descriptionLines.length * 6 + 5;

    // Add material type
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Material:', margin, yPosition);
    yPosition += 7;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const materialText = recommendation.material_type.charAt(0).toUpperCase() + recommendation.material_type.slice(1);
    doc.text(materialText, margin, yPosition);
    yPosition += 8;

    // Add design features section
    if (recommendation.design_features.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Design Features:', margin, yPosition);
      yPosition += 7;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      recommendation.design_features.forEach((feature) => {
        const featureLines = doc.splitTextToSize(`• ${feature}`, contentWidth - 5);
        doc.text(featureLines, margin + 5, yPosition);
        yPosition += featureLines.length * 6;
      });
      yPosition += 3;
    }

    // Add color palette section
    if (recommendation.color_palette.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Color Palette:', margin, yPosition);
      yPosition += 7;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const colorText = recommendation.color_palette.join(', ');
      const colorLines = doc.splitTextToSize(colorText, contentWidth);
      doc.text(colorLines, margin, yPosition);
      yPosition += colorLines.length * 6 + 5;
    }

    // Add image
    try {
      const imageDataUrl = await imageUrlToDataUrl(imageUrl);
      
      // Calculate image dimensions to fit within page
      const maxImageWidth = contentWidth;
      const maxImageHeight = pageHeight - yPosition - margin - 10;
      
      // Get image dimensions
      const img = new Image();
      img.src = imageDataUrl;
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const imgWidth = img.width;
      const imgHeight = img.height;
      const imgAspectRatio = imgWidth / imgHeight;

      let displayWidth = maxImageWidth;
      let displayHeight = maxImageWidth / imgAspectRatio;

      if (displayHeight > maxImageHeight) {
        displayHeight = maxImageHeight;
        displayWidth = maxImageHeight * imgAspectRatio;
      }

      // Add image to PDF
      doc.addImage(imageDataUrl, 'PNG', margin, yPosition, displayWidth, displayHeight);
    } catch (imageError) {
      console.error('Error adding image to PDF:', imageError);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('Image could not be loaded', margin, yPosition);
    }

    // Save PDF
    doc.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

