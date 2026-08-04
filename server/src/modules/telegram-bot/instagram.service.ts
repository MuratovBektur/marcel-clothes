import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { Product } from '../../entities/product.entity';
import { isVideoUrl } from '../../libs/media';
import { getPublicUrl } from '../../libs/public-url';
import { logPublishError } from '../../libs/publish-error-log';

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const IG_BUSINESS_ACCOUNT_ID = process.env.IG_BUSINESS_ACCOUNT_ID;
const META_API_VERSION = process.env.META_GRAPH_API_VERSION ?? 'v21.0';
const GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// Instagram-карусель поддерживает максимум 10 медиафайлов на пост
const MAX_CAROUSEL_ITEMS = 10;
const CONTAINER_POLL_ATTEMPTS = 15;
const CONTAINER_POLL_DELAY_MS = 2000;
// Видео-контейнеры обрабатываются Instagram заметно дольше, чем фото —
// 90 попыток * 2с = до 3 минут на видео (было 45 попыток/90с, этого
// иногда не хватало даже одному видео, не говоря про карусель из нескольких).
const VIDEO_CONTAINER_POLL_ATTEMPTS = 90;

interface MediaRef {
  url: string;
  isVideo: boolean;
}

export interface InstagramPublishResult {
  mediaId: string;
  permalink: string | null;
}

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);
  // Graph API принимает только JPEG по image_url — храним у себя JPEG-копии
  // наших master-webp фото, отдаём их наружу через тот же /uploads, что и остальные фото.
  private readonly jpegCacheDir = path.join(
    process.cwd(),
    'uploads',
    'products',
    'instagram',
  );

  constructor(private readonly http: HttpService) {
    fs.mkdirSync(this.jpegCacheDir, { recursive: true });
  }

  private get isConfigured(): boolean {
    return !!META_ACCESS_TOKEN && !!IG_BUSINESS_ACCOUNT_ID;
  }

  async publish(product: Product): Promise<InstagramPublishResult | null> {
    if (!this.isConfigured) {
      this.logger.warn(
        'META_ACCESS_TOKEN/IG_BUSINESS_ACCOUNT_ID не заданы — товар не отправлен в Instagram',
      );
      return null;
    }

    try {
      const localPaths = [product.photos[0], ...(product.extraPhotos ?? [])]
        .filter(Boolean)
        .slice(0, MAX_CAROUSEL_ITEMS);

      const mediaItems = await Promise.all(
        localPaths.map((p) => this.toPublicMediaUrl(p)),
      );
      const caption = this.buildCaption(product);

      const containerId =
        mediaItems.length === 1
          ? await this.createSingleContainer(mediaItems[0], caption)
          : await this.createCarouselContainer(mediaItems, caption);

      const hasVideo = mediaItems.some((m) => m.isVideo);
      await this.waitUntilReady(
        containerId,
        hasVideo ? VIDEO_CONTAINER_POLL_ATTEMPTS : CONTAINER_POLL_ATTEMPTS,
      );

      const { data } = await firstValueFrom(
        this.http.post<{ id: string }>(
          `${GRAPH_URL}/${IG_BUSINESS_ACCOUNT_ID}/media_publish`,
          null,
          {
            params: {
              creation_id: containerId,
              access_token: META_ACCESS_TOKEN,
            },
          },
        ),
      );

      const mediaId = data.id;
      const permalink = await this.fetchPermalink(mediaId);
      this.logger.log(`Опубликовано в Instagram: ${mediaId}`);
      return { mediaId, permalink };
    } catch (err) {
      const graphError = (err as any)?.response?.data?.error;
      this.logger.error(
        `Не удалось опубликовать товар ${product.id} в Instagram` +
          (graphError ? `: ${JSON.stringify(graphError)}` : ''),
        err instanceof Error ? err.stack : String(err),
      );
      logPublishError('Instagram', product.id, err);
      throw err;
    }
  }

  private buildCaption(product: Product): string {
    const toTag = (v: string) =>
      '#' +
      v
        .replace(/[^а-яёa-z0-9]/gi, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

    const hashtags = [
      toTag(product.type),
      ...(product.materials ?? []).map(toTag),
      ...(product.colors ?? []).map(toTag),
      ...(product.sizes ?? []).map(toTag),
    ]
      .filter((t) => t.length > 1)
      .join(' ');

    const lines = [
      `Тип: ${product.type}`,
      product.retailPrice ? `Цена: ${product.retailPrice}` : null,
      product.materials?.length
        ? `Материалы: ${product.materials.join(', ')}`
        : null,
      product.colors?.length ? `Цвета: ${product.colors.join(', ')}` : null,
      product.sizes?.length ? `Размеры: ${product.sizes.join(', ')}` : null,
      product.description ?? null,
      '',
      hashtags,
    ].filter((line) => line !== null && line !== undefined);

    // Instagram обрезает подпись на 2200 символах
    return lines.join('\n').slice(0, 2200);
  }

  private async toPublicJpegUrl(localPath: string): Promise<string> {
    const sourcePath = path.join(process.cwd(), localPath.replace(/^\//, ''));
    const jpegName = `${path.basename(localPath, path.extname(localPath))}.jpg`;
    const destPath = path.join(this.jpegCacheDir, jpegName);

    if (!fs.existsSync(destPath)) {
      await sharp(sourcePath)
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 90 })
        .toFile(destPath);
    }

    return `${getPublicUrl()}/uploads/products/instagram/${jpegName}`;
  }

  // Видео отдаём Graph API как есть (уже публично доступный .mp4 под /uploads) —
  // конвертация в JPEG нужна только фото (Graph принимает по URL лишь JPEG/PNG).
  private async toPublicMediaUrl(localPath: string): Promise<MediaRef> {
    if (isVideoUrl(localPath)) {
      return { url: `${getPublicUrl()}${localPath}`, isVideo: true };
    }
    return { url: await this.toPublicJpegUrl(localPath), isVideo: false };
  }

  private async createSingleContainer(
    media: MediaRef,
    caption: string,
  ): Promise<string> {
    const { data } = await firstValueFrom(
      this.http.post<{ id: string }>(
        `${GRAPH_URL}/${IG_BUSINESS_ACCOUNT_ID}/media`,
        null,
        {
          params: media.isVideo
            ? {
                video_url: media.url,
                media_type: 'REELS',
                caption,
                access_token: META_ACCESS_TOKEN,
              }
            : {
                image_url: media.url,
                caption,
                access_token: META_ACCESS_TOKEN,
              },
        },
      ),
    );
    return data.id;
  }

  private async createCarouselContainer(
    mediaItems: MediaRef[],
    caption: string,
  ): Promise<string> {
    // Раньше элементы карусели грузились и ждали готовности по очереди —
    // при 2-3 видео это N раз по (до 90с ожидания), т.к. следующая загрузка
    // даже не начиналась, пока Instagram не доделает предыдущее видео. Теперь
    // грузим все элементы параллельно — Instagram обрабатывает их
    // одновременно на своей стороне, и общее время = время самого медленного
    // видео, а не сумма всех. Promise.all сохраняет порядок mediaItems.
    const children = await Promise.all(
      mediaItems.map(async (media) => {
        const { data } = await firstValueFrom(
          this.http.post<{ id: string }>(
            `${GRAPH_URL}/${IG_BUSINESS_ACCOUNT_ID}/media`,
            null,
            {
              params: media.isVideo
                ? {
                    video_url: media.url,
                    media_type: 'VIDEO',
                    is_carousel_item: true,
                    access_token: META_ACCESS_TOKEN,
                  }
                : {
                    image_url: media.url,
                    is_carousel_item: true,
                    access_token: META_ACCESS_TOKEN,
                  },
            },
          ),
        );
        await this.waitUntilReady(
          data.id,
          media.isVideo
            ? VIDEO_CONTAINER_POLL_ATTEMPTS
            : CONTAINER_POLL_ATTEMPTS,
        );
        return data.id;
      }),
    );

    const { data } = await firstValueFrom(
      this.http.post<{ id: string }>(
        `${GRAPH_URL}/${IG_BUSINESS_ACCOUNT_ID}/media`,
        null,
        {
          params: {
            media_type: 'CAROUSEL',
            children: children.join(','),
            caption,
            access_token: META_ACCESS_TOKEN,
          },
        },
      ),
    );
    return data.id;
  }

  private async waitUntilReady(
    containerId: string,
    attempts: number = CONTAINER_POLL_ATTEMPTS,
  ): Promise<void> {
    for (let attempt = 0; attempt < attempts; attempt++) {
      const { data } = await firstValueFrom(
        this.http.get<{ status_code: string; status?: string }>(`${GRAPH_URL}/${containerId}`, {
          // status_code — машиночитаемый статус (FINISHED/ERROR/...), status — человекочитаемая причина
          params: { fields: 'status_code,status', access_token: META_ACCESS_TOKEN },
        }),
      );

      if (data.status_code === 'FINISHED') return;
      if (data.status_code === 'ERROR' || data.status_code === 'EXPIRED') {
        throw new Error(
          `Instagram-контейнер ${containerId}: статус ${data.status_code}${data.status ? ` — ${data.status}` : ''}`,
        );
      }

      await new Promise((resolve) =>
        setTimeout(resolve, CONTAINER_POLL_DELAY_MS),
      );
    }
    throw new Error(
      `Instagram-контейнер ${containerId} не готов после ${attempts} попыток`,
    );
  }

  private async fetchPermalink(mediaId: string): Promise<string | null> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<{ permalink?: string }>(`${GRAPH_URL}/${mediaId}`, {
          params: { fields: 'permalink', access_token: META_ACCESS_TOKEN },
        }),
      );
      return data.permalink ?? null;
    } catch {
      return null;
    }
  }
}
