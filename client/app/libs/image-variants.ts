export type ImageVariant = 'card' | 'gallery' | 'thumb';

/**
 * Строит путь к обрезанному под конкретное UI-место варианту фото по пути мастер-файла:
 * "/uploads/products/<id>.webp" → "/uploads/products/<id>-card.webp"
 * Видео и не-webp файлы возвращает как есть — вариантов для них нет.
 */
export function imgVariant(
  url: string | null | undefined,
  variant: ImageVariant,
): string {
  if (!url) return '';
  if (!url.endsWith('.webp')) return url;
  return `${url.slice(0, -'.webp'.length)}-${variant}.webp`;
}
