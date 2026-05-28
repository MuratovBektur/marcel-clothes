import * as fs from 'fs';
import * as path from 'path';
import { Injectable } from '@nestjs/common';
import { ProductsService } from '../products/products.service';

@Injectable()
export class TgGroupService {
  constructor(private readonly productsService: ProductsService) {}

  private buildCaption(p: any): string {
    const esc = (s: string) =>
      String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const toTag = (v: string) =>
      '#' + v.replace(/[^а-яёa-z0-9]/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    const hashtags = [
      toTag(p.type),
      ...(p.materials ?? []).map(toTag),
      ...(p.colors ?? []).map(toTag),
      ...(p.sizes ?? []).map(toTag),
    ].join(' ');

    return (
      `<b>Тип:</b> ${esc(p.type)}\n` +
      `<b>Цена:</b> ${esc(p.price)}\n` +
      `<b>Материалы:</b> ${(p.materials ?? []).map(esc).join(', ')}\n` +
      `<b>Цвета:</b> ${(p.colors ?? []).map(esc).join(', ')}\n` +
      `<b>Размеры:</b> ${(p.sizes ?? []).map(esc).join(', ')}\n` +
      (p.description ? `<b>Описание:</b> ${esc(p.description)}\n` : '') +
      `\n${hashtags}`
    );
  }

  private photoSource(photoPath: string) {
    return { source: fs.createReadStream(path.join(process.cwd(), photoPath.replace(/^\//, ''))) };
  }

  // Порядок: сначала доп. фото, потом основная карточка с описанием (последней).
  async sendProductCard(telegram: any, chatId: number, product: any): Promise<number[]> {
    const caption = this.buildCaption(product);
    const extraPhotos: string[] = product.extraPhotos ?? [];
    // Extra first, main photo last
    const orderedPhotos: string[] = [...extraPhotos, product.photos[0]];

    if (orderedPhotos.length === 1) {
      const msg = await telegram.sendPhoto(chatId, this.photoSource(product.photos[0]), {
        caption,
        parse_mode: 'HTML',
      });
      return [msg.message_id];
    }

    const mediaGroup = orderedPhotos.map((p, i) => ({
      type: 'photo' as const,
      media: this.photoSource(p),
      // Caption only on last photo (main card)
      ...(i === orderedPhotos.length - 1 ? { caption, parse_mode: 'HTML' as const } : {}),
    }));
    const messages = await telegram.sendMediaGroup(chatId, mediaGroup);
    return messages.map((m: any) => m.message_id);
  }

  async deleteProductCard(telegram: any, chatId: number, messageIds: number[]): Promise<void> {
    await Promise.allSettled(messageIds.map((id) => telegram.deleteMessage(chatId, id)));
  }

  async updateProductCard(telegram: any, product: any): Promise<void> {
    if (!product.publishedPost) return;
    const { chatId, messageIds } = product.publishedPost;
    await this.deleteProductCard(telegram, chatId, messageIds);
    try {
      const newIds = await this.sendProductCard(telegram, chatId, product);
      await this.productsService.update(product.id, {
        publishedPost: { chatId, messageIds: newIds },
      });
    } catch (e) {
      console.error('[TgGroup] Failed to re-send to Telegram group:', e);
      throw e;
    }
  }
}
