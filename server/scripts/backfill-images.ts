/**
 * Разовый (но идемпотентный) бэкфилл: генерирует -card/-gallery/-thumb варианты
 * для уже загруженных фото товаров из их существующих мастер-webp файлов.
 *
 * Запуск: npm run backfill:images
 */
import * as path from 'path';
import * as fs from 'fs/promises';
import { generateResizedVariants } from '../src/libs/image-variants';

// Тот же способ резолва папки, что и в FileStorageService — process.cwd(),
// а не __dirname, чтобы совпадало и локально, и в докер-контейнере с volume.
const uploadDir = path.join(process.cwd(), 'uploads', 'products');

const VARIANT_SUFFIXES = ['-card.webp', '-gallery.webp', '-thumb.webp'];

function isMasterFile(filename: string): boolean {
  if (!filename.endsWith('.webp')) return false;
  return !VARIANT_SUFFIXES.some((suffix) => filename.endsWith(suffix));
}

async function main() {
  const entries = await fs.readdir(uploadDir);
  const masters = entries.filter(isMasterFile);

  console.log(`Найдено мастер-файлов: ${masters.length} (в ${uploadDir})`);

  let done = 0;
  let failed = 0;

  for (const filename of masters) {
    const baseName = filename.slice(0, -'.webp'.length);
    try {
      const buffer = await fs.readFile(path.join(uploadDir, filename));
      await generateResizedVariants(buffer, uploadDir, baseName);
      done++;
      console.log(`✓ ${filename}`);
    } catch (err) {
      failed++;
      console.error(`✗ ${filename}:`, (err as Error).message);
    }
  }

  console.log(`\nГотово: ${done} обработано, ${failed} с ошибками.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
