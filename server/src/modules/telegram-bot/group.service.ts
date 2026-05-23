import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BotUserGroup } from '../../entities/bot-user-group.entity';

@Injectable()
export class GroupService {
  constructor(
    @InjectRepository(BotUserGroup)
    private readonly repo: Repository<BotUserGroup>,
  ) {}

  async set(telegramId: number, chatId: number, chatTitle?: string): Promise<void> {
    await this.repo.upsert(
      { telegramId, chatId, chatTitle: chatTitle ?? null },
      ['telegramId'],
    );
  }

  async get(telegramId: number): Promise<number | undefined> {
    const row = await this.repo.findOneBy({ telegramId });
    return row?.chatId ?? undefined;
  }

  async getTitle(telegramId: number): Promise<string | null> {
    const row = await this.repo.findOneBy({ telegramId });
    return row?.chatTitle ?? null;
  }

  async remove(telegramId: number): Promise<void> {
    await this.repo.delete({ telegramId });
  }

  // ─── WhatsApp ─────────────────────────────────────────────────────────────────
  async setWhatsApp(telegramId: number, phone: string): Promise<void> {
    const existing = await this.repo.findOneBy({ telegramId });
    if (existing) {
      await this.repo.update({ telegramId }, { whatsappPhone: phone });
    } else {
      await this.repo.save({ telegramId, chatId: null, chatTitle: null, whatsappPhone: phone });
    }
  }

  async getWhatsApp(telegramId: number): Promise<string | undefined> {
    const row = await this.repo.findOneBy({ telegramId });
    return row?.whatsappPhone ?? undefined;
  }
}
