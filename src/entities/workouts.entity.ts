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
import { FinishedEntity } from './finished.entity';
import { ProgramEntity } from './program.entity';
import { WorkoutItemEntity } from './workoutItens.entity';
@Entity('workouts')
export class WorkoutsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'program_id' })
  programId: number;

  @ManyToOne(() => ProgramEntity, (program) => program.workouts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'program_id' })
  program: ProgramEntity;

  @Column()
  title: string;

  @Column()
  subtitle: string;

  @Column()
  description: string;

  @Column()
  heating: string;

  @Column()
  recovery: string;

  @Column({ name: 'display_order' })
  displayOrder: string;

  @Column()
  published: boolean;

  @Column()
  hide: boolean;

  @Column()
  finished: boolean;

  @Column()
  unrealized: boolean;

  @Column()
  running: boolean;

  @Column({ name: 'date_published', type: 'timestamp' })
  datePublished: Date;

  @Column({ name: 'workout_date_other', type: 'timestamp' })
  workoutDateOther: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => WorkoutItemEntity, (item) => item.workout)
  workoutItems: WorkoutItemEntity[];

  @OneToMany(() => FinishedEntity, (finished) => finished.workouts)
  history: FinishedEntity[];
}
