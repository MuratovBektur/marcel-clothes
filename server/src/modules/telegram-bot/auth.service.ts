import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BotAuthorizedUser } from '../../entities/bot-authorized-user.entity';
import { AllowedPhone } from '../../entities/allowed-phone.entity';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly authorizedIds = new Set<number>();
  private readonly allowedPhones = new Set<string>();

  constructor(
    @InjectRepository(BotAuthorizedUser)
    private readonly userRepo: Repository<BotAuthorizedUser>,
    @InjectRepository(AllowedPhone)
    private readonly phoneRepo: Repository<AllowedPhone>,
  ) {}

  async onModuleInit() {
    // Seed allowed phones from env var into DB on first run
    const envRaw = process.env.ALLOWED_PHONES ?? '';
    const envPhones = envRaw
      .split(',')
      .map((p) => p.replace(/\D/g, ''))
      .filter(Boolean);

    for (const phone of envPhones) {
      await this.phoneRepo.upsert({ phone }, ['phone']);
    }

    // Load all allowed phones from DB
    const dbPhones = await this.phoneRepo.find();
    for (const row of dbPhones) {
      this.allowedPhones.add(row.phone);
    }

    // Load already-authorized telegram IDs
    const users = await this.userRepo.find();
    for (const user of users) {
      this.authorizedIds.add(Number(user.telegramId));
    }
  }

  async checkAndAuthorize(rawPhone: string, telegramId: number): Promise<boolean> {
    const phone = rawPhone.replace(/\D/g, '');
    if (!this.allowedPhones.has(phone)) return false;
    this.authorizedIds.add(telegramId);
    await this.userRepo.upsert({ telegramId, phone }, ['telegramId']);
    return true;
  }

  isAuthorized(telegramId: number): boolean {
    return this.authorizedIds.has(telegramId);
  }

  async getPhones(): Promise<AllowedPhone[]> {
    return this.phoneRepo.find();
  }

  async addPhone(rawPhone: string, label?: string): Promise<void> {
    const phone = rawPhone.replace(/\D/g, '');
    this.allowedPhones.add(phone);
    await this.phoneRepo.upsert({ phone, label: label ?? null }, ['phone']);
  }

  async removePhone(rawPhone: string): Promise<void> {
    const phone = rawPhone.replace(/\D/g, '');
    this.allowedPhones.delete(phone);
    await this.phoneRepo.delete({ phone });

    // Revoke access for users who authorized with this phone
    const affected = await this.userRepo.findBy({ phone });
    for (const user of affected) {
      this.authorizedIds.delete(Number(user.telegramId));
    }
    await this.userRepo.delete({ phone });
  }
}
