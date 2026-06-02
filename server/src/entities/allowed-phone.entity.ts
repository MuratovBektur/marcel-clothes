import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('bot_allowed_phones')
export class AllowedPhone {
  @PrimaryColumn()
  phone!: string;

  @Column({ nullable: true, type: 'varchar' })
  label?: string | null;
}
