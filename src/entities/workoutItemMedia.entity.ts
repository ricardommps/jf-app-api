import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { MediaEntity } from './media.entity';
import { WorkoutItemEntity } from './workoutItens.entity';

@Entity('workout_item_media_entity')
export class WorkoutItemMediaEntity {
  @PrimaryColumn()
  workoutItemId: string; // Corrigido para string, pois é UUID

  @PrimaryColumn()
  mediaId: string;

  @ManyToOne(() => WorkoutItemEntity, (workoutItem) => workoutItem.medias, {
    onDelete: 'CASCADE',
    eager: true,
  })
  @JoinColumn({ name: 'workoutItemId' })
  workoutItem: WorkoutItemEntity;

  @ManyToOne(() => MediaEntity, (media) => media.workoutItems, {
    // Adjusted to use `workoutItems` instead of `workoutItem`
    onDelete: 'CASCADE',
    eager: true,
  })
  @JoinColumn({ name: 'mediaId' })
  media: MediaEntity;
}
