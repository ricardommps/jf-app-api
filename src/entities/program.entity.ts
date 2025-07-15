import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CustomerEntity } from './customer.entity';
import { WorkoutsEntity } from './workouts.entity';

@Entity({ name: 'program' })
export class ProgramEntity {
  @PrimaryGeneratedColumn('rowid')
  id: number;

  @Column({ name: 'customer_id', nullable: false })
  customerId: number;

  @Column({ name: 'start_date' })
  startDate: Date;

  @Column({ name: 'end_date' })
  endDate: Date;

  @Column({ name: 'active', nullable: false })
  active: boolean;

  @Column({ name: 'name', nullable: true })
  name: string;

  @Column({ name: 'goal' })
  goal: string;

  @Column({ name: 'difficulty_level', nullable: true })
  difficultyLevel: string;

  @Column({ name: 'reference_month' })
  referenceMonth: Date;

  @Column({ name: 'pv', nullable: true })
  pv: string;

  @Column({ name: 'pace', nullable: true })
  pace: string;

  @Column({ name: 'vlan', nullable: true })
  vlan: string;

  @Column({ name: 'pace_vlan', nullable: true })
  paceVlan: string;

  @Column({ name: 'vla', nullable: true })
  vla: string;

  @Column({ name: 'pace_vla', nullable: true })
  paceVla: string;

  @Column({ name: 'vlan_level' })
  vlanLevel: number;

  @Column({ name: 'vla_level' })
  vlaLevel: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'test', nullable: true })
  test: string;

  @Column({ name: 'warning_pdf', nullable: true })
  warningPdf: string;

  @Column({ name: 'date_test' })
  dateTest: Date;

  @Column({ name: 'fcm_value', nullable: true })
  fcmValue: number;

  @Column({ name: 'hide' })
  hide: boolean;

  @Column({ name: 'vs2' })
  vs2: boolean;

  @Column({ name: 'additional_information' })
  additionalInformation: string;

  @Column({ name: 'type', nullable: true })
  type: number;

  @ManyToOne(() => CustomerEntity, (customer) => customer.programs, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'customer_id', referencedColumnName: 'id' })
  customer?: CustomerEntity;

  @OneToMany(() => WorkoutsEntity, (workout) => workout.program)
  workouts?: WorkoutsEntity[];
}
