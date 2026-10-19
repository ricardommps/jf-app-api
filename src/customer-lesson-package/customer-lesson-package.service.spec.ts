import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CustomerLessonPackageClassEntity } from '../entities/customer-lesson-package-class.entity';
import { CustomerLessonPackagePendingClassEntity } from '../entities/customer-lesson-package-pending-class.entity';
import { CustomerLessonPackageEntity } from '../entities/customer-lesson-package.entity';
import {
  CustomerLessonPackageClassStatus,
  CustomerLessonPackageClassType,
  CustomerLessonPackageStatus,
} from '../entities/customer-lesson-package.enums';
import { CustomerEntity } from '../entities/customer.entity';
import { NotificationService } from '../notification/notification.service';
import { CustomerLessonPackageCalculationService } from './customer-lesson-package-calculation.service';
import { CustomerLessonPackageService } from './customer-lesson-package.service';

jest.mock('../notification/notification.service', () => ({
  NotificationService: class {},
}));

describe.each(['update', 'updateStatus'] as const)(
  'CustomerLessonPackageService.%s',
  (method) => {
    let service: CustomerLessonPackageService;
    let lessonPackage: CustomerLessonPackageEntity;
    let packageRepository: { findOne: jest.Mock; save: jest.Mock };
    let classRepository: { exist: jest.Mock };

    beforeEach(() => {
      lessonPackage = Object.assign(new CustomerLessonPackageEntity(), {
        id: 42,
        title: 'Pacote atual',
        status: CustomerLessonPackageStatus.ACTIVE,
      });
      packageRepository = {
        findOne: jest.fn().mockResolvedValue(lessonPackage),
        save: jest.fn().mockResolvedValue(lessonPackage),
      };
      classRepository = { exist: jest.fn().mockResolvedValue(false) };
      service = new CustomerLessonPackageService(
        packageRepository as unknown as Repository<CustomerLessonPackageEntity>,
        classRepository as unknown as Repository<CustomerLessonPackageClassEntity>,
        {} as Repository<CustomerLessonPackagePendingClassEntity>,
        {} as Repository<CustomerEntity>,
        new CustomerLessonPackageCalculationService(),
        {} as NotificationService,
      );
    });

    it('rejects completion with scheduled classes before modifying or saving the package', async () => {
      classRepository.exist.mockResolvedValue(true);
      const operation = service[method](42, {
        status: CustomerLessonPackageStatus.FINISHED,
      });

      await expect(operation).rejects.toBeInstanceOf(BadRequestException);
      await expect(operation).rejects.toMatchObject({
        message:
          'Não é possível finalizar: o pacote ainda tem aulas programadas.',
        status: 400,
      });
      expect(classRepository.exist).toHaveBeenCalledWith({
        where: {
          packageId: 42,
          status: CustomerLessonPackageClassStatus.SCHEDULED,
        },
      });
      expect(lessonPackage.status).toBe(CustomerLessonPackageStatus.ACTIVE);
      expect(packageRepository.save).not.toHaveBeenCalled();
    });

    it('allows completion when the package has no scheduled classes', async () => {
      await expect(
        service[method](42, { status: CustomerLessonPackageStatus.FINISHED }),
      ).resolves.toMatchObject({
        status: CustomerLessonPackageStatus.FINISHED,
      });

      expect(packageRepository.save).toHaveBeenCalledWith(lessonPackage);
    });

    it.each([
      CustomerLessonPackageStatus.ACTIVE,
      CustomerLessonPackageStatus.PAUSED,
    ])(
      'allows status %s without checking scheduled classes',
      async (status) => {
        classRepository.exist.mockResolvedValue(true);

        await expect(service[method](42, { status })).resolves.toMatchObject({
          status,
        });

        expect(classRepository.exist).not.toHaveBeenCalled();
        expect(packageRepository.save).toHaveBeenCalled();
      },
    );

    it('preserves not-found errors without checking classes or saving', async () => {
      packageRepository.findOne.mockResolvedValue(null);

      await expect(
        service[method](42, { status: CustomerLessonPackageStatus.FINISHED }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(classRepository.exist).not.toHaveBeenCalled();
      expect(packageRepository.save).not.toHaveBeenCalled();
    });

    if (method === 'update') {
      it('allows editing other fields without changing status', async () => {
        await expect(
          service.update(42, { title: 'Novo título' }),
        ).resolves.toMatchObject({
          title: 'Novo título',
          status: CustomerLessonPackageStatus.ACTIVE,
        });

        expect(classRepository.exist).not.toHaveBeenCalled();
      });

      it('does not partially apply edits when completion is rejected', async () => {
        classRepository.exist.mockResolvedValue(true);

        await expect(
          service.update(42, {
            title: 'Novo título',
            status: CustomerLessonPackageStatus.FINISHED,
          }),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(lessonPackage.title).toBe('Pacote atual');
        expect(packageRepository.save).not.toHaveBeenCalled();
      });
    }
  },
);

describe('CustomerLessonPackageService.findExpiringPackages', () => {
  let service: CustomerLessonPackageService;
  let queryBuilder: Record<string, jest.Mock>;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 9, 16, 12));
    queryBuilder = {};
    for (const method of [
      'innerJoin',
      'select',
      'addSelect',
      'where',
      'groupBy',
      'addGroupBy',
      'having',
      'orderBy',
      'addOrderBy',
    ]) {
      queryBuilder[method] = jest.fn().mockReturnValue(queryBuilder);
    }
    queryBuilder.getRawMany = jest.fn().mockResolvedValue([]);
    service = new CustomerLessonPackageService(
      {
        createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      } as unknown as Repository<CustomerLessonPackageEntity>,
      {} as Repository<CustomerLessonPackageClassEntity>,
      {} as Repository<CustomerLessonPackagePendingClassEntity>,
      {} as Repository<CustomerEntity>,
      new CustomerLessonPackageCalculationService(),
      {} as NotificationService,
    );
  });

  afterEach(() => jest.useRealTimers());

  it.each([
    ['2026-10-14', -1],
    ['2026-10-15', -0],
    ['2026-10-16', 1],
    ['2026-10-17', 2],
    ['2026-10-23', 8],
  ])(
    'rounds up until the end of %s to %s days',
    async (endDate, daysUntilExpiration) => {
      const lessonPackage = {
        packageId: 42,
        title: 'Pacote de aulas',
        customerId: 10,
        customerName: 'Aluno',
        avatar: null,
        endDate,
      };
      queryBuilder.getRawMany.mockResolvedValue([lessonPackage]);

      await expect(service.findExpiringPackages()).resolves.toEqual([
        { ...lessonPackage, daysUntilExpiration },
      ]);
    },
  );

  it('filters active packages by their last class within the inclusive window', async () => {
    await expect(service.findExpiringPackages()).resolves.toEqual([]);

    expect(queryBuilder.where).toHaveBeenCalledWith(
      'lessonPackage.status = :status',
      {
        status: CustomerLessonPackageStatus.ACTIVE,
      },
    );
    expect(queryBuilder.having).toHaveBeenCalledWith(
      'MAX(lessonClass.scheduledDate) BETWEEN :startDate AND :endDate',
      { startDate: '2026-10-14', endDate: '2026-10-23' },
    );
  });
});

