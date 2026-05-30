import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export interface OrderItem {
  productId: string;
  productType: string;
  price: string;
  qty: number;
  photo: string;
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  customerName!: string;

  @Column()
  customerPhone!: string;

  @Column('jsonb')
  items!: OrderItem[];

  @Column()
  total!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
