export interface ClothingSubmission {
  category: string;
  type: string;
  brand: string;
  gender: string;
  country: string;
  price: string;
  materials: string[];
  colors: string[];
  sizes: string[];
  photos: string[]; // Telegram file_id (main photo — 1 шт.)
  extraPhotos: string[]; // Telegram file_id (доп. фото)
  description?: string;
}
