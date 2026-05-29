import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BotAuthorizedUser } from '../../entities/bot-authorized-user.entity';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly authorizedIds = new Set<number>();
  private readonly allowedPhones: Set<string>;

  constructor(
    @InjectRepository(BotAuthorizedUser)
    private readonly repo: Repository<BotAuthorizedUser>,
  ) {
    const raw = process.env.ALLOWED_PHONES ?? '';
    this.allowedPhones = new Set(
      raw.split(',').map((p) => p.replace(/\D/g, '')).filter(Boolean),
    );
  }

  async onModuleInit() {
    const users = await this.repo.find();
    for (const user of users) {
      this.authorizedIds.add(Number(user.telegramId));
    }
  }

  async checkAndAuthorize(rawPhone: string, telegramId: number): Promise<boolean> {
    const phone = rawPhone.replace(/\D/g, '');
    if (!this.allowedPhones.has(phone)) return false;
    this.authorizedIds.add(telegramId);
    await this.repo.upsert({ telegramId }, ['telegramId']);
    return true;
  }

  isAuthorized(telegramId: number): boolean {
    return this.authorizedIds.has(telegramId);
  }
}
