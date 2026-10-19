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
  CustomerLessonPackageStatus,
} from './customer-lesson-package.enums';
import { CustomerLessonPackageClassEntity } from './customer-lesson-package-class.entity';
import { CustomerLessonPackagePendingClassEntity } from './customer-lesson-package-pending-class.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'customer_lesson_packages' })
export class CustomerLessonPackageEntity {
  @PrimaryGeneratedColumn('rowid')
  id: number;

  @Column({ name: 'customer_id', nullable: false })
  customerId: number;

  @Column({ name: 'created_by_id', nullable: true })
  createdById?: number;

  @Column({ name: 'title', nullable: false })
  title: string;

  @Column({ name: 'description', nullable: true })
  description?: string;

  @Column({ name: 'warnings', nullable: true })
  warnings?: string;

  @Column('decimal', {
    name: 'lesson_unit_price',
    precision: 10,
    scale: 2,
    nullable: false,
  })
  lessonUnitPrice: number;

  @Column({
    name: 'status',
    type: 'enum',
    enum: CustomerLessonPackageStatus,
    enumName: 'customer_lesson_package_status',
    default: CustomerLessonPackageStatus.ACTIVE,
  })
  status: CustomerLessonPackageStatus;

  @Column({ name: 'total_lessons', default: 0 })
  totalLessons: number;

  @Column({ name: 'paid_lessons', default: 0 })
  paidLessons: number;

  @Column('decimal', {
    name: 'total_amount',
    precision: 10,
    scale: 2,
    default: 0,
  })
  totalAmount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => CustomerEntity, (customer) => customer.lessonPackages, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'customer_id', referencedColumnName: 'id' })
  customer?: CustomerEntity;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id', referencedColumnName: 'id' })
  createdBy?: UserEntity;

  @OneToMany(
    () => CustomerLessonPackageClassEntity,
    (lessonClass) => lessonClass.package,
  )
  classes?: CustomerLessonPackageClassEntity[];

  @OneToMany(
    () => CustomerLessonPackagePendingClassEntity,
    (pendingClass) => pendingClass.package,
  )
  pendingClasses?: CustomerLessonPackagePendingClassEntity[];
}

export {
  CustomerLessonPackageClassStatus,
  CustomerLessonPackageClassType,
  CustomerLessonPackageStatus,
};
