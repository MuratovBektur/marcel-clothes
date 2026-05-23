import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('bot_user_wa_groups')
export class BotUserWaGroup {
  @PrimaryColumn({ type: 'bigint' })
  telegramId!: number;

  @Column({ type: 'varchar' })
  waGroupId!: string;

  @Column({ type: 'varchar', nullable: true })
  waGroupName!: string | null;

  @UpdateDateColumn()
  updatedAt!: Date;
}
