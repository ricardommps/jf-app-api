// src/modules/muscles-worked/entities/muscles-worked.entity.ts
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MediaEntity } from './media.entity';

@Entity('muscles_worked')
export class MusclesWorkedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true, name: 'media_id' })
  mediaId: number;

  @OneToOne(() => MediaEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'media_id' })
  media: MediaEntity;

  @Column('int', { array: true })
  musclesId: number[];
}
