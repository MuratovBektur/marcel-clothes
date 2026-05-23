import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  gender!: string;

  @Column()
  category!: string;

  @Column()
  type!: string;

  @Column({ type: 'text', nullable: true, default: null })
  brand!: string | null;

  @Column()
  country!: string;

  @Column()
  price!: string;

  @Column('jsonb')
  materials!: string[];

  @Column('jsonb')
  colors!: string[];

  @Column('jsonb')
  sizes!: string[];

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column('jsonb')
  photos!: string[];

  @Column('jsonb')
  extraPhotos!: string[];

  @Column({ default: false })
  isPublished!: boolean;

  @Column({ type: 'jsonb', nullable: true, default: null })
  publishedPost!: { chatId: number; messageIds: number[] } | null;

  @Column({ type: 'jsonb', nullable: true, default: null })
  publishedWaPost!: { groupId: string; keys: { remoteJid?: string; fromMe?: boolean; id?: string; participant?: string }[]; contentHash?: string } | null;

  @CreateDateColumn()
  createdAt!: Date;
}
