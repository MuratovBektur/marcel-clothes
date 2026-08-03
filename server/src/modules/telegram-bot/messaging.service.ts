import * as fs from 'fs';
import * as path from 'path';
import { Injectable } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { isVideoUrl } from '../../libs/media';

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
      `<b>Цена:</b> ${esc(p.retailPrice ?? '')}\n` +
      `<b>Материалы:</b> ${(p.materials ?? []).map(esc).join(', ')}\n` +
      `<b>Цвета:</b> ${(p.colors ?? []).map(esc).join(', ')}\n` +
      `<b>Размеры:</b> ${(p.sizes ?? []).map(esc).join(', ')}\n` +
      (p.description ? `<b>Описание:</b> ${esc(p.description)}\n` : '') +
      (p.additionalDescription ? `<b>Доп. описание:</b> ${esc(p.additionalDescription)}\n` : '') +
      `\n${hashtags}`
    );
  }

  private mediaSource(filePath: string) {
    return { source: fs.createReadStream(path.join(process.cwd(), filePath.replace(/^\//, ''))) };
  }

  // Порядок: сначала доп. фото/видео, потом основная карточка с описанием (последней).
  async sendProductCard(telegram: any, chatId: number, product: any): Promise<number[]> {
    const caption = this.buildCaption(product);
    const extraPhotos: string[] = product.extraPhotos ?? [];
    // Extra first, main media last
    const ordered: string[] = [...extraPhotos, product.photos[0]];

    if (ordered.length === 1) {
      const url = product.photos[0];
      const msg = isVideoUrl(url)
        ? await telegram.sendVideo(chatId, this.mediaSource(url), { caption, parse_mode: 'HTML' })
        : await telegram.sendPhoto(chatId, this.mediaSource(url), { caption, parse_mode: 'HTML' });
      return [msg.message_id];
    }

    const mediaGroup = ordered.map((p, i) => ({
      type: isVideoUrl(p) ? ('video' as const) : ('photo' as const),
      media: this.mediaSource(p),
      // Caption only on last item (main card)
      ...(i === ordered.length - 1 ? { caption, parse_mode: 'HTML' as const } : {}),
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
