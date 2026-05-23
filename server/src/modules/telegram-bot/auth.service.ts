import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  private readonly authorizedIds = new Set<number>();
  private readonly allowedPhones: Set<string>;

  constructor() {
    const raw = process.env.ALLOWED_PHONES ?? '';
    this.allowedPhones = new Set(
      raw.split(',').map((p) => p.replace(/\D/g, '')).filter(Boolean),
    );
  }

  checkAndAuthorize(rawPhone: string, telegramId: number): boolean {
    const phone = rawPhone.replace(/\D/g, '');
    if (!this.allowedPhones.has(phone)) return false;
    this.authorizedIds.add(telegramId);
    return true;
  }

  isAuthorized(telegramId: number): boolean {
    return this.authorizedIds.has(telegramId);
  }
}
