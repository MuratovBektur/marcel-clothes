import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('chat_telegram_refs')
@Index(['telegramChatId', 'telegramMessageId'])
export class ChatTelegramRef {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column()
  threadId!: string;

  @Column({ type: 'bigint' })
  telegramChatId!: number;

  @Column({ type: 'bigint' })
  telegramMessageId!: number;
}
