import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { Product } from '../../entities/product.entity';
import { isVideoUrl } from '../../libs/media';
import { getPublicUrl } from '../../libs/public-url';

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const FB_PAGE_ID = process.env.FB_PAGE_ID;
const META_API_VERSION = process.env.META_GRAPH_API_VERSION ?? 'v21.0';
const GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

const MAX_PHOTOS_PER_POST = 10;

interface MediaRef {
  url: string;
  isVideo: boolean;
}

export interface FacebookPublishResult {
  postId: string;
  permalink: string;
}

@Injectable()
export class FacebookService {
  private readonly logger = new Logger(FacebookService.name);
  // Graph API принимает по url только JPEG/PNG — конвертируем master-webp фото в JPEG
  // и отдаём их наружу через тот же /uploads, что и остальные фото.
  private readonly jpegCacheDir = path.join(
    process.cwd(),
    'uploads',
    'products',
    'facebook',
  );
  // Токен системного пользователя не даёт постить напрямую — нужен Page Access Token,
  // получаем его один раз и переиспользуем (он не истекает, пока не истекает сам системный токен).
  private pageAccessTokenPromise: Promise<string> | null = null;

  constructor(private readonly http: HttpService) {
    fs.mkdirSync(this.jpegCacheDir, { recursive: true });
  }

  private get isConfigured(): boolean {
    return !!META_ACCESS_TOKEN && !!FB_PAGE_ID;
  }

  async publish(product: Product): Promise<FacebookPublishResult | null> {
    if (!this.isConfigured) {
      this.logger.warn(
        'META_ACCESS_TOKEN/FB_PAGE_ID не заданы — товар не отправлен на Facebook',
      );
      return null;
    }

    try {
      const pageToken = await this.getPageAccessToken();

      const localPaths = [product.photos[0], ...(product.extraPhotos ?? [])]
        .filter(Boolean)
        .slice(0, MAX_PHOTOS_PER_POST);

      const mediaItems = await Promise.all(
        localPaths.map((p) => this.toPublicMediaUrl(p)),
      );
      const caption = this.buildCaption(product);

      // ВНИМАНИЕ: attached_media (этот путь для 2+ медиа) сейчас падает с
      // "(#10) Application does not have permission for this action" —
      // pages_manage_posts у приложения в статусе Standard Access, без
      // App Review. Публикация товаров с одним фото/видео работает.
      // Временное решение (публикация отдельными постами на каждый файл)
      // обсуждали и отклонили — оставлено как есть до решения по правам.
      const postId =
        mediaItems.length === 1
          ? await this.publishSingleMedia(mediaItems[0], caption, pageToken)
          : await this.publishMultiMedia(mediaItems, caption, pageToken);

      this.logger.log(`Опубликовано на Facebook: ${postId}`);
      return { postId, permalink: `https://www.facebook.com/${postId}` };
    } catch (err) {
      const graphError = (err as any)?.response?.data?.error;
      this.logger.error(
        `Не удалось опубликовать товар ${product.id} на Facebook` +
          (graphError ? `: ${JSON.stringify(graphError)}` : ''),
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }
  }

  private async getPageAccessToken(): Promise<string> {
    if (!this.pageAccessTokenPromise) {
      this.pageAccessTokenPromise = firstValueFrom(
        this.http.get<{ access_token: string }>(`${GRAPH_URL}/${FB_PAGE_ID}`, {
          params: { fields: 'access_token', access_token: META_ACCESS_TOKEN },
        }),
      )
        .then((res) => res.data.access_token)
        .catch((err) => {
          // Не запоминаем неудачную попытку — следующий publish() попробует снова
          this.pageAccessTokenPromise = null;
          throw err;
        });
    }
    return this.pageAccessTokenPromise;
  }

  private buildCaption(product: Product): string {
    const lines = [
      `Тип: ${product.type}`,
      product.retailPrice ? `Цена: ${product.retailPrice}` : null,
      product.materials?.length
        ? `Материалы: ${product.materials.join(', ')}`
        : null,
      product.colors?.length ? `Цвета: ${product.colors.join(', ')}` : null,
      product.sizes?.length ? `Размеры: ${product.sizes.join(', ')}` : null,
      product.description ?? null,
    ].filter((line) => line !== null && line !== undefined);

    return lines.join('\n');
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

    return `${getPublicUrl()}/uploads/products/facebook/${jpegName}`;
  }

  // Видео отдаём Graph API как есть (уже публично доступный .mp4 под /uploads) —
  // конвертация в JPEG нужна только фото (Graph принимает по URL лишь JPEG/PNG).
  private async toPublicMediaUrl(localPath: string): Promise<MediaRef> {
    if (isVideoUrl(localPath)) {
      return { url: `${getPublicUrl()}${localPath}`, isVideo: true };
    }
    return { url: await this.toPublicJpegUrl(localPath), isVideo: false };
  }

  private async publishSingleMedia(
    media: MediaRef,
    caption: string,
    pageToken: string,
  ): Promise<string> {
    if (media.isVideo) {
      const { data } = await firstValueFrom(
        this.http.post<{ id: string }>(
          `${GRAPH_URL}/${FB_PAGE_ID}/videos`,
          null,
          { params: { file_url: media.url, description: caption, access_token: pageToken } },
        ),
      );
      return data.id;
    }

    const { data } = await firstValueFrom(
      this.http.post<{ id: string; post_id?: string }>(
        `${GRAPH_URL}/${FB_PAGE_ID}/photos`,
        null,
        { params: { url: media.url, caption, access_token: pageToken } },
      ),
    );
    return data.post_id ?? data.id;
  }

  private async publishMultiMedia(
    mediaItems: MediaRef[],
    caption: string,
    pageToken: string,
  ): Promise<string> {
    const mediaIds: string[] = [];
    for (const media of mediaItems) {
      if (media.isVideo) {
        const { data } = await firstValueFrom(
          this.http.post<{ id: string }>(
            `${GRAPH_URL}/${FB_PAGE_ID}/videos`,
            null,
            {
              params: {
                file_url: media.url,
                published: false,
                access_token: pageToken,
              },
            },
          ),
        );
        mediaIds.push(data.id);
        continue;
      }

      const { data } = await firstValueFrom(
        this.http.post<{ id: string }>(
          `${GRAPH_URL}/${FB_PAGE_ID}/photos`,
          null,
          {
            params: {
              url: media.url,
              published: false,
              access_token: pageToken,
            },
          },
        ),
      );
      mediaIds.push(data.id);
    }

    const { data } = await firstValueFrom(
      this.http.post<{ id: string }>(`${GRAPH_URL}/${FB_PAGE_ID}/feed`, null, {
        params: {
          message: caption,
          attached_media: JSON.stringify(
            mediaIds.map((id) => ({ media_fbid: id })),
          ),
          access_token: pageToken,
        },
      }),
    );
    return data.id;
  }
}
