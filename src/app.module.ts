import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppDataSource } from './data-source';

import { AuthModule } from './auth/auth.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { CommentModule } from './comment/comment.module';
import { CustomerModule } from './customer/customer.module';
import { DeviceInfoModule } from './device-info/device-info.module';
import { FinishedModule } from './finished/finished.module';
import { FirebaseModule } from './firebase/firebase.module';
import { InvoiceModule } from './invoice/invoice.module';
import { MediaModule } from './media/media.module';
import { MusclesWorkedModule } from './muscles-worked/muscles-worked.module';
import { NotificationModule } from './notification/notification.module';
import { ProgramModule } from './program/program.module';
import { StravaModule } from './strava/strava.module';
import { UserModule } from './user/user.module';
import { WorkoutLoadModule } from './workout-load/workout-load.module';
import { WorkoutsModule } from './workouts/workouts.module';

import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    // 🔹 Environment variables
    ConfigModule.forRoot({
      envFilePath: ['.env.development.local'],
      isGlobal: true,
    }),

    // 🔹 Database
    TypeOrmModule.forRoot(AppDataSource.options),

    // 🔹 JWT (necessário para o RolesGuard)
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      global: true,
    }),

    // 🔹 Application modules
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
    CommentModule,
    StravaModule,
  ],

  providers: [
    // 🔥 Guard global para roles + JWT
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
