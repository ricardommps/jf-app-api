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

@Entity({ name: 'device_info' })
export class DeviceInfoEntity {
  @PrimaryGeneratedColumn('rowid')
  id: number;

  // Relacionamento com Customer
  @ManyToOne(() => CustomerEntity, (customer) => customer.deviceInfos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'customer_id' }) // 🔹 mapeia a coluna correta no banco
  customer: CustomerEntity;

  // Coluna física customer_id
  @Column({ name: 'customer_id' })
  customerId: number;

  // Coluna info JSON
  @Column({ type: 'jsonb', nullable: false })
  info: {
    brand: string;
    model: string;
    uniqueId: string;
    systemVersion: string;
  };

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @UpdateDateColumn({ name: 'last_sync_at' })
  lastSyncAt: Date;
}
