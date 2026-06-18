import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Product } from '../../entities/product.entity';

const SHOWROOM_API_URL = process.env.SHOWROOM_API_URL;
const SHOWROOM_API_KEY = process.env.SHOWROOM_API_KEY;
const PUBLIC_URL = process.env.PUBLIC_URL ?? 'https://marcel.kg';

// Глобальный маркет требует категорию из своего справочника — у нас её нет,
// весь ассортимент относим к этой категории.
const SHOWROOM_CATEGORY = 'Костюмы и пиджаки';
const SHOWROOM_COUNTRY = 'скрыт';

@Injectable()
export class ShowroomSyncService {
  private readonly logger = new Logger(ShowroomSyncService.name);

  constructor(private readonly http: HttpService) {}

  async sync(product: Product): Promise<string | null> {
    if (!SHOWROOM_API_URL || !SHOWROOM_API_KEY) {
      this.logger.warn(
        'SHOWROOM_API_URL/SHOWROOM_API_KEY не заданы — товар не отправлен в глобальный маркет',
      );
      return null;
    }

    const toAbsolute = (url: string) =>
      url.startsWith('http') ? url : `${PUBLIC_URL}${url}`;

    const description =
      [product.description, product.additionalDescription]
        .filter((part) => !!part)
        .join('\n\n') || null;

    try {
      const { data } = await firstValueFrom(
        this.http.post<{ id: string }>(
          SHOWROOM_API_URL,
          {
            gender: product.gender ?? [],
            category: SHOWROOM_CATEGORY,
            type: product.type,
            country: SHOWROOM_COUNTRY,
            price: product.wholesalePrice,
            materials: product.materials,
            colors: product.colors,
            sizes: product.sizes,
            description,
            photos: product.photos.map(toAbsolute),
            extraPhotos: product.extraPhotos.map(toAbsolute),
          },
          { headers: { 'x-api-key': SHOWROOM_API_KEY } },
        ),
      );
      return data.id;
    } catch (err) {
      this.logger.error(
        `Не удалось отправить товар ${product.id} в глобальный маркет`,
        err instanceof Error ? err.stack : String(err),
      );
      return null;
    }
  }

  async remove(showroomProductId: string): Promise<void> {
    if (!SHOWROOM_API_URL || !SHOWROOM_API_KEY) return;

    try {
      await firstValueFrom(
        this.http.delete(`${SHOWROOM_API_URL}/${showroomProductId}`, {
          headers: { 'x-api-key': SHOWROOM_API_KEY },
        }),
      );
    } catch (err) {
      this.logger.error(
        `Не удалось удалить товар ${showroomProductId} из глобального маркета`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
