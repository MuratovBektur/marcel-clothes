import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('bot_user_groups')
export class BotUserGroup {
  @PrimaryColumn({ type: 'bigint' })
  telegramId!: number;

  @Column({ type: 'bigint', nullable: true })
  chatId!: number | null;

  @Column({ type: 'varchar', nullable: true })
  chatTitle!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  whatsappPhone!: string | null;

  @UpdateDateColumn()
  updatedAt!: Date;
}
