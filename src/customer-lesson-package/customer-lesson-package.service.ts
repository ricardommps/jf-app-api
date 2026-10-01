import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AddCustomerLessonPackageClassesDto,
  CreateCustomerLessonPackageDto,
  ListCustomerLessonPackageCalendarQueryDto,
  ListCustomerLessonPackagePendingClassesQueryDto,
  MarkCustomerLessonPackageClassPendingDto,
  UpdateCustomerLessonPackageClassDto,
  UpdateCustomerLessonPackageClassStatusDto,
  UpdateCustomerLessonPackageDto,
  UpdateCustomerLessonPackageStatusDto,
} from '../dtos/customer-lesson-package.dto';
import { CustomerLessonPackageClassEntity } from '../entities/customer-lesson-package-class.entity';
import {
  CustomerLessonPackageClassStatus,
  CustomerLessonPackageStatus,
} from '../entities/customer-lesson-package.enums';
import { CustomerLessonPackagePendingClassEntity } from '../entities/customer-lesson-package-pending-class.entity';
import { CustomerLessonPackageEntity } from '../entities/customer-lesson-package.entity';
import { CustomerEntity } from '../entities/customer.entity';
import { Repository } from 'typeorm';
import { CustomerLessonPackageCalculationService } from './customer-lesson-package-calculation.service';

@Injectable()
export class CustomerLessonPackageService {
  constructor(
    @InjectRepository(CustomerLessonPackageEntity)
    private readonly packageRepository: Repository<CustomerLessonPackageEntity>,
    @InjectRepository(CustomerLessonPackageClassEntity)
    private readonly packageClassRepository: Repository<CustomerLessonPackageClassEntity>,
    @InjectRepository(CustomerLessonPackagePendingClassEntity)
    private readonly pendingClassRepository: Repository<CustomerLessonPackagePendingClassEntity>,
    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,
    private readonly calculationService: CustomerLessonPackageCalculationService,
  ) {}

  async create(
    createPackageDto: CreateCustomerLessonPackageDto,
    createdById?: number,
  ): Promise<CustomerLessonPackageEntity> {
    await this.ensureCustomerExists(createPackageDto.customerId);
    await this.ensureCustomerHasNoActivePackage(createPackageDto.customerId);

    const totals = this.calculationService.calculateTotals({
      lessonUnitPrice: createPackageDto.lessonUnitPrice,
      classes: createPackageDto.classes,
    });

    const createdPackage = await this.packageRepository.manager.transaction(
      async (manager) => {
        const lessonPackage = manager.create(CustomerLessonPackageEntity, {
          customerId: createPackageDto.customerId,
          createdById: createPackageDto.createdById ?? createdById,
          title: createPackageDto.title,
          description: createPackageDto.description,
          lessonUnitPrice: createPackageDto.lessonUnitPrice,
          status: createPackageDto.status,
          ...totals,
        });

        const savedPackage = await manager.save(lessonPackage);

        const classes = createPackageDto.classes.map((lessonClass) =>
          manager.create(CustomerLessonPackageClassEntity, {
            packageId: savedPackage.id,
            customerId: createPackageDto.customerId,
            scheduledDate: new Date(lessonClass.scheduledDate),
            scheduledTime: lessonClass.scheduledTime,
            type: lessonClass.type,
            notes: lessonClass.notes,
          }),
        );

        await manager.save(classes);

        return savedPackage;
      },
    );

    return this.findById(createdPackage.id);
  }

  async findByCustomerId(
    customerId: number,
  ): Promise<CustomerLessonPackageEntity[]> {
    await this.ensureCustomerExists(customerId);

    return this.packageRepository.find({
      where: { customerId },
      relations: {
        classes: true,
        pendingClasses: true,
      },
      order: {
        createdAt: 'DESC',
        classes: {
          scheduledDate: 'ASC',
        },
      },
    });
  }

  async findById(id: number): Promise<CustomerLessonPackageEntity> {
    const lessonPackage = await this.packageRepository.findOne({
      where: { id },
      relations: {
        customer: true,
        classes: true,
        pendingClasses: true,
      },
      order: {
        classes: {
          scheduledDate: 'ASC',
        },
        pendingClasses: {
          rescheduledDate: 'ASC',
        },
      },
    });

    if (!lessonPackage) {
      throw new NotFoundException(`Lesson package ${id} not found`);
    }

    return lessonPackage;
  }

  async findActiveByCustomerId(
    customerId: number,
  ): Promise<CustomerLessonPackageEntity[]> {
    await this.ensureCustomerExists(customerId);

    return this.packageRepository.find({
      where: {
        customerId,
        status: CustomerLessonPackageStatus.ACTIVE,
      },
      relations: {
        classes: true,
        pendingClasses: true,
      },
      order: {
        createdAt: 'DESC',
        classes: {
          scheduledDate: 'ASC',
        },
      },
    });
  }

