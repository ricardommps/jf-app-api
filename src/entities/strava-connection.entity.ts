import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CustomerEntity } from './customer.entity';

@Entity({ name: 'strava_connection' })
export class StravaConnectionEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  // 🔗 RELAÇÃO COM SEU ALUNO
  @Column({ name: 'customer_id', unique: true })
  customerId: number;

  @OneToOne(() => CustomerEntity)
  @JoinColumn({ name: 'customer_id' })
  customer: CustomerEntity;

  // 🔗 ID DO STRAVA
  @Column({ name: 'strava_athlete_id', unique: true })
  stravaAthleteId: number;

  @Column({ name: 'access_token', type: 'text' })
  accessToken: string;

  @Column({ name: 'refresh_token', type: 'text' })
  refreshToken: string;

  @Column({ name: 'expires_at', type: 'bigint' })
  expiresAt: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
