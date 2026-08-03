const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov'];

/**
 * Определяет видео по расширению файла — тот же принцип, что и на клиенте
 * (client/app/components/ProductPage/ProductGallery.vue), чтобы фото и видео
 * в одних и тех же массивах (photos/extraPhotos) распознавались одинаково
 * везде: бот, паблишеры (TG/WA/Instagram/Facebook), фронтенд.
 */
export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
