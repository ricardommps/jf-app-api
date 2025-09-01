import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomerService } from 'src/customer/customer.service';
import { NotificationEntity } from 'src/entities/notification.entity';
import { FirebaseService } from 'src/firebase/firebase.service';
import { IsNull, Repository } from 'typeorm';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(NotificationEntity)
    private notificationRepository: Repository<NotificationEntity>,

    private readonly customersService: CustomerService,

    private readonly firebaseService: FirebaseService,
  ) {}

  async getNotificationByRecipientId(
    recipientId: number,
  ): Promise<NotificationEntity[]> {
    try {
      const notifications = await this.notificationRepository.find({
        where: {
          recipientId,
          readAt: IsNull(),
        },
        order: { createdAt: 'DESC' },
      });
      return notifications;
    } catch (error) {
      throw new Error(error);
    }
  }

  async createNotification(notification) {
    await this.customersService.findCustomerById(notification.recipientId);
    return this.notificationRepository.save({
      ...notification,
    });
  }

  async sendNotification(notification) {
    await this.customersService.findCustomerById(notification.recipientId);
    const message = {
      title: notification.title,
      body: notification.content,
      data: {},
    };
    await this.firebaseService.sendNotificationNew(
      notification.recipientId,
      message,
    );
    return this.notificationRepository.save({
      ...notification,
    });
  }

  async readAt(recipientId: number, notificationId: number) {
    try {
      const notification = await this.notificationRepository.findOne({
        where: {
          id: notificationId,
        },
      });
      if (!notification) {
        throw new NotFoundException(
          `Notification id: ${notificationId} not found`,
        );
      }

      if (notification.recipientId !== recipientId) {
        throw new UnauthorizedException();
      }
      notification.readAt = new Date();
      return this.notificationRepository.save({
        ...notification,
      });
    } catch (error) {
      throw new Error(error);
    }
  }
}
