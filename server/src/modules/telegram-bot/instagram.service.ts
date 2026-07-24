import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { Product } from '../../entities/product.entity';

const IG_ACCESS_TOKEN = process.env.IG_ACCESS_TOKEN;
const IG_BUSINESS_ACCOUNT_ID = process.env.IG_BUSINESS_ACCOUNT_ID;
const IG_API_VERSION = process.env.IG_GRAPH_API_VERSION ?? 'v21.0';
const PUBLIC_URL = process.env.PUBLIC_URL ?? 'https://marcel.kg';
const GRAPH_URL = `https://graph.facebook.com/${IG_API_VERSION}`;

// Instagram-карусель поддерживает максимум 10 медиафайлов на пост
const MAX_CAROUSEL_ITEMS = 10;
const CONTAINER_POLL_ATTEMPTS = 15;
const CONTAINER_POLL_DELAY_MS = 2000;

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
    return !!IG_ACCESS_TOKEN && !!IG_BUSINESS_ACCOUNT_ID;
  }

  async publish(product: Product): Promise<InstagramPublishResult | null> {
    if (!this.isConfigured) {
      this.logger.warn(
        'IG_ACCESS_TOKEN/IG_BUSINESS_ACCOUNT_ID не заданы — товар не отправлен в Instagram',
      );
      return null;
    }

    try {
      const localPaths = [product.photos[0], ...(product.extraPhotos ?? [])]
        .filter(Boolean)
        .slice(0, MAX_CAROUSEL_ITEMS);

      const imageUrls = await Promise.all(
        localPaths.map((p) => this.toPublicJpegUrl(p)),
      );
      const caption = this.buildCaption(product);

      const containerId =
        imageUrls.length === 1
          ? await this.createSingleContainer(imageUrls[0], caption)
          : await this.createCarouselContainer(imageUrls, caption);

      await this.waitUntilReady(containerId);

      const { data } = await firstValueFrom(
        this.http.post<{ id: string }>(
          `${GRAPH_URL}/${IG_BUSINESS_ACCOUNT_ID}/media_publish`,
          null,
          {
            params: { creation_id: containerId, access_token: IG_ACCESS_TOKEN },
          },
        ),
      );

      const mediaId = data.id;
      const permalink = await this.fetchPermalink(mediaId);
      this.logger.log(`Опубликовано в Instagram: ${mediaId}`);
      return { mediaId, permalink };
    } catch (err) {
      this.logger.error(
        `Не удалось опубликовать товар ${product.id} в Instagram`,
        err instanceof Error ? err.stack : String(err),
      );
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

    return `${PUBLIC_URL}/uploads/products/instagram/${jpegName}`;
  }

  private async createSingleContainer(
    imageUrl: string,
    caption: string,
  ): Promise<string> {
    const { data } = await firstValueFrom(
      this.http.post<{ id: string }>(
        `${GRAPH_URL}/${IG_BUSINESS_ACCOUNT_ID}/media`,
        null,
        {
          params: {
            image_url: imageUrl,
            caption,
            access_token: IG_ACCESS_TOKEN,
          },
        },
      ),
    );
    return data.id;
  }

  private async createCarouselContainer(
    imageUrls: string[],
    caption: string,
  ): Promise<string> {
    const children: string[] = [];
    for (const imageUrl of imageUrls) {
      const { data } = await firstValueFrom(
        this.http.post<{ id: string }>(
          `${GRAPH_URL}/${IG_BUSINESS_ACCOUNT_ID}/media`,
          null,
          {
            params: {
              image_url: imageUrl,
              is_carousel_item: true,
              access_token: IG_ACCESS_TOKEN,
            },
          },
        ),
      );
      await this.waitUntilReady(data.id);
      children.push(data.id);
    }

    const { data } = await firstValueFrom(
      this.http.post<{ id: string }>(
        `${GRAPH_URL}/${IG_BUSINESS_ACCOUNT_ID}/media`,
        null,
        {
          params: {
            media_type: 'CAROUSEL',
            children: children.join(','),
            caption,
            access_token: IG_ACCESS_TOKEN,
          },
        },
      ),
    );
    return data.id;
  }

  private async waitUntilReady(containerId: string): Promise<void> {
    for (let attempt = 0; attempt < CONTAINER_POLL_ATTEMPTS; attempt++) {
      const { data } = await firstValueFrom(
        this.http.get<{ status_code: string }>(`${GRAPH_URL}/${containerId}`, {
          params: { fields: 'status_code', access_token: IG_ACCESS_TOKEN },
        }),
      );

      if (data.status_code === 'FINISHED') return;
      if (data.status_code === 'ERROR' || data.status_code === 'EXPIRED') {
        throw new Error(
          `Instagram-контейнер ${containerId}: статус ${data.status_code}`,
        );
      }

      await new Promise((resolve) =>
        setTimeout(resolve, CONTAINER_POLL_DELAY_MS),
      );
    }
    throw new Error(
      `Instagram-контейнер ${containerId} не готов после ${CONTAINER_POLL_ATTEMPTS} попыток`,
    );
  }

  private async fetchPermalink(mediaId: string): Promise<string | null> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<{ permalink?: string }>(`${GRAPH_URL}/${mediaId}`, {
          params: { fields: 'permalink', access_token: IG_ACCESS_TOKEN },
        }),
      );
      return data.permalink ?? null;
    } catch {
      return null;
    }
  }
}
