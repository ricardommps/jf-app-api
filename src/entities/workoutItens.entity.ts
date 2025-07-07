import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MediaEntity } from './media.entity';
import { MediaInfoEntity } from './mediaInfo.entity';
import { WorkoutEntity } from './workouts.entity';

@Entity('workout_items')
export class WorkoutItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => WorkoutEntity, (workout) => workout.workoutItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workout_id' })
  workout: WorkoutEntity;

  @Column({ name: '_id' })
  '_id': string;

  @Column({ name: 'category' })
  category: string;

  @Column({ name: 'description', nullable: true })
  description: string;

  @Column({ name: 'is_workout_load' })
  isWorkoutLoad: boolean;

  @Column({ name: 'media_order', type: 'jsonb' })
  mediaOrder: any[][];

  @OneToMany(() => MediaInfoEntity, (mediaInfo) => mediaInfo.workoutItem)
  mediaInfo: MediaInfoEntity[];

  @ManyToMany(() => MediaEntity, (media) => media.workoutItems, {
    cascade: true,
  })
  @JoinTable({
    name: 'workout_item_media_entity',
    joinColumn: {
      name: 'workoutItemId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'mediaId',
      referencedColumnName: 'id',
    },
  })
  medias: MediaEntity[];
}
