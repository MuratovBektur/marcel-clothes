import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export type ButtonType =
  | 'whatsapp'
  | 'telegram'
  | 'tgChannel'
  | 'tgGroup'
  | 'website'
  | 'favourite';

@Entity('button_clicks')
@Unique(['visitorId', 'productId', 'buttonType'])
export class ButtonClick {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'visitor_id' })
  visitorId!: string;

  @Index()
  @Column({ name: 'product_id' })
  productId!: string;

  @Index()
  @Column({ name: 'button_type' })
  buttonType!: ButtonType;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