  async findClassesByPackageId(
    packageId: number,
  ): Promise<CustomerLessonPackageClassEntity[]> {
    await this.findById(packageId);

    return this.packageClassRepository.find({
      where: { packageId },
      order: {
        scheduledDate: 'ASC',
        scheduledTime: 'ASC',
        id: 'ASC',
      },
    });
  }

  async findPendingClasses(
    query: ListCustomerLessonPackagePendingClassesQueryDto,
  ): Promise<CustomerLessonPackagePendingClassEntity[]> {
    const queryBuilder = this.pendingClassRepository
      .createQueryBuilder('pendingClass')
      .leftJoinAndSelect('pendingClass.package', 'lessonPackage')
      .leftJoinAndSelect('pendingClass.lessonClass', 'lessonClass');

    if (query.customerId !== undefined) {
      queryBuilder.andWhere('pendingClass.customerId = :customerId', {
        customerId: query.customerId,
      });
    }

    if (query.packageId !== undefined) {
      queryBuilder.andWhere('pendingClass.packageId = :packageId', {
        packageId: query.packageId,
      });
    }

    return queryBuilder
      .orderBy('pendingClass.rescheduledDate', 'ASC', 'NULLS LAST')
      .addOrderBy('pendingClass.createdAt', 'DESC')
      .getMany();
  }

  async findCalendarClasses(
    query: ListCustomerLessonPackageCalendarQueryDto,
  ): Promise<CustomerLessonPackageClassEntity[]> {
    const queryBuilder = this.packageClassRepository
      .createQueryBuilder('lessonClass')
      .leftJoinAndSelect('lessonClass.package', 'lessonPackage')
      .where('lessonClass.scheduledDate BETWEEN :startDate AND :endDate', {
        startDate: query.startDate,
        endDate: query.endDate,
      });

    if (query.customerId !== undefined) {
      queryBuilder.andWhere('lessonClass.customerId = :customerId', {
        customerId: query.customerId,
      });
    }

    return queryBuilder
      .orderBy('lessonClass.scheduledDate', 'ASC')
      .addOrderBy('lessonClass.scheduledTime', 'ASC', 'NULLS LAST')
      .addOrderBy('lessonClass.id', 'ASC')
      .getMany();
  }

  async update(
    id: number,
    updatePackageDto: UpdateCustomerLessonPackageDto,
  ): Promise<CustomerLessonPackageEntity> {
    const lessonPackage = await this.findById(id);

    const shouldRecalculateTotals =
      updatePackageDto.lessonUnitPrice !== undefined;

    if (updatePackageDto.title !== undefined) {
      lessonPackage.title = updatePackageDto.title;
    }

    if (updatePackageDto.description !== undefined) {
      lessonPackage.description = updatePackageDto.description;
    }

    if (updatePackageDto.lessonUnitPrice !== undefined) {
      lessonPackage.lessonUnitPrice = updatePackageDto.lessonUnitPrice;
    }

    if (updatePackageDto.status !== undefined) {
      lessonPackage.status = updatePackageDto.status;
    }

    if (shouldRecalculateTotals) {
      const totals = this.calculationService.calculateTotals({
        lessonUnitPrice: lessonPackage.lessonUnitPrice,
        classes: lessonPackage.classes ?? [],
      });

      lessonPackage.totalLessons = totals.totalLessons;
      lessonPackage.paidLessons = totals.paidLessons;
      lessonPackage.totalAmount = totals.totalAmount;
    }

    await this.packageRepository.save(lessonPackage);

    return this.findById(id);
  }

  async updateStatus(
    id: number,
    updateStatusDto: UpdateCustomerLessonPackageStatusDto,
  ): Promise<CustomerLessonPackageEntity> {
    const lessonPackage = await this.findById(id);
    lessonPackage.status = updateStatusDto.status;

    await this.packageRepository.save(lessonPackage);

    return this.findById(id);
  }

  async addClasses(
    id: number,
    addClassesDto: AddCustomerLessonPackageClassesDto,
  ): Promise<CustomerLessonPackageEntity> {
    const lessonPackage = await this.findById(id);

    await this.packageRepository.manager.transaction(async (manager) => {
      const classes = addClassesDto.classes.map((lessonClass) =>
        manager.create(CustomerLessonPackageClassEntity, {
          packageId: lessonPackage.id,
          customerId: lessonPackage.customerId,
          scheduledDate: new Date(lessonClass.scheduledDate),
          scheduledTime: lessonClass.scheduledTime,
          type: lessonClass.type,
          notes: lessonClass.notes,
        }),
      );

      await manager.save(classes);
      await this.recalculatePackageTotals(lessonPackage.id, manager);
    });

    return this.findById(id);
  }

