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

@Entity({ name: 'workout' })
export class WorkoutEntity {
  @PrimaryGeneratedColumn('rowid')
  id: number;

  @Column({ name: 'program_id', nullable: false })
  programId: number;

  @Column({ name: 'name', nullable: true })
  name: string;

  @Column({ name: 'subtitle' })
  subtitle: string;

  @Column({ name: 'description', nullable: true })
  description: string;

  @Column({ name: 'heating' })
  heating: string;

  @Column({ name: 'recovery' })
  recovery: string;

  @Column({ name: 'cover_path' })
  coverPath: string;

  @Column({ name: 'date_published' })
  datePublished: Date;

  @Column({ name: 'workout_date_other' })
  workoutDateOther: Date;

  @Column({ name: 'published' })
  published: boolean;

  @Column({ name: 'hide' })
  hide: boolean;

  @Column({ name: 'finished' })
  finished: boolean;

  @Column({ name: 'unrealized' })
  unrealized: boolean;

  @Column({ name: 'running' })
  running: boolean;

  @Column('jsonb', { name: 'media_order' })
  mediaOrder: object[];

  @Column('jsonb', { name: 'stretches_order' })
  stretchesOrder: object[];

  @Column('jsonb', { name: 'heating_order' })
  heatingOrder: object[];

  @Column('jsonb', { name: 'exercise_info' })
  exerciseInfo: object[];

  @Column({ type: 'text', array: true, default: () => "'{}'", name: 'tags' })
  tags: string[];

  @Column({ name: 'display_order' })
  displayOrder: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => ProgramEntity, (program) => program.workouts)
  @JoinColumn({ name: 'program_id', referencedColumnName: 'id' })
  program?: ProgramEntity;

  @OneToMany(() => FinishedEntity, (finished) => finished.workouts)
  history: FinishedEntity[];
}
