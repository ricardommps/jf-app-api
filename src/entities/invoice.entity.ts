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

@Entity({ name: 'invoice' })
export class InvoiceEntity {
  @PrimaryGeneratedColumn('rowid')
  id: number;

  @Column({ name: 'customer_id' })
  customerId: number;

  @Column({ name: 'invoice_number', nullable: true })
  invoiceNumber: string;

  @Column({ name: 'due_date' })
  dueDate: Date;

  @Column({ name: 'description', nullable: true })
  description: string;

  @Column({ name: 'status', nullable: true })
  status: string;

  @Column({ name: 'total_amount', nullable: true })
  totalAmount: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => CustomerEntity, (customer) => customer.invoices, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'customer_id', referencedColumnName: 'id' })
  customer?: CustomerEntity;
}
