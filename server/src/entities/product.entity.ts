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

  @Column({ type: 'text', name: 'instagram_media_id', nullable: true, default: null })
  instagramMediaId?: string | null;

  @Column({ type: 'text', name: 'instagram_permalink', nullable: true, default: null })
  instagramPermalink?: string | null;

  @Column({ type: 'text', name: 'facebook_post_id', nullable: true, default: null })
  facebookPostId?: string | null;

  @Column({ type: 'text', name: 'facebook_permalink', nullable: true, default: null })
  facebookPermalink?: string | null;

  // Текст ошибки последней попытки публикации в площадку — null, если последняя
  // попытка прошла успешно (или площадки ещё не касались). Отдельно от
  // isPublished/*PostId/*MediaId — те не сбрасываются на неудаче, поэтому сами
  // по себе не отличают «опубликовано и актуально» от «было опубликовано,
  // но последняя попытка обновить упала с ошибкой».
  @Column({ type: 'text', name: 'telegram_last_error', nullable: true, default: null })
  telegramLastError?: string | null;

  @Column({ type: 'text', name: 'whatsapp_last_error', nullable: true, default: null })
  whatsappLastError?: string | null;

  @Column({ type: 'text', name: 'instagram_last_error', nullable: true, default: null })
  instagramLastError?: string | null;

  @Column({ type: 'text', name: 'facebook_last_error', nullable: true, default: null })
  facebookLastError?: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
