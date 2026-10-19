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
import {
  CustomerLessonPackageClassStatus,
  CustomerLessonPackageClassType,
} from './customer-lesson-package.enums';
import { CustomerLessonPackageEntity } from './customer-lesson-package.entity';
import { CustomerLessonPackagePendingClassEntity } from './customer-lesson-package-pending-class.entity';

@Entity({ name: 'customer_lesson_package_classes' })
export class CustomerLessonPackageClassEntity {
  @PrimaryGeneratedColumn('rowid')
  id: number;

  @Column({ name: 'package_id', nullable: false })
  packageId: number;

  @Column({ name: 'customer_id', nullable: false })
  customerId: number;

  @Column({ name: 'scheduled_date', type: 'date', nullable: false })
  scheduledDate: string;

  @Column({ name: 'scheduled_time', type: 'time', nullable: true })
  scheduledTime?: string;

  @Column({
    name: 'type',
    type: 'enum',
    enum: CustomerLessonPackageClassType,
    enumName: 'customer_lesson_package_class_type',
    default: CustomerLessonPackageClassType.REGULAR,
  })
  type: CustomerLessonPackageClassType;

  @Column({
    name: 'status',
    type: 'enum',
    enum: CustomerLessonPackageClassStatus,
    enumName: 'customer_lesson_package_class_status',
    default: CustomerLessonPackageClassStatus.SCHEDULED,
  })
  status: CustomerLessonPackageClassStatus;

  @Column({ name: 'notes', nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(
    () => CustomerLessonPackageEntity,
    (lessonPackage) => lessonPackage.classes,
    {
      cascade: true,
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'package_id', referencedColumnName: 'id' })
  package?: CustomerLessonPackageEntity;

  @ManyToOne(() => CustomerEntity, { cascade: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id', referencedColumnName: 'id' })
  customer?: CustomerEntity;

  @OneToMany(
    () => CustomerLessonPackagePendingClassEntity,
    (pendingClass) => pendingClass.lessonClass,
  )
  pendingEntries?: CustomerLessonPackagePendingClassEntity[];

  @OneToMany(
    () => CustomerLessonPackagePendingClassEntity,
    (pendingClass) => pendingClass.rescheduledClass,
  )
  rescheduledPendingEntries?: CustomerLessonPackagePendingClassEntity[];
}
