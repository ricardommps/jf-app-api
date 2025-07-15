import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WorkoutEntity } from './workout.entity';
import { WorkoutsEntity } from './workouts.entity';

@Entity({ name: 'finished' })
export class FinishedEntity {
  @PrimaryGeneratedColumn('rowid')
  id: number;

  @Column({ name: 'workout_id' })
  workoutId: number;

  @Column({ name: 'workouts_id' })
  workoutsId: number;

  @Column({ name: 'execution_day' })
  executionDay: string;

  @Column({ type: 'numeric', precision: 8, scale: 3, nullable: true })
  distance: number;

  @Column({ type: 'numeric', precision: 8, scale: 3, nullable: true })
  duration: number;

  @Column({ type: 'varchar', nullable: true })
  pace: string;

  @Column({ type: 'text', nullable: true })
  link: string;

  @Column({ type: 'int', nullable: true })
  rpe: number;

  @Column({ type: 'varchar', nullable: true })
  trimp: string;

  @Column({ nullable: true })
  review: boolean | null;

  @Column({ type: 'varchar', nullable: true })
  comments: string;

  @Column({ type: 'varchar', nullable: true })
  feedback: string;

  @Column({ type: 'boolean', default: false })
  unrealized: boolean;

  @Column({ type: 'boolean', default: false })
  outdoor: boolean;

  @Column({ type: 'varchar', array: true, nullable: true })
  intensities: string[];

  @Column({ type: 'varchar', nullable: true, name: 'unitmeasurement' })
  unitMeasurement: string;

  @Column({ type: 'varchar', name: 'type_workout', nullable: true })
  typeWorkout: string;

  @Column('jsonb', { name: 'check_list' })
  checkList: number[];

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'distance_in_meters',
  })
  distanceInMeters: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'duration_in_seconds',
  })
  durationInSeconds: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'pace_in_seconds',
  })
  paceInSeconds: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => WorkoutsEntity, (workout) => workout.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workouts_id' })
  workouts: WorkoutsEntity;

  @ManyToOne(() => WorkoutEntity, (workout) => workout.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workout_id' })
  workout: WorkoutEntity;
}
