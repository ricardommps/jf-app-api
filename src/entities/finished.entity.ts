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
import { CommentEntity } from './comment.entity';
import { WorkoutEntity } from './workout.entity';
import { WorkoutsEntity } from './workouts.entity';

@Entity({ name: 'finished' })
export class FinishedEntity {
  @PrimaryGeneratedColumn('rowid')
  id: number;

  @Column({ name: 'workout_id' })
  workoutId: number;

  @Column({ name: 'workouts_id' })
  workoutsId: string;

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

  @Column({
    type: 'text',
    name: 'summary_polyline',
    nullable: true,
  })
  summaryPolyline?: string;

  @Column({ type: 'text', nullable: true })
  linkstrava: string;

  @Column({ type: 'int', nullable: true })
  rpe: number;

  @Column({ type: 'varchar', nullable: true })
  trimp: string;

  @Column({ nullable: true })
  review: boolean | null;

  @Column({ name: 'external_id', nullable: true })
  externalId: number;

  @Column({ name: 'source', nullable: true })
  source: string; // 'manual' | 'strava'

  @Column({ type: 'varchar', nullable: true, name: 'strava_activity_name' })
  stravaActivityName?: string;

  @Column({ type: 'varchar', nullable: true, name: 'strava_activity_type' })
  stravaActivityType?: string;

  @Column({ type: 'varchar', nullable: true, name: 'strava_sport_type' })
  stravaSportType?: string;

  @Column({ type: 'int', nullable: true, name: 'strava_workout_type' })
  stravaWorkoutType?: number;

  @Column({ type: 'varchar', nullable: true, name: 'strava_device_name' })
  stravaDeviceName?: string;

  @Column({ type: 'varchar', nullable: true, name: 'strava_timezone' })
  stravaTimezone?: string;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'strava_start_date',
  })
  stravaStartDate?: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'strava_start_date_local',
  })
  stravaStartDateLocal?: Date;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'elapsed_time_in_seconds',
  })
  elapsedTimeInSeconds?: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'total_elevation_gain',
  })
  totalElevationGain?: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'average_heartrate',
  })
  averageHeartrate?: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'max_heartrate',
  })
  maxHeartrate?: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'average_cadence',
  })
  averageCadence?: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'calories',
  })
  calories?: number;

  @Column({
    type: 'numeric',
    precision: 9,
    scale: 6,
    nullable: true,
    name: 'start_latitude',
  })
  startLatitude?: number;

  @Column({
    type: 'numeric',
    precision: 9,
    scale: 6,
    nullable: true,
    name: 'start_longitude',
  })
  startLongitude?: number;

  @Column({
    type: 'numeric',
    precision: 9,
    scale: 6,
    nullable: true,
    name: 'end_latitude',
  })
  endLatitude?: number;

  @Column({
    type: 'numeric',
    precision: 9,
    scale: 6,
    nullable: true,
    name: 'end_longitude',
  })
  endLongitude?: number;

  @Column({ type: 'varchar', nullable: true, name: 'location_label' })
  locationLabel?: string;

  @Column({ type: 'varchar', nullable: true, name: 'location_city' })
  locationCity?: string;

  @Column({ type: 'varchar', nullable: true, name: 'location_state' })
  locationState?: string;

  @Column({ type: 'varchar', nullable: true, name: 'location_country' })
  locationCountry?: string;

  /**
   * @deprecated Use CommentEntity com isAdmin=false ao invés deste campo
   * Mantido apenas para compatibilidade com dados antigos
   */
  @Column({ type: 'varchar', nullable: true })
  comments: string;

  /**
   * @deprecated Use CommentEntity com isAdmin=true ao invés deste campo
   * Mantido apenas para compatibilidade com dados antigos
   */
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

  @Column({
    type: 'numeric',
    precision: 8,
    scale: 3,
    nullable: true,
    name: 'cool_down_duration',
  })
  coolDownDuration: number;

  @Column({
    type: 'numeric',
    precision: 8,
    scale: 3,
    nullable: true,
    name: 'cool_down_intensities',
  })
  coolDownIntensities: number;

  @Column({
    type: 'numeric',
    precision: 8,
    scale: 3,
    nullable: true,
    name: 'warm_up_duration',
  })
  warmUpDuration: number;

  @Column({
    type: 'numeric',
    precision: 8,
    scale: 3,
    nullable: true,
    name: 'warm_up_intensities',
  })
  warmUpIntensities: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => WorkoutsEntity, (workout) => workout.id, {
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'workouts_id' })
  workouts: WorkoutsEntity;

  @ManyToOne(() => WorkoutEntity, (workout) => workout.id, {
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'workout_id' })
  workout: WorkoutEntity;

  @OneToMany(() => CommentEntity, (comment) => comment.finished)
  comments_relation: CommentEntity[];
}
