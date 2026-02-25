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
import { CustomerEntity } from './customer.entity';
import { FinishedEntity } from './finished.entity';

@Entity({ name: 'comments' })
export class CommentEntity {
  @PrimaryGeneratedColumn('rowid')
  id: number;

  @Column({ name: 'finished_id' })
  finishedId: number;

  @Column({ name: 'author_id' })
  authorId: number;

  @Column({ name: 'parent_id', nullable: true })
  parentId: number | null;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'is_admin', type: 'boolean', default: false })
  isAdmin: boolean;

  @Column({ type: 'boolean', default: false })
  read: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => FinishedEntity, (finished) => finished.comments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'finished_id' })
  finished: FinishedEntity;

  @ManyToOne(() => CustomerEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'author_id' })
  author: CustomerEntity;

  @ManyToOne(() => CommentEntity, (comment) => comment.replies, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parent_id' })
  parent: CommentEntity;

  @OneToMany(() => CommentEntity, (comment) => comment.parent)
  replies: CommentEntity[];
}
