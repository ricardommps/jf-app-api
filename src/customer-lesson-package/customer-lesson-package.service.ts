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
  CustomerLessonPackageClassType,
  CustomerLessonPackageStatus,
} from '../entities/customer-lesson-package.enums';
import { CustomerLessonPackagePendingClassEntity } from '../entities/customer-lesson-package-pending-class.entity';
import { CustomerLessonPackageEntity } from '../entities/customer-lesson-package.entity';
import { CustomerEntity } from '../entities/customer.entity';
import { EntityManager, In, IsNull, Repository } from 'typeorm';
import { CustomerLessonPackageCalculationService } from './customer-lesson-package-calculation.service';
import { NotificationService } from '../notification/notification.service';

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
    private readonly notificationService: NotificationService,
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
          warnings: createPackageDto.warnings,
          lessonUnitPrice: createPackageDto.lessonUnitPrice,
          status: createPackageDto.status,
          ...totals,
        });

        const savedPackage = await manager.save(lessonPackage);

        const classes = createPackageDto.classes.map((lessonClass) =>
          manager.create(CustomerLessonPackageClassEntity, {
            packageId: savedPackage.id,
            customerId: createPackageDto.customerId,
            scheduledDate: this.toDateOnly(lessonClass.scheduledDate),
            scheduledTime: lessonClass.scheduledTime,
            type: lessonClass.type,
            notes: lessonClass.notes,
          }),
        );

        const savedClasses = await manager.save(classes);
        await this.linkPendingClassesToRescheduledClasses(
          manager,
          createPackageDto.customerId,
          savedClasses,
        );

        return savedPackage;
      },
    );

    return this.findById(createdPackage.id);
  }

  async findExpiringPackages() {
    const now = new Date();
    const twoDaysAgo = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 2,
    );
    const sevenDaysAhead = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 7,
    );

    // Apply the window to the last class, considering every class status.
    const packages = await this.packageRepository
      .createQueryBuilder('lessonPackage')
      .innerJoin('lessonPackage.customer', 'customer')
      .innerJoin('lessonPackage.classes', 'lessonClass')
      .select('lessonPackage.id', 'packageId')
      .addSelect('lessonPackage.title', 'title')
      .addSelect('customer.id', 'customerId')
      .addSelect('customer.name', 'customerName')
      .addSelect('customer.avatar', 'avatar')
      .addSelect("TO_CHAR(MAX(lessonClass.scheduledDate), 'YYYY-MM-DD')", 'endDate')
      .where('lessonPackage.status = :status', {
        status: CustomerLessonPackageStatus.ACTIVE,
      })
      .groupBy('lessonPackage.id')
      .addGroupBy('customer.id')
      .having('MAX(lessonClass.scheduledDate) BETWEEN :startDate AND :endDate', {
        startDate: this.toDateOnly(twoDaysAgo),
        endDate: this.toDateOnly(sevenDaysAhead),
      })
      .orderBy('customer.name', 'ASC')
      .addOrderBy('MAX(lessonClass.scheduledDate)', 'ASC')
      .addOrderBy('lessonPackage.id', 'ASC')
      .getRawMany<{
        packageId: number;
        title: string;
        customerId: number;
        customerName: string;
        avatar: string | null;
        endDate: string;
      }>();

    return packages.map((lessonPackage) => {
      const endOfDay = new Date(`${lessonPackage.endDate}T23:59:59.999`);

      return {
        ...lessonPackage,
        daysUntilExpiration: Math.ceil(
          (endOfDay.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        ),
      };
    });
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
    if (
      updatePackageDto.addClasses !== undefined ||
      updatePackageDto.removeClassIds !== undefined
    ) {
      return this.updateWithSchedule(id, updatePackageDto);
    }

    const lessonPackage = await this.findById(id);

    await this.ensurePackageCanBeFinished(id, updatePackageDto.status);

    const shouldRecalculateTotals =
      updatePackageDto.lessonUnitPrice !== undefined;

    this.applyPackageUpdates(lessonPackage, updatePackageDto);

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
    await this.ensurePackageCanBeFinished(id, updateStatusDto.status);
    lessonPackage.status = updateStatusDto.status;

    await this.packageRepository.save(lessonPackage);

    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    await this.findById(id);
    await this.packageRepository.delete(id);
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
          scheduledDate: this.toDateOnly(lessonClass.scheduledDate),
          scheduledTime: lessonClass.scheduledTime,
          type: lessonClass.type,
          notes: lessonClass.notes,
        }),
      );

      const savedClasses = await manager.save(classes);
      await this.linkPendingClassesToRescheduledClasses(
        manager,
        lessonPackage.customerId,
        savedClasses,
      );
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
    const originalScheduledDate = lessonClass.scheduledDate;
    let shouldNotifyReschedule = false;

    if (updateClassDto.scheduledDate !== undefined) {
      await this.ensureClassDateIsWithinPackageInterval(
        lessonClass.packageId,
        updateClassDto.scheduledDate,
      );
      shouldNotifyReschedule =
        this.toDateOnly(originalScheduledDate) !==
        this.toDateOnly(updateClassDto.scheduledDate);
      lessonClass.scheduledDate = this.toDateOnly(updateClassDto.scheduledDate);
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

    const lessonPackage = await this.findById(lessonClass.packageId);

    if (shouldNotifyReschedule) {
      const updatedLessonClass = lessonPackage.classes?.find(
        (currentClass) => Number(currentClass.id) === Number(classId),
      );

      if (updatedLessonClass) {
        await this.sendClassRescheduledNotification(
          updatedLessonClass,
          originalScheduledDate,
        );
      }
    }

    return lessonPackage;
  }

  async updateClassStatus(
    classId: number,
    updateStatusDto: UpdateCustomerLessonPackageClassStatusDto,
  ): Promise<CustomerLessonPackageEntity> {
    if (updateStatusDto.status === CustomerLessonPackageClassStatus.PENDING) {
      return this.markClassAsPending(classId, {});
    }

    if (updateStatusDto.status === CustomerLessonPackageClassStatus.FINISHED) {
      return this.finishClass(classId);
    }

    if (updateStatusDto.status === CustomerLessonPackageClassStatus.CANCELED) {
      return this.cancelClass(classId);
    }

    return this.setClassStatus(classId, updateStatusDto.status);
  }

  async markClassAsPending(
    classId: number,
    pendingDto: MarkCustomerLessonPackageClassPendingDto,
  ): Promise<CustomerLessonPackageEntity> {
    const lessonClass = await this.findClassById(classId);
    const wasAlreadyPending =
      lessonClass.status === CustomerLessonPackageClassStatus.PENDING;

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
            ? this.toDateOnly(pendingDto.rescheduledDate)
            : undefined,
          rescheduledTime: pendingDto.rescheduledTime,
          justification: pendingDto.justification,
        },
      );

      await manager.save(pendingClass);
    });

    const lessonPackage = await this.findById(lessonClass.packageId);
    const updatedLessonClass = lessonPackage.classes?.find(
      (currentClass) => Number(currentClass.id) === Number(classId),
    );

    if (updatedLessonClass && !wasAlreadyPending) {
      await this.sendClassPendingNotification(updatedLessonClass);
    }

    return lessonPackage;
  }

  async cancelClass(classId: number): Promise<CustomerLessonPackageEntity> {
    const currentLessonClass = await this.findClassById(classId);
    const wasAlreadyCanceled =
      currentLessonClass.status === CustomerLessonPackageClassStatus.CANCELED;
    const lessonPackage = await this.setClassStatus(
      classId,
      CustomerLessonPackageClassStatus.CANCELED,
    );

    const lessonClass = lessonPackage.classes?.find(
      (currentClass) => Number(currentClass.id) === Number(classId),
    );

    if (lessonClass && !wasAlreadyCanceled) {
      await this.sendClassCanceledNotification(lessonClass);
    }

    return lessonPackage;
  }

  async finishClass(classId: number): Promise<CustomerLessonPackageEntity> {
    const currentLessonClass = await this.findClassById(classId);
    const wasAlreadyFinished =
      currentLessonClass.status === CustomerLessonPackageClassStatus.FINISHED;

    await this.packageRepository.manager.transaction(async (manager) => {
      currentLessonClass.status = CustomerLessonPackageClassStatus.FINISHED;
      await manager.save(currentLessonClass);

      if (currentLessonClass.type === CustomerLessonPackageClassType.PENDING) {
        await manager.delete(CustomerLessonPackagePendingClassEntity, {
          rescheduledClassId: currentLessonClass.id,
        });
      }
    });

    const lessonPackage = await this.findById(currentLessonClass.packageId);

    const lessonClass = lessonPackage.classes?.find(
      (currentClass) => Number(currentClass.id) === Number(classId),
    );

    if (lessonClass && !wasAlreadyFinished) {
      await this.sendClassFinishedNotification(lessonClass);
    }

    return lessonPackage;
  }

  private formatScheduledDateLabel(value: Date | string): string {
    const normalizedValue = this.toDateOnly(value);
    const [year, month, day] = normalizedValue.split('-').map(Number);

    if (!year || !month || !day) {
      return normalizedValue;
    }

    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  }

  private toDateOnly(value: Date | string): string {
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }

    return String(value).split('T')[0];
  }

  private async ensureClassDateIsWithinPackageInterval(
    packageId: number,
    scheduledDate: string,
  ): Promise<void> {
    const packageClasses = await this.packageClassRepository.find({
      where: { packageId },
      order: {
        scheduledDate: 'ASC',
        id: 'ASC',
      },
    });

    if (!packageClasses.length) {
      return;
    }

    const orderedDates = packageClasses
      .map((lessonClass) => this.toDateOnly(lessonClass.scheduledDate))
      .sort();
    const startDate = orderedDates[0];
    const endDate = orderedDates[orderedDates.length - 1];
    const nextDate = this.toDateOnly(scheduledDate);

    if (nextDate < startDate || nextDate > endDate) {
      throw new BadRequestException(
        `A data da aula deve estar entre ${this.formatScheduledDateLabel(
          startDate,
        )} e ${this.formatScheduledDateLabel(endDate)}`,
      );
    }
  }

  private async sendClassFinishedNotification(
    lessonClass: CustomerLessonPackageClassEntity,
  ): Promise<void> {
    const scheduledDateLabel = this.formatScheduledDateLabel(
      lessonClass.scheduledDate,
    );

    await this.notificationService.sendNotificationV2({
      recipientId: lessonClass.customerId,
      title: 'Aula finalizada',
      content: `A aula do dia ${scheduledDateLabel} foi finalizada`,
      type: 'lesson-package-class',
      metadata: {
        lessonPackageId: lessonClass.packageId,
        lessonPackageClassId: lessonClass.id,
        referenceDate: String(lessonClass.scheduledDate),
        actionKind: 'mark-as-read',
      },
      sendPush: true,
    });
  }

  private async sendClassCanceledNotification(
    lessonClass: CustomerLessonPackageClassEntity,
  ): Promise<void> {
    const scheduledDateLabel = this.formatScheduledDateLabel(
      lessonClass.scheduledDate,
    );

    await this.notificationService.sendNotificationV2({
      recipientId: lessonClass.customerId,
      title: 'Aula cancelada',
      content: `A aula do dia ${scheduledDateLabel} foi cancelada`,
      type: 'lesson-package-class',
      metadata: {
        lessonPackageId: lessonClass.packageId,
        lessonPackageClassId: lessonClass.id,
        referenceDate: String(lessonClass.scheduledDate),
        actionKind: 'mark-as-read',
      },
      sendPush: true,
    });
  }

  private async sendClassPendingNotification(
    lessonClass: CustomerLessonPackageClassEntity,
  ): Promise<void> {
    const scheduledDateLabel = this.formatScheduledDateLabel(
      lessonClass.scheduledDate,
    );

    await this.notificationService.sendNotificationV2({
      recipientId: lessonClass.customerId,
      title: 'Aula pendente',
      content: `A aula do dia ${scheduledDateLabel} consta para remarcar/descontar`,
      type: 'lesson-package-class',
      metadata: {
        lessonPackageId: lessonClass.packageId,
        lessonPackageClassId: lessonClass.id,
        referenceDate: String(lessonClass.scheduledDate),
        actionKind: 'mark-as-read',
      },
      sendPush: true,
    });
  }

  private async sendClassRescheduledNotification(
    lessonClass: CustomerLessonPackageClassEntity,
    originalScheduledDate: Date | string,
  ): Promise<void> {
    const originalScheduledDateLabel =
      this.formatScheduledDateLabel(originalScheduledDate);
    const nextScheduledDateLabel = this.formatScheduledDateLabel(
      lessonClass.scheduledDate,
    );

    await this.notificationService.sendNotificationV2({
      recipientId: lessonClass.customerId,
      title: 'Aula remarcada',
      content: `A aula do dia ${originalScheduledDateLabel} foi remarcada para o dia ${nextScheduledDateLabel}`,
      type: 'lesson-package-class',
      metadata: {
        lessonPackageId: lessonClass.packageId,
        lessonPackageClassId: lessonClass.id,
        referenceDate: String(lessonClass.scheduledDate),
        originalScheduledDate: this.toDateOnly(originalScheduledDate),
        rescheduledDate: this.toDateOnly(lessonClass.scheduledDate),
        actionKind: 'mark-as-read',
      },
      sendPush: true,
    });
  }

  private applyPackageUpdates(
    lessonPackage: CustomerLessonPackageEntity,
    updatePackageDto: UpdateCustomerLessonPackageDto,
  ): void {
    if (updatePackageDto.title !== undefined) {
      lessonPackage.title = updatePackageDto.title;
    }

    if (updatePackageDto.description !== undefined) {
      lessonPackage.description = updatePackageDto.description;
    }

    if (updatePackageDto.warnings !== undefined) {
      lessonPackage.warnings = updatePackageDto.warnings;
    }

    if (updatePackageDto.lessonUnitPrice !== undefined) {
      lessonPackage.lessonUnitPrice = updatePackageDto.lessonUnitPrice;
    }

    if (updatePackageDto.status !== undefined) {
      lessonPackage.status = updatePackageDto.status;
    }
  }

  private async updateWithSchedule(
    id: number,
    updatePackageDto: UpdateCustomerLessonPackageDto,
  ): Promise<CustomerLessonPackageEntity> {
    await this.packageRepository.manager.transaction(async (manager) => {
      const lessonPackage = await manager.findOne(CustomerLessonPackageEntity, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lessonPackage) {
        throw new NotFoundException(`Lesson package ${id} not found`);
      }

      const currentClasses = await manager
        .createQueryBuilder(CustomerLessonPackageClassEntity, 'lessonClass')
        .where('lessonClass.packageId = :packageId', { packageId: id })
        .orderBy('lessonClass.id', 'ASC')
        .setLock('pessimistic_write')
        .getMany();
      const removeClassIds = [...new Set(updatePackageDto.removeClassIds ?? [])];
      const removedClasses = currentClasses.filter((lessonClass) =>
        removeClassIds.includes(lessonClass.id),
      );

      if (removedClasses.length !== removeClassIds.length) {
        throw new BadRequestException(
          'Uma ou mais aulas não pertencem a este pacote ou já foram excluídas.',
        );
      }

      if (
        removedClasses.some(
          (lessonClass) =>
            lessonClass.status !== CustomerLessonPackageClassStatus.SCHEDULED,
        )
      ) {
        throw new BadRequestException(
          'Só é possível excluir aulas com status "Programada".',
        );
      }

      const addedClasses = (updatePackageDto.addClasses ?? []).map((lessonClass) =>
        manager.create(CustomerLessonPackageClassEntity, {
          packageId: id,
          customerId: lessonPackage.customerId,
          scheduledDate: this.toDateOnly(lessonClass.scheduledDate),
          scheduledTime: lessonClass.scheduledTime,
          type: lessonClass.type,
          notes: lessonClass.notes,
          status: CustomerLessonPackageClassStatus.SCHEDULED,
        }),
      );
      const finalClasses = [
        ...currentClasses.filter(
          (lessonClass) => !removeClassIds.includes(lessonClass.id),
        ),
        ...addedClasses,
      ];

      this.applyPackageUpdates(lessonPackage, updatePackageDto);
      if (
        lessonPackage.status === CustomerLessonPackageStatus.FINISHED &&
        finalClasses.some(
          (lessonClass) =>
            lessonClass.status === CustomerLessonPackageClassStatus.SCHEDULED,
        )
      ) {
        throw new BadRequestException(
          'Não é possível finalizar: o pacote ainda tem aulas programadas.',
        );
      }

      if (removeClassIds.length) {
        const result = await manager.delete(CustomerLessonPackageClassEntity, {
          packageId: id,
          id: In(removeClassIds),
          status: CustomerLessonPackageClassStatus.SCHEDULED,
        });
        if (result.affected !== removeClassIds.length) {
          throw new BadRequestException(
            'As aulas foram alteradas. Atualize o pacote e tente novamente.',
          );
        }
      }

      if (addedClasses.length) {
        const savedClasses = await manager.save(addedClasses);
        await this.linkPendingClassesToRescheduledClasses(
          manager,
          lessonPackage.customerId,
          savedClasses,
        );
      }

      Object.assign(
        lessonPackage,
        this.calculationService.calculateTotals({
          lessonUnitPrice: lessonPackage.lessonUnitPrice,
          classes: finalClasses,
        }),
      );
      await manager.save(lessonPackage);
    });

    return this.findById(id);
  }

  private async ensurePackageCanBeFinished(
    packageId: number,
    status?: CustomerLessonPackageStatus,
  ): Promise<void> {
    if (status !== CustomerLessonPackageStatus.FINISHED) {
      return;
    }

    const hasScheduledClasses = await this.packageClassRepository.exist({
      where: {
        packageId,
        status: CustomerLessonPackageClassStatus.SCHEDULED,
      },
    });

    if (hasScheduledClasses) {
      throw new BadRequestException(
        'Não é possível finalizar: o pacote ainda tem aulas programadas.',
      );
    }
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

  private async linkPendingClassesToRescheduledClasses(
    manager: EntityManager,
    customerId: number,
    classes: CustomerLessonPackageClassEntity[],
  ): Promise<void> {
    const rescheduledClasses = classes.filter(
      (lessonClass) => lessonClass.type === CustomerLessonPackageClassType.PENDING,
    );

    if (!rescheduledClasses.length) {
      return;
    }

    const pendingClasses = await manager.find(CustomerLessonPackagePendingClassEntity, {
      where: {
        customerId,
        rescheduledClassId: IsNull(),
      },
      order: {
        createdAt: 'ASC',
        id: 'ASC',
      },
      take: rescheduledClasses.length,
    });

    await Promise.all(
      pendingClasses.map((pendingClass, index) => {
        const rescheduledClass = rescheduledClasses[index];

        return manager.update(CustomerLessonPackagePendingClassEntity, pendingClass.id, {
          rescheduledClassId: rescheduledClass.id,
          rescheduledDate: rescheduledClass.scheduledDate,
          rescheduledTime: rescheduledClass.scheduledTime,
        });
      }),
    );
  }
}
