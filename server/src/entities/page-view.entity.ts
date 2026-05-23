import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export type PageType = 'site' | 'product';

@Entity('page_views')
@Unique(['visitorId', 'pageType', 'productId'])
export class PageView {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'visitor_id' })
  visitorId!: string;

  @Index()
  @Column({ name: 'page_type' })
  pageType!: PageType;

  @Index()
  @Column({
    name: 'product_id',
    type: 'varchar',
    nullable: true,
    default: null,
  })
  productId?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
