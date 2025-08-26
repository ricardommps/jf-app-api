import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerModule } from 'src/customer/customer.module';
import { NotificationEntity } from 'src/entities/notification.entity';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEntity]),
    CustomerModule,
    FirebaseModule,
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
