import { Entity, PrimaryColumn } from 'typeorm';

@Entity('bot_authorized_users')
export class BotAuthorizedUser {
  @PrimaryColumn({ type: 'bigint' })
  telegramId!: number;
}
