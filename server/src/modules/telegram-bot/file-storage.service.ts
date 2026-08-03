import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { firstValueFrom } from 'rxjs';
import { generateImageVariants } from '../../libs/image-variants';
import { generateVideoVariants } from '../../libs/video-variants';

export type MediaKind = 'photo' | 'video';

export interface TgMediaRef {
  fileId: string;
  kind: MediaKind;
}

export interface SavedMedia {
  kind: MediaKind;
  /**
   * Готовый URL. Для фото — всегда сразу (sharp быстрый, обрабатывается
   * синхронно). Для видео — null, пока фоновая перекодировка не закончится
   * (см. `ready`): сознательно НЕ показываем на сайте необработанное видео —
   * товар/поле остаётся как было (или пустым при создании), пока не готово.
   */
  url: string | null;
  /**
   * Только для видео: резолвится финальным URL, когда фоновая перекодировка
   * под card/gallery/thumb закончится. Не await'ить сразу в основном потоке —
   * использовать уже после ответа админу, чтобы ТОГДА обновить
   * photos/extraPhotos и уведомить о готовности. Если процесс перезапустится
   * до завершения — джоба ничего не персистит, видео так и не появится на
   * сайте (придётся переслать заново).
   */
  ready?: Promise<string>;
}

const FALLBACK_VIDEO_EXT = '.mp4';

// Ограничение самого приложения (независимо от того, куда ходим за файлом —
// облачный Bot API или свой telegram-bot-api): режем ещё до скачивания,
// чтобы не тянуть впустую сотни мегабайт. Экспортируется — wizard/edit-scene
// используют его же для мгновенной проверки по msg.video.file_size (это поле
// Telegram уже присылает в самом сообщении, без отдельного запроса), чтобы
// отказать ДО скачивания, а не только внутри saveFromFileId.
export const MAX_MEDIA_SIZE_BYTES = 150 * 1024 * 1024;

/** null — размер ок (или неизвестен); иначе — готовый текст ошибки для ответа пользователю. */
export function checkMediaSize(fileSize: number | undefined | null): string | null {
  if (!fileSize || fileSize <= MAX_MEDIA_SIZE_BYTES) return null;
  const sizeMb = (fileSize / (1024 * 1024)).toFixed(1);
  const limitMb = MAX_MEDIA_SIZE_BYTES / (1024 * 1024);
  return `Файл слишком большой (${sizeMb} МБ) — максимум ${limitMb} МБ.`;
}