  async updateClass(
    classId: number,
    updateClassDto: UpdateCustomerLessonPackageClassDto,
  ): Promise<CustomerLessonPackageEntity> {
    const lessonClass = await this.findClassById(classId);
    const shouldRecalculateTotals = updateClassDto.type !== undefined;

    if (updateClassDto.scheduledDate !== undefined) {
      lessonClass.scheduledDate = new Date(updateClassDto.scheduledDate);
    }

    if (updateClassDto.scheduledTime !== undefined) {
      lessonClass.scheduledTime = updateClassDto.scheduledTime;
    }

    if (updateClassDto.type !== undefined) {
      lessonClass.type = updateClassDto.type;
    }

    if (updateClassDto.notes !== undefined) {
      lessonClass.notes = updateClassDto.notes;
    }

    await this.packageRepository.manager.transaction(async (manager) => {
      await manager.save(lessonClass);

      if (shouldRecalculateTotals) {
        await this.recalculatePackageTotals(lessonClass.packageId, manager);
      }
    });

    return this.findById(lessonClass.packageId);
  }

  async updateClassStatus(
    classId: number,
    updateStatusDto: UpdateCustomerLessonPackageClassStatusDto,
  ): Promise<CustomerLessonPackageEntity> {
    if (updateStatusDto.status === CustomerLessonPackageClassStatus.PENDING) {
      return this.markClassAsPending(classId, {});
    }

    return this.setClassStatus(classId, updateStatusDto.status);
  }

  async markClassAsPending(
    classId: number,
    pendingDto: MarkCustomerLessonPackageClassPendingDto,
  ): Promise<CustomerLessonPackageEntity> {
    const lessonClass = await this.findClassById(classId);

    await this.packageRepository.manager.transaction(async (manager) => {
      lessonClass.status = CustomerLessonPackageClassStatus.PENDING;
      await manager.save(lessonClass);

      const pendingClass = manager.create(
        CustomerLessonPackagePendingClassEntity,
        {
          packageId: lessonClass.packageId,
          classId: lessonClass.id,
          customerId: lessonClass.customerId,
          originalScheduledDate: lessonClass.scheduledDate,
          rescheduledDate: pendingDto.rescheduledDate
            ? new Date(pendingDto.rescheduledDate)
            : undefined,
          rescheduledTime: pendingDto.rescheduledTime,
          justification: pendingDto.justification,
        },
      );

      await manager.save(pendingClass);
    });

    return this.findById(lessonClass.packageId);
  }

  async cancelClass(classId: number): Promise<CustomerLessonPackageEntity> {
    return this.setClassStatus(
      classId,
      CustomerLessonPackageClassStatus.CANCELED,
    );
  }

  async finishClass(classId: number): Promise<CustomerLessonPackageEntity> {
    return this.setClassStatus(
      classId,
      CustomerLessonPackageClassStatus.FINISHED,
    );
  }

  private async ensureCustomerExists(customerId: number): Promise<void> {
    const customerExists = await this.customerRepository.exist({
      where: { id: customerId },
    });

    if (!customerExists) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }
  }

  private async ensureCustomerHasNoActivePackage(
    customerId: number,
  ): Promise<void> {
    const hasActivePackage = await this.packageRepository.exist({
      where: {
        customerId,
        status: CustomerLessonPackageStatus.ACTIVE,
      },
    });

    if (hasActivePackage) {
      throw new BadRequestException('O aluno já tem um pacote ativo');
    }
  }

  private async findClassById(
    classId: number,
  ): Promise<CustomerLessonPackageClassEntity> {
    const lessonClass = await this.packageClassRepository.findOne({
      where: { id: classId },
    });

    if (!lessonClass) {
      throw new NotFoundException(`Lesson package class ${classId} not found`);
    }

    return lessonClass;
  }

  private async setClassStatus(
    classId: number,
    status: CustomerLessonPackageClassStatus,
  ): Promise<CustomerLessonPackageEntity> {
    const lessonClass = await this.findClassById(classId);
    lessonClass.status = status;

    await this.packageClassRepository.save(lessonClass);

    return this.findById(lessonClass.packageId);
  }

  private async recalculatePackageTotals(
    packageId: number,
    manager = this.packageRepository.manager,
  ): Promise<void> {
    const lessonPackage = await manager.findOne(CustomerLessonPackageEntity, {
      where: { id: packageId },
      relations: {
        classes: true,
      },
    });

    if (!lessonPackage) {
      throw new NotFoundException(`Lesson package ${packageId} not found`);
    }

    const totals = this.calculationService.calculateTotals({
      lessonUnitPrice: lessonPackage.lessonUnitPrice,
      classes: lessonPackage.classes ?? [],
    });

    await manager.update(CustomerLessonPackageEntity, packageId, totals);
  }
}
