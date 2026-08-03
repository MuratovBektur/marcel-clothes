export interface ClothingSubmission {
  gender: string[];
  type: string;
  wholesalePrice: string;
  retailPrice: string;
  materials: string[];
  colors: string[];
  sizes: string[];
  description?: string;
  additionalDescription?: string;
}
