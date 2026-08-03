export type ImageVariant = 'card' | 'gallery' | 'thumb';

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov'];

// Определяет видео по расширению файла — photos/extraPhotos товара могут
// содержать как фото, так и видео вперемешку.
export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Строит путь к варианту под конкретное UI-место по пути мастер-файла:
 * "/uploads/products/<id>.webp" → "/uploads/products/<id>-card.webp"
 * "/uploads/products/<id>.mp4"  → "/uploads/products/<id>-card.mp4"
 * Видео обрабатывается сервером так же, как фото (см. server/src/libs/
 * video-variants.ts) — там для каждого загруженного видео тоже генерятся
 * -card/-gallery/-thumb варианты, просто в .mp4 вместо .webp.
 * Всё остальное (без известного варианта-суффикса) возвращает как есть.
 */
export function imgVariant(
  url: string | null | undefined,
  variant: ImageVariant,
): string {
  if (!url) return '';
  if (url.endsWith('.webp')) {
    return `${url.slice(0, -'.webp'.length)}-${variant}.webp`;
  }
  if (isVideoUrl(url)) {
    const ext = url.slice(url.lastIndexOf('.'));
    return `${url.slice(0, -ext.length)}-${variant}${ext}`;
  }
  return url;
}
