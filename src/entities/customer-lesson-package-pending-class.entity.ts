import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CustomerEntity } from './customer.entity';
import { CustomerLessonPackageClassEntity } from './customer-lesson-package-class.entity';
import { CustomerLessonPackageEntity } from './customer-lesson-package.entity';

@Entity({ name: 'customer_lesson_package_pending_classes' })
export class CustomerLessonPackagePendingClassEntity {
  @PrimaryGeneratedColumn('rowid')
  id: number;

  @Column({ name: 'package_id', nullable: false })
  packageId: number;

  @Column({ name: 'class_id', nullable: true })
  classId?: number;

  @Column({ name: 'customer_id', nullable: false })
  customerId: number;

  @Column({ name: 'original_scheduled_date', type: 'date', nullable: true })
  originalScheduledDate?: Date;

  @Column({ name: 'rescheduled_date', type: 'date', nullable: true })
  rescheduledDate?: Date;

  @Column({ name: 'rescheduled_time', type: 'time', nullable: true })
  rescheduledTime?: string;

  @Column({ name: 'justification', nullable: true })
  justification?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(
    () => CustomerLessonPackageEntity,
    (lessonPackage) => lessonPackage.pendingClasses,
    {
      cascade: true,
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'package_id', referencedColumnName: 'id' })
  package?: CustomerLessonPackageEntity;

  @ManyToOne(
    () => CustomerLessonPackageClassEntity,
    (lessonClass) => lessonClass.pendingEntries,
    {
      nullable: true,
      onDelete: 'SET NULL',
    },
  )
  @JoinColumn({ name: 'class_id', referencedColumnName: 'id' })
  lessonClass?: CustomerLessonPackageClassEntity;

  @ManyToOne(() => CustomerEntity, { cascade: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id', referencedColumnName: 'id' })
  customer?: CustomerEntity;
}
