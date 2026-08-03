import { execFile } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';

const execFileAsync = promisify(execFile);

// Аналог IMAGE_VARIANTS (image-variants.ts), но для видео. Не обрезаем под
// точный кадр как фото (fit: cover) — этим на фронте уже занимается CSS
// object-fit: cover на <video>, здесь только ограничиваем разрешение и битрейт
// под конкретное UI-место. Цифры чуть выше, чем у фото в тех же местах —
// видео при таком же размере в пикселях сильнее «блочится» при сжатии.
export const VIDEO_VARIANTS = {
  card: { maxSide: 640, crf: 28, maxBitrateKbps: 1200 },
  gallery: { maxSide: 960, crf: 26, maxBitrateKbps: 2000 },
  thumb: { maxSide: 320, crf: 30, maxBitrateKbps: 400 },
} as const;

export type VideoVariant = keyof typeof VIDEO_VARIANTS;

const MASTER_SPEC = { maxSide: 1280, crf: 24, maxBitrateKbps: 3500 };

export interface TranscodeSpec {
  maxSide: number;
  crf: number;
  maxBitrateKbps: number;
  preset?: string;
}

export async function transcodeVideo(
  inputPath: string,
  outputPath: string,
  { maxSide, crf, maxBitrateKbps, preset = 'veryfast' }: TranscodeSpec,
): Promise<void> {
  const bufsizeKbps = maxBitrateKbps * 2;
  // scale: не увеличиваем меньшие видео (force_original_aspect_ratio=decrease
  // + min(iw/ih, maxSide)); второй scale — округление до чётных пикселей,
  // без этого libx264 падает на нечётной ширине/высоте. execFile не идёт через
  // shell, поэтому кавычки тут не нужны и даже ломают парсер ffmpeg — а вот
  // запятую внутри min(...) сам ffmpeg требует экранировать (\,), иначе
  // принимает её за разделитель фильтров в цепочке.
  const scaleFilter =
    `scale=min(${maxSide}\\,iw):min(${maxSide}\\,ih):force_original_aspect_ratio=decrease,` +
    `scale=trunc(iw/2)*2:trunc(ih/2)*2`;

  await execFileAsync('ffmpeg', [
    '-y',
    '-i', inputPath,
    '-vf', scaleFilter,
    '-c:v', 'libx264',
    '-preset', preset,
    '-crf', String(crf),
    '-maxrate', `${maxBitrateKbps}k`,
    '-bufsize', `${bufsizeKbps}k`,
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    // Звук нигде в UI не используется — <video> в каталоге/галерее/корзине
    // всегда autoplay+muted+loop, поэтому просто не тащим аудиодорожку.
    '-an',
    outputPath,
  ]);
}

/**
 * Из сырого видео-файла генерирует мастер (сжатый, но с приличным качеством)
 * и обрезанные под конкретные UI-места варианты — аналог generateImageVariants
 * из image-variants.ts, только видео, всегда на выходе .mp4 (H.264), даже
 * если источник был .mov/.webm — заодно нормализует формат под все браузеры.
 */
export async function generateVideoVariants(
  inputPath: string,
  destDir: string,
  baseName: string,
): Promise<void> {
  await fs.mkdir(destDir, { recursive: true });

  await transcodeVideo(inputPath, path.join(destDir, `${baseName}.mp4`), MASTER_SPEC);

  for (const [variant, spec] of Object.entries(VIDEO_VARIANTS)) {
    await transcodeVideo(inputPath, path.join(destDir, `${baseName}-${variant}.mp4`), spec);
  }
}
