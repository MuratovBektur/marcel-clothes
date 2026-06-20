import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export type ChatMessageSender = 'client' | 'admin' | 'system';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column()
  threadId!: string;

  @Column({ type: 'varchar' })
  sender!: ChatMessageSender;

  @Column('text')
  text!: string;

  // precision: 3 — совпадает с миллисекундной точностью JS Date, иначе курсор поллинга
  // (MoreThan по последнему createdAt) будет бесконечно повторно отдавать одно и то же сообщение.
  @CreateDateColumn({ precision: 3 })
  createdAt!: Date;
}
