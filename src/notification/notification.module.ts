import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerModule } from 'src/customer/customer.module';
import { CommentEntity } from 'src/entities/comment.entity';
import { FinishedEntity } from 'src/entities/finished.entity';
import { InvoiceEntity } from 'src/entities/invoice.entity';
import { NotificationEntity } from 'src/entities/notification.entity';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { UserModule } from 'src/user/user.module';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationEntity,
      FinishedEntity,
      CommentEntity,
      InvoiceEntity,
    ]),
    CustomerModule,
    FirebaseModule,
    UserModule,
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
