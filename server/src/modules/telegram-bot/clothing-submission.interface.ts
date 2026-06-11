export interface ClothingSubmission {
  gender: string;
  type: string;
  wholesalePrice: string;
  retailPrice: string;
  materials: string[];
  colors: string[];
  sizes: string[];
  photos: string[];
  extraPhotos: string[];
  description?: string;
  additionalDescription?: string;
}
