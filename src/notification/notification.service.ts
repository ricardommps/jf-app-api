import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomerService } from 'src/customer/customer.service';
import { NotificationEntity } from 'src/entities/notification.entity';
import { FirebaseService } from 'src/firebase/firebase.service';
import { UserService } from 'src/user/user.service';
import { UserType } from 'src/utils/user-type.enum';
import { Brackets, IsNull, Repository } from 'typeorm';

type NotificationLoginPayload = {
  userId: number;
  typeUser: number;
};

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(NotificationEntity)
    private notificationRepository: Repository<NotificationEntity>,

    private readonly customersService: CustomerService,

    private readonly firebaseService: FirebaseService,

    private readonly userService: UserService,
  ) {}

  private normalizeValue(value?: string | null) {
    return (value || '').trim().toLowerCase();
  }

  private async validateNotificationRecipient(notification: {
    recipientId?: number | null;
    recipientUserId?: number | null;
  }) {
    const hasRecipientId =
      notification.recipientId !== undefined &&
      notification.recipientId !== null;
    const hasRecipientUserId =
      notification.recipientUserId !== undefined &&
      notification.recipientUserId !== null;

    if (!hasRecipientId && !hasRecipientUserId) {
      throw new BadRequestException(
        'recipientId ou recipientUserId é obrigatório',
      );
    }

    if (hasRecipientId) {
      await this.customersService.findCustomerById(Number(notification.recipientId));
    }

    if (hasRecipientUserId) {
      const user = await this.userService.findById(
        Number(notification.recipientUserId),
      );

      if (!user) {
        throw new NotFoundException(
          `User id: ${notification.recipientUserId} not found`,
        );
      }
    }
  }

  private async resolveLegacyTeacherCustomerIds(userId: number) {
    const [teacherUser, teacherCustomers] = await Promise.all([
      this.userService.findById(userId),
      this.customersService.findCustomersByUserId(userId),
    ]);

    if (!teacherUser) {
      return [];
    }

    const normalizedTeacherEmail = this.normalizeValue(teacherUser.email);
    const normalizedTeacherName = this.normalizeValue(teacherUser.name);

    return teacherCustomers
      .filter((customer) => customer.active)
      .filter(
        (customer) =>
          this.normalizeValue(customer.email) === normalizedTeacherEmail ||
          this.normalizeValue(customer.name) === normalizedTeacherName,
      )
      .map((customer) => customer.id);
  }

  private async resolveNotificationAccess(loginPayload: NotificationLoginPayload) {
    if (loginPayload.typeUser === UserType.User) {
      return {
        recipientIds: [loginPayload.userId],
        recipientUserId: null,
      };
    }

    return {
      recipientIds: await this.resolveLegacyTeacherCustomerIds(
        loginPayload.userId,
      ),
      recipientUserId: loginPayload.userId,
    };
  }

  private async buildNotificationsQuery(
    loginPayload: NotificationLoginPayload,
    type?: string,
  ) {
    const { recipientIds, recipientUserId } =
      await this.resolveNotificationAccess(loginPayload);

    if (!recipientIds.length && !recipientUserId) {
      return null;
    }

    const query = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.read_at IS NULL')
      .andWhere(
        new Brackets((qb) => {
          if (recipientIds.length) {
            qb.where('notification.recipient_id IN (:...recipientIds)', {
              recipientIds,
            });
          }

          if (recipientUserId) {
            if (recipientIds.length) {
              qb.orWhere('notification.recipient_user_id = :recipientUserId', {
                recipientUserId,
              });
            } else {
              qb.where('notification.recipient_user_id = :recipientUserId', {
                recipientUserId,
              });
            }
          }
        }),
      );

    if (type) {
      query.andWhere('notification.type = :type', { type });
    }

    return query.orderBy('notification.created_at', 'DESC');
  }

  async getNotificationByRecipientId(
    loginPayload: NotificationLoginPayload,
  ): Promise<NotificationEntity[]> {
    try {
      const query = await this.buildNotificationsQuery(loginPayload);

      if (!query) {
        return [];
      }

      return query.getMany();
    } catch (error) {
      throw new Error(error);
    }
  }

  async getRunningFinishedAllNotifications(
    loginPayload: NotificationLoginPayload,
  ): Promise<NotificationEntity[]> {
    try {
      const query = await this.buildNotificationsQuery(
        loginPayload,
        'running-finished-all',
      );

      if (!query) {
        return [];
      }

      return query.getMany();
    } catch (error) {
      throw new Error(error);
    }
  }

  async createNotification(notification) {
    await this.validateNotificationRecipient(notification);

    return this.notificationRepository.save({
      ...notification,
      recipientId: notification.recipientId ?? null,
      recipientUserId: notification.recipientUserId ?? null,
    });
  }

  async sendNotification(notification) {
    if (!notification.recipientId) {
      throw new BadRequestException(
        'Push notification exige recipientId de customer',
      );
    }

    await this.validateNotificationRecipient(notification);

    const message = {
      title: notification.title,
      body: notification.content,
      data: {},
    };

    await this.firebaseService.sendNotificationNew(
      String(notification.recipientId),
      message,
    );

    return this.notificationRepository.save({
      ...notification,
      recipientUserId: null,
    });
  }

  async readAt(
    loginPayload: NotificationLoginPayload,
    notificationId: number,
  ) {
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

      const { recipientIds, recipientUserId } =
        await this.resolveNotificationAccess(loginPayload);

      const hasCustomerAccess =
        notification.recipientId !== null &&
        notification.recipientId !== undefined &&
        recipientIds.includes(notification.recipientId);

      const hasUserAccess =
        notification.recipientUserId !== null &&
        notification.recipientUserId !== undefined &&
        notification.recipientUserId === recipientUserId;

      if (!hasCustomerAccess && !hasUserAccess) {
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
