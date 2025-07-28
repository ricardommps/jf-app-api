import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProgramEntity } from './program.entity';
import { WorkoutLoadEntity } from './workoutLoad.entity';

@Entity({ name: 'customer' })
export class CustomerEntity {
  @PrimaryGeneratedColumn('rowid')
  id: number;

  @Column({ name: 'user_id', nullable: false })
  userId: number;

  @Column({ name: 'name', nullable: false })
  name: string;

  @Column({ name: 'email', nullable: false })
  email: string;

  @Column({ name: 'cpf', nullable: false })
  cpf: string;

  @Column({ name: 'password', nullable: false })
  password: string;

  @Column({ name: 'goal' })
  goal: string;

  @Column({ name: 'type_user', nullable: false })
  typeUser: number;

  @Column({ name: 'active', nullable: false })
  active: boolean;

  @Column({ name: 'is_runner', nullable: false })
  isRunner: boolean;

  @Column({ name: 'is_strength', nullable: false })
  isStrength: boolean;

  @Column({ name: 'expires_date' })
  expiresDate: Date;

  @Column({ name: 'gender', nullable: false })
  gender: string;

  @Column({ name: 'birth_date', nullable: false })
  birthDate: Date;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  height: number; // Permite até dois dígitos decimais

  @Column({ name: 'weight' })
  weight: number;

  @Column({ name: 'phone' })
  phone: string;

  @Column({ name: 'avatar' })
  avatar: string;

  @Column({ name: 'cloudinary_id' })
  cloudinaryId: string;

  @Column({ name: 'temporary_password' })
  temporaryPassword: boolean;

  @Column({ name: 'marital_status' })
  maritalStatus: string;

  @Column({ name: 'zip_code' })
  zipCode: string;

  @Column({ name: 'complement' })
  complement: string;

  @Column({ name: 'street' })
  street: string;

  @Column({ name: 'street_number' })
  streetNumber: string;

  @Column({ name: 'city' })
  city: string;

  @Column({ name: 'state' })
  state: string;

  @Column({ name: 'district' })
  district: string;

  @Column({ name: 'fat_percentage' })
  fatPercentage: string;

  @Column({ name: 'is_young_life', default: false })
  isYoungLife: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ProgramEntity, (program) => program.customer)
  programs?: ProgramEntity[];

  @OneToMany(() => WorkoutLoadEntity, (workoutLoad) => workoutLoad.customer)
  workoutLoads: WorkoutLoadEntity[];
}