// Облачный api.telegram.org умеет отдавать через getFile файлы не больше 20 МБ —
// жёсткое ограничение самого Telegram. Обходится только своим сервером
// telegram-bot-api (см. TELEGRAM_BOT_API_ROOT ниже, до 2000 МБ), но даже
// тогда действует свой лимит MAX_MEDIA_SIZE_BYTES выше.
export class MediaDownloadError extends Error {
  constructor(message: string, readonly tooLarge: boolean = false) {
    super(message);
    this.name = 'MediaDownloadError';
  }
}

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly uploadDir = path.join(
    process.cwd(),
    'uploads',
    'products',
  );
  private readonly token = process.env.TELEGRAM_BOT_TOKEN!;
  // По умолчанию — облачный Bot API (лимит скачивания 20 МБ). Чтобы поднять
  // лимит до 2000 МБ, поднимите свой сервер telegram-bot-api и укажите его
  // адрес здесь, например http://telegram-bot-api:8081 — см. .env.example.
  private readonly apiRoot = (process.env.TELEGRAM_BOT_API_ROOT || 'https://api.telegram.org').replace(/\/+$/, '');

  constructor(private readonly http: HttpService) {
    fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  async saveFromFileId(fileId: string, kind: MediaKind = 'photo'): Promise<SavedMedia> {
    // Get file path from Telegram
    const infoUrl = `${this.apiRoot}/bot${this.token}/getFile?file_id=${encodeURIComponent(fileId)}`;
    let info: any;
    try {
      ({ data: info } = await firstValueFrom(this.http.get(infoUrl)));
    } catch (err) {
      throw this.toMediaError(err, fileId);
    }

    const sizeError = checkMediaSize(info.result.file_size);
    if (sizeError) {
      this.logger.warn(`Rejected file ${fileId}: ${sizeError}`);
      throw new MediaDownloadError(sizeError, true);
    }

    const filePath: string = info.result.file_path;

    // В режиме --local telegram-bot-api не отдаёт файл по HTTP (эндпоинт
    // /file/bot.../<path> возвращает 404) — file_path уже абсолютный путь на
    // диске, читаем его напрямую (том tg_bot_api_data_local общий с этим
    // контейнером, см. docker-compose.local.yml). Если файл недоступен на
    // диске (нет общего тома / облачный API) — падаем обратно на HTTP.
    let buffer: Buffer;
    try {
      buffer = await fs.promises.readFile(filePath);
    } catch {
      const downloadUrl = `${this.apiRoot}/file/bot${this.token}/${filePath}`;
      let arrayBuffer: ArrayBuffer;
      try {
        ({ data: arrayBuffer } = await firstValueFrom(
          this.http.get<ArrayBuffer>(downloadUrl, { responseType: 'arraybuffer' }),
        ));
      } catch (err) {
        throw this.toMediaError(err, fileId);
      }
      buffer = Buffer.from(arrayBuffer);
    }

    const baseName = crypto.randomUUID();

    if (kind === 'video') {
      // Архивная копия исходных байт без обработки (как -raw для фото) —
      // заодно служит входом для фоновой перекодировки.
      const rawExt = path.extname(filePath) || FALLBACK_VIDEO_EXT;
      const rawPath = path.join(this.uploadDir, `${baseName}-raw${rawExt}`);
      await fs.promises.writeFile(rawPath, buffer);

      // Ничего не показываем на сайте, пока не готово — просто запускаем
      // перекодировку под card/gallery/thumb в фоне (не await!) и отдаём
      // промис, который резолвится финальным URL. Вызывающий код решает, что
      // делать ДО готовности (для нового товара — оставить поле пустым; при
      // редактировании — оставить прежнее фото/видео) и подставляет
      // настоящий URL, когда промис резолвится.
      const baseUrl = `/uploads/products/${baseName}.mp4`;
      const ready = this.refineVideoInBackground(baseName, rawPath).then(() => baseUrl);
      // Промис уже возвращается вызывающему коду для собственной обработки
      // ошибок — глушим здесь только "unhandled rejection", если тот решит
      // не использовать `ready` в конкретной ветке.
      ready.catch(() => {});

      this.logger.log(`Video ${fileId} accepted, processing in background as ${baseName}`);
      return { kind: 'video', url: null, ready };
    }

    const rawExt = path.extname(filePath) || '.jpg';

    // Архивная копия исходных байт без обработки
    await fs.promises.writeFile(
      path.join(this.uploadDir, `${baseName}-raw${rawExt}`),
      buffer,
    );

    // Мастер (полное разрешение) + card/gallery/thumb варианты под конкретные UI-места
    await generateImageVariants(buffer, this.uploadDir, baseName);

    const filename = `${baseName}.webp`;
    this.logger.log(`Saved ${filename}`);
    return { kind: 'photo', url: `/uploads/products/${filename}` };
  }

  async saveMany(items: TgMediaRef[]): Promise<SavedMedia[]> {
    const results: SavedMedia[] = [];
    for (const item of items) {
      const media = await this.saveFromFileId(item.fileId, item.kind);
      results.push(media);
    }
    return results;
  }

  // Перекодировка под card/gallery/thumb (нужные битрейт/разрешение на слот) в
  // фоне. Пишет сразу под финальными именами — до резолва `ready` в
  // saveFromFileId ничто на них не ссылается (сайту URL ещё не отдан), так
  // что подменять во временные имена и переименовывать не нужно.
  private async refineVideoInBackground(baseName: string, rawPath: string): Promise<void> {
    try {
      await generateVideoVariants(rawPath, this.uploadDir, baseName);
      this.logger.log(`Refined video ${baseName} in background`);
    } catch (err) {
      this.logger.error(
        `Не удалось дообработать видео ${baseName} в фоне: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }

  private toMediaError(err: unknown, fileId: string): MediaDownloadError {
    const description: string | undefined = (err as any)?.response?.data?.description;
    const tooLarge = !!description?.toLowerCase().includes('too big');
    this.logger.error(
      `Failed to fetch file ${fileId} from Telegram: ${description ?? (err instanceof Error ? err.message : String(err))}`,
    );
    const cloudLimitHint = this.apiRoot === 'https://api.telegram.org'
      ? ' Облачный Telegram Bot API может скачивать файлы не более 20 МБ.'
      : '';
    return new MediaDownloadError(
      tooLarge
        ? `Файл слишком большой.${cloudLimitHint}`
        : 'Не удалось получить файл из Telegram.',
      tooLarge,
    );
  }
}
