export interface ClothingSubmission {
  type: string;
  price: string;
  materials: string[];
  colors: string[];
  sizes: string[];
  photos: string[];
  extraPhotos: string[];
  description?: string;
}
