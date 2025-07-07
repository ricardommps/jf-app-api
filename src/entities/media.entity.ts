import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MediaInfoEntity } from './mediaInfo.entity';
import { WorkoutItemEntity } from './workoutItens.entity';

@Entity('media')
export class MediaEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToMany(() => WorkoutItemEntity, (item) => item.medias)
  workoutItems: WorkoutItemEntity[];

  @OneToMany(() => MediaInfoEntity, (mediaInfo) => mediaInfo.media)
  mediaInfo: MediaInfoEntity[]; // This allows you to access MediaInfoEntity from MediaEntity

  @Column({ name: 'title' })
  title: string;

  @Column({ name: 'thumbnail' })
  thumbnail: string;

  @Column({ name: 'video_url' })
  videoUrl: string;

  @Column({ name: 'instrucctions' })
  instrucctions: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
