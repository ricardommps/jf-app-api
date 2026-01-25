import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppDataSource } from './data-source';

import { AuthModule } from './auth/auth.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { CustomerModule } from './customer/customer.module';
import { DeviceInfoModule } from './device-info/device-info.module';
import { FinishedModule } from './finished/finished.module';
import { FirebaseModule } from './firebase/firebase.module';
import { RolesGuard } from './guards/roles.guard';
import { InvoiceModule } from './invoice/invoice.module';
import { MediaModule } from './media/media.module';
import { MusclesWorkedModule } from './muscles-worked/muscles-worked.module';
import { NotificationModule } from './notification/notification.module';
import { ProgramModule } from './program/program.module';
import { UserModule } from './user/user.module';
import { WorkoutLoadModule } from './workout-load/workout-load.module';
import { WorkoutsModule } from './workouts/workouts.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env.development.local'],
    }),
    TypeOrmModule.forRoot(AppDataSource.options),
    JwtModule,
    UserModule,
    AuthModule,
    CustomerModule,
    ProgramModule,
    MediaModule,
    WorkoutsModule,
    FinishedModule,
    WorkoutLoadModule,
    NotificationModule,
    InvoiceModule,
    FirebaseModule,
    CloudinaryModule,
    DeviceInfoModule,
    MusclesWorkedModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
