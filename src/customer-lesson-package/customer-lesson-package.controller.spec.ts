import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { RolesGuard } from '../guards/roles.guard';
import { UserType } from '../utils/user-type.enum';
import { CustomerLessonPackageController } from './customer-lesson-package.controller';
import { CustomerLessonPackageService } from './customer-lesson-package.service';

jest.mock('./customer-lesson-package.service', () => ({
  CustomerLessonPackageService: class {},
}));

describe('Student lesson package access', () => {
  let app: INestApplication;
  let jwt: JwtService;
  const previousSecret = process.env.JWT_SECRET;
  const findByCustomerId = jest.fn();

  beforeAll(async () => {
    process.env.JWT_SECRET = 'lesson-package-test-secret';
    const module = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: process.env.JWT_SECRET })],
      controllers: [CustomerLessonPackageController],
      providers: [
        {
          provide: CustomerLessonPackageService,
          useValue: { findByCustomerId },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    jwt = module.get(JwtService);
    app.useGlobalGuards(new RolesGuard(module.get(Reflector), jwt));
    app.setGlobalPrefix('api/v2');
    await app.init();
    await app.listen(0, '127.0.0.1');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    findByCustomerId.mockResolvedValue([]);
  });

  afterAll(async () => {
    await app.close();
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  const endpoint = '/api/v2/customer-lesson-packages/my-packages';

  it('uses only the authenticated student and returns every package status', async () => {
    const packages = ['active', 'paused', 'finished'].map((status, index) => ({
      id: index + 1,
      customerId: 7,
      status,
      classes: [],
    }));
    findByCustomerId.mockResolvedValue(packages);
    const token = jwt.sign({ userId: 7, typeUser: UserType.User });
    const response = await request(app.getHttpServer())
      .get(`${endpoint}?customerId=999`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual(packages);
    expect(findByCustomerId).toHaveBeenCalledWith(7);
  });

  it('returns an empty list when the student has no packages', async () => {
    const token = jwt.sign({ userId: 7, typeUser: UserType.User });
    await request(app.getHttpServer())
      .get(endpoint)
      .set('Authorization', token)
      .expect(200, []);
  });

  it.each([undefined, 'invalid-token'])(
    'rejects missing or invalid credentials: %s',
    async (token) => {
      const call = request(app.getHttpServer()).get(endpoint);
      if (token) call.set('Authorization', token);
      await call.expect(403);
      expect(findByCustomerId).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, 0, -1, '7'])(
    'rejects invalid student IDs in signed tokens: %s',
    async (userId) => {
      const token = jwt.sign({ userId, typeUser: UserType.User });
      await request(app.getHttpServer())
        .get(endpoint)
        .set('Authorization', token)
        .expect(401);
      expect(findByCustomerId).not.toHaveBeenCalled();
    },
  );

  it('does not grant students access to the administrative endpoints', async () => {
    const token = jwt.sign({ userId: 7, typeUser: UserType.User });
    for (const path of ['customer/999', '999', 'expiring']) {
      await request(app.getHttpServer())
        .get(`/api/v2/customer-lesson-packages/${path}`)
        .set('Authorization', token)
        .expect(403);
    }
    expect(findByCustomerId).not.toHaveBeenCalled();
  });

  it('rejects staff tokens on the student-specific endpoint', async () => {
    const token = jwt.sign({ userId: 7, typeUser: UserType.Admin });
    await request(app.getHttpServer())
      .get(endpoint)
      .set('Authorization', token)
      .expect(403);
    expect(findByCustomerId).not.toHaveBeenCalled();
  });
});
