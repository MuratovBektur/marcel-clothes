import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

// Общий для всех админов список Telegram-каналов/групп для автопубликации —
// раньше канал привязывался к тому, кто его добавил (bot_user_groups.chatId),
// и был не виден остальным. Добавленный с любого устройства канал теперь
// сразу доступен всем.
@Entity('telegram_channels')
export class TelegramChannel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'bigint', unique: true })
  chatId!: number;

  @Column({ type: 'varchar', nullable: true })
  chatTitle!: string | null;

  // Кто добавил — только для истории, на доступ не влияет.
  @Column({ type: 'bigint', nullable: true })
  addedBy!: number | null;

  @CreateDateColumn()
  createdAt!: Date;
}
