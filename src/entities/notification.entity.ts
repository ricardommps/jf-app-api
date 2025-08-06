import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CustomerEntity } from './customer.entity';

@Entity({ name: 'notifications' })
export class NotificationEntity {
  @PrimaryGeneratedColumn('rowid')
  id: number;

  @Column({ name: 'recipient_id', nullable: false })
  recipientId: number;

  @Column({ name: 'title', type: 'varchar', length: 255, nullable: false })
  title: string;

  @Column({ name: 'content', type: 'text', nullable: false })
  content: string;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt: Date | null;

  @Column({ name: 'type' })
  type: string;

  @Column({ name: 'link' })
  link: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => CustomerEntity, (customer) => customer.notifications, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'recipient_id', referencedColumnName: 'id' })
  recipient: CustomerEntity;
}
