
export interface OutfitRecommendation {
  title: string;
  justification: string;
  accessories: string[];
  color_palette: string[];
  image_description: string;
}

export interface InventoryItem {
  id: number;
  src: string;
  alt: string;
}

export interface ToteBagRecommendation {
  title: string;
  description: string;
  material_type: string;
  design_features: string[];
  color_palette: string[];
  image_description: string;
}
