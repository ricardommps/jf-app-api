import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MediaEntity } from './media.entity';
import { WorkoutItemEntity } from './workoutItens.entity';

@Entity('media_info')
export class MediaInfoEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => WorkoutItemEntity, (workoutItem) => workoutItem.mediaInfo, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workout_item_id' })
  workoutItem: WorkoutItemEntity;

  @ManyToOne(() => MediaEntity, (media) => media.mediaInfo, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'media_id' })
  media: MediaEntity;

  @Column({ nullable: true, name: 'media_id' })
  mediaId: string;

  @Column({ nullable: true })
  method: string;

  @Column({ nullable: true })
  reps: string;

  @Column({ nullable: true })
  reset: string;

  @Column({ nullable: true })
  rir: string;

  @Column({ nullable: true })
  cadence: string;

  @Column({ nullable: true, type: 'text' })
  comments: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
