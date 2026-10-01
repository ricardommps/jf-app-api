import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerLessonPackageClassEntity } from '../entities/customer-lesson-package-class.entity';
import { CustomerLessonPackagePendingClassEntity } from '../entities/customer-lesson-package-pending-class.entity';
import { CustomerLessonPackageEntity } from '../entities/customer-lesson-package.entity';
import { CustomerEntity } from '../entities/customer.entity';
import { CustomerLessonPackageCalculationService } from './customer-lesson-package-calculation.service';
import { CustomerLessonPackageController } from './customer-lesson-package.controller';
import { CustomerLessonPackageService } from './customer-lesson-package.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerEntity,
      CustomerLessonPackageEntity,
      CustomerLessonPackageClassEntity,
      CustomerLessonPackagePendingClassEntity,
    ]),
  ],
  controllers: [CustomerLessonPackageController],
  providers: [
    CustomerLessonPackageService,
    CustomerLessonPackageCalculationService,
  ],
  exports: [CustomerLessonPackageService],
})
export class CustomerLessonPackageModule {}
