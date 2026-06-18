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

  // Выбранные возрастные категории (Для мальчиков / Для подростков / Для мужчин)
  @Column({ type: 'jsonb', nullable: true, default: null })
  gender!: string[] | null;

  @Column()
  type!: string;

  @Column({ type: 'text', name: 'wholesale_price', nullable: true, default: null })
  wholesalePrice!: string | null;

  @Column({ type: 'text', name: 'retail_price', nullable: true, default: null })
  retailPrice!: string | null;

  @Column('jsonb')
  materials!: string[];

  @Column('jsonb')
  colors!: string[];

  @Column('jsonb')
  sizes!: string[];

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text', name: 'additional_description', nullable: true, default: null })
  additionalDescription!: string | null;

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

  @Column({ type: 'text', name: 'showroom_product_id', nullable: true, default: null })
  showroomProductId?: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
