import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { CustomerModule } from './customer/customer.module';
import { FinishedModule } from './finished/finished.module';
import { RolesGuard } from './guards/roles.guard';
import { InvoiceModule } from './invoice/invoice.module';
import { MediaModule } from './media/media.module';
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
    TypeOrmModule.forRoot({
      type: 'postgres',
      database: process.env.DB_DATABASE,
      host: process.env.DB_HOST,
      password: process.env.DB_PASSWORD,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      entities: [`${__dirname}/**/*.entity{.js,.ts}`],
      migrations: [`${__dirname}/migration/{.ts,*.js}`],
      migrationsRun: false,
      ssl: true,
      // ssl: {
      //   rejectUnauthorized: false,
      // },
    }),
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