describe('CustomerLessonPackageService.update with schedule changes', () => {
  let service: CustomerLessonPackageService;
  let manager: Record<string, jest.Mock>;
  let lessonPackage: CustomerLessonPackageEntity;
  let classes: CustomerLessonPackageClassEntity[];

  beforeEach(() => {
    lessonPackage = Object.assign(new CustomerLessonPackageEntity(), {
      id: 42,
      customerId: 10,
      title: 'Pacote atual',
      status: CustomerLessonPackageStatus.ACTIVE,
      lessonUnitPrice: 100,
    });
    classes = [
      Object.assign(new CustomerLessonPackageClassEntity(), {
        id: 1,
        packageId: 42,
        scheduledDate: '2026-10-16',
        status: CustomerLessonPackageClassStatus.SCHEDULED,
        type: 'regular',
      }),
      Object.assign(new CustomerLessonPackageClassEntity(), {
        id: 2,
        packageId: 42,
        scheduledDate: '2026-10-15',
        status: CustomerLessonPackageClassStatus.FINISHED,
        type: 'regular',
      }),
    ];
    const builder = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockImplementation(async () => classes),
    };
    manager = {
      findOne: jest.fn().mockImplementation(async () => ({ ...lessonPackage })),
      createQueryBuilder: jest.fn().mockReturnValue(builder),
      create: jest.fn((entity, values) => Object.assign(new entity(), values)),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      save: jest.fn(async (value) =>
        Array.isArray(value)
          ? value.map((item, index) => ({ ...item, id: 100 + index }))
          : value,
      ),
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
    };
    const transaction = jest.fn(async (callback) => callback(manager));
    service = new CustomerLessonPackageService(
      {
        manager: { transaction },
      } as unknown as Repository<CustomerLessonPackageEntity>,
      {} as Repository<CustomerLessonPackageClassEntity>,
      {} as Repository<CustomerLessonPackagePendingClassEntity>,
      {} as Repository<CustomerEntity>,
      new CustomerLessonPackageCalculationService(),
      {} as NotificationService,
    );
    jest.spyOn(service, 'findById').mockResolvedValue(lessonPackage);
  });

  it.each([
    CustomerLessonPackageClassStatus.PENDING,
    CustomerLessonPackageClassStatus.FINISHED,
    CustomerLessonPackageClassStatus.CANCELED,
  ])(
    'rejects deleting a %s class without persisting other edits',
    async (status) => {
      classes[1].status = status;
      await expect(
        service.update(42, {
          title: 'Novo título',
          removeClassIds: [2],
        }),
      ).rejects.toThrow('Só é possível excluir aulas com status "Programada".');
      expect(manager.delete).not.toHaveBeenCalled();
      expect(manager.save).not.toHaveBeenCalled();
    },
  );

  it('rejects IDs outside the package', async () => {
    await expect(
      service.update(42, { removeClassIds: [999] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.delete).not.toHaveBeenCalled();
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('removes only scheduled classes, adds new classes and recalculates all totals', async () => {
    await service.update(42, {
      title: 'Novo título',
      lessonUnitPrice: 125,
      removeClassIds: [1],
      addClasses: [
        {
          scheduledDate: '2026-11-01',
          type: CustomerLessonPackageClassType.REGULAR,
        },
        {
          scheduledDate: '2026-11-02',
          type: CustomerLessonPackageClassType.BARTER,
        },
      ],
    });
    expect(manager.delete).toHaveBeenCalledWith(
      CustomerLessonPackageClassEntity,
      expect.objectContaining({
        packageId: 42,
        status: CustomerLessonPackageClassStatus.SCHEDULED,
      }),
    );
    expect(manager.save.mock.calls[0][0]).toEqual([
      expect.objectContaining({
        packageId: 42,
        customerId: 10,
        status: 'scheduled',
        type: 'regular',
      }),
      expect.objectContaining({
        packageId: 42,
        customerId: 10,
        status: 'scheduled',
        type: 'barter',
      }),
    ]);
    expect(manager.save.mock.calls[1][0]).toMatchObject({
      title: 'Novo título',
      totalLessons: 3,
      paidLessons: 2,
      totalAmount: 250,
    });
  });

  it('links newly added pending lessons to their pending entries', async () => {
    manager.find.mockResolvedValue([{ id: 8 }]);
    await service.update(42, {
      addClasses: [
        {
          scheduledDate: '2026-11-01',
          type: CustomerLessonPackageClassType.PENDING,
        },
      ],
    });
    expect(manager.update).toHaveBeenCalledWith(
      CustomerLessonPackagePendingClassEntity,
      8,
      expect.objectContaining({
        rescheduledClassId: 100,
        rescheduledDate: '2026-11-01',
      }),
    );
  });

  it('allows completion when removing the last scheduled class', async () => {
    await service.update(42, {
      status: CustomerLessonPackageStatus.FINISHED,
      removeClassIds: [1],
    });
    expect(manager.save.mock.calls[0][0]).toMatchObject({
      status: 'finished',
      totalLessons: 1,
    });
  });

  it('rejects completion when adding a scheduled class', async () => {
    await expect(
      service.update(42, {
        status: CustomerLessonPackageStatus.FINISHED,
        removeClassIds: [1],
        addClasses: [
          {
            scheduledDate: '2026-11-01',
            type: CustomerLessonPackageClassType.REGULAR,
          },
        ],
      }),
    ).rejects.toThrow(
      'Não é possível finalizar: o pacote ainda tem aulas programadas.',
    );
    expect(manager.save).not.toHaveBeenCalled();
    expect(manager.delete).not.toHaveBeenCalled();
  });

  it('does not add scheduled classes to an already finished package', async () => {
    lessonPackage.status = CustomerLessonPackageStatus.FINISHED;
    await expect(
      service.update(42, {
        addClasses: [
          {
            scheduledDate: '2026-11-01',
            type: CustomerLessonPackageClassType.REGULAR,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('aborts saving if a class cannot be deleted', async () => {
    manager.delete.mockResolvedValue({ affected: 0 });
    await expect(
      service.update(42, { removeClassIds: [1] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('returns not found for an unknown package', async () => {
    manager.findOne.mockResolvedValue(null);
    await expect(
      service.update(404, { addClasses: [] }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
