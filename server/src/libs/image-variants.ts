import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs/promises';

// Целевые размеры под реально замеренные (getBoundingClientRect) десктопные контейнеры
// + запас ~1.35-1.45x под retina, без отдельных 1x/2x-тиров:
//   card    — карточка каталога/избранного, максимум 307×409 (>=1440px)
//   gallery — главное фото на странице товара, максимум 379×505 (>=1101px)
//   thumb   — миниатюры под фото товара (64×85) и фото в корзине (96×120)
export const IMAGE_VARIANTS = {
  card: { width: 420, height: 560 },
  gallery: { width: 522, height: 696 },
  thumb: { width: 140, height: 175 },
} as const;

export type ImageVariant = keyof typeof IMAGE_VARIANTS;

const MASTER_QUALITY = 80;
const VARIANT_QUALITY = 82;

/**
 * Из байт мастер-фото генерирует только обрезанные под конкретные UI-места
 * варианты (без самого мастера): <baseName>-card.webp, -gallery.webp, -thumb.webp
 */
export async function generateResizedVariants(
  buffer: Buffer,
  destDir: string,
  baseName: string,
): Promise<void> {
  await fs.mkdir(destDir, { recursive: true });

  for (const [variant, { width, height }] of Object.entries(IMAGE_VARIANTS)) {
    await sharp(buffer)
      .resize(width, height, { fit: 'cover', position: 'top' })
      .webp({ quality: VARIANT_QUALITY, effort: 6 })
      .toFile(path.join(destDir, `${baseName}-${variant}.webp`));
  }
}

/**
 * Из сырых байт фото генерирует мастер-webp (полное разрешение) и
 * набор обрезанных под конкретные UI-места вариантов рядом с ним:
 * <baseName>.webp, <baseName>-card.webp, <baseName>-gallery.webp, <baseName>-thumb.webp
 */
export async function generateImageVariants(
  buffer: Buffer,
  destDir: string,
  baseName: string,
): Promise<void> {
  await fs.mkdir(destDir, { recursive: true });

  await sharp(buffer)
    .webp({ quality: MASTER_QUALITY })
    .toFile(path.join(destDir, `${baseName}.webp`));

  await generateResizedVariants(buffer, destDir, baseName);
}
