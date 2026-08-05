import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

// Telegram-каналы отсюда переехали в TelegramChannel (общий список для всех,
// см. её комментарий) — здесь остались только per-админские настройки
// WhatsApp, которые по своей природе привязаны к конкретному аккаунту
// (каждый линкует свой WhatsApp через пейринг-код).
@Entity('bot_user_groups')
export class BotUserGroup {
  @PrimaryColumn({ type: 'bigint' })
  telegramId!: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  whatsappPhone!: string | null;

  @UpdateDateColumn()
  updatedAt!: Date;
}
