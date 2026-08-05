import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BotUserGroup } from '../../entities/bot-user-group.entity';
import { TelegramChannel } from '../../entities/telegram-channel.entity';

@Injectable()
export class GroupService {
  constructor(
    @InjectRepository(BotUserGroup)
    private readonly repo: Repository<BotUserGroup>,
    @InjectRepository(TelegramChannel)
    private readonly channelRepo: Repository<TelegramChannel>,
  ) {}

  // ─── Telegram-каналы (общий список — виден и доступен для публикации с
  // любого устройства, независимо от того, кто их добавил) ──────────────────
  async addChannel(
    chatId: number,
    chatTitle: string | undefined,
    addedBy: number,
  ): Promise<void> {
    await this.channelRepo.upsert(
      { chatId, chatTitle: chatTitle ?? null, addedBy },
      ['chatId'],
    );
  }

  async listChannels(): Promise<TelegramChannel[]> {
    return this.channelRepo.find({ order: { createdAt: 'ASC' } });
  }

  async removeChannel(chatId: number): Promise<void> {
    await this.channelRepo.delete({ chatId });
  }

  // ─── WhatsApp ─────────────────────────────────────────────────────────────────
  // В отличие от Telegram-каналов остаётся per-админским: WhatsApp-аккаунт
  // линкуется лично через пейринг-код, шарить его между устройствами нельзя.
  async setWhatsApp(telegramId: number, phone: string): Promise<void> {
    const existing = await this.repo.findOneBy({ telegramId });
    if (existing) {
      await this.repo.update({ telegramId }, { whatsappPhone: phone });
    } else {
      await this.repo.save({ telegramId, whatsappPhone: phone });
    }
  }

  async getWhatsApp(telegramId: number): Promise<string | undefined> {
    const row = await this.repo.findOneBy({ telegramId });
    return row?.whatsappPhone ?? undefined;
  }
}
