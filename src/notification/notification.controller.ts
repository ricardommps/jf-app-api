import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UnauthorizedException,
} from '@nestjs/common';
import { NotificationEntity } from 'src/entities/notification.entity';
import { Roles } from '../decorators/roles.decorator';
import { UserMe } from '../decorators/user-id.decorator';
import { UserType } from '../utils/user-type.enum';
import {
  CreateNotificationV2Payload,
  NotificationV2Item,
  ReadNotificationsV2Payload,
  UpdateNotificationV2Payload,
} from './notification-v2.types';
import { NotificationService } from './notification.service';

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Roles(UserType.Admin)
  @Post('/send')
  async sendNotification(@Body() notifications) {
    return this.notificationService.sendNotification(notifications);
  }

  @Roles(UserType.Admin)
  @Post('/v2/send')
  async sendNotificationV2(
    @Body() notification: CreateNotificationV2Payload,
  ): Promise<NotificationV2Item> {
    return this.notificationService.sendNotificationV2(notification);
  }

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Get()
  async getNotificationByRecipientId(
    @UserMe() loginPayload: { userId: number; typeUser: number },
  ): Promise<NotificationEntity[]> {
    if (!loginPayload?.userId) {
      throw new UnauthorizedException('User ID is required');
    }

    return this.notificationService.getNotificationByRecipientId(loginPayload);
  }

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Get('/v2')
  async getNotificationByRecipientIdV2(
    @UserMe() loginPayload: { userId: number; typeUser: number },
  ): Promise<NotificationV2Item[]> {
    if (!loginPayload?.userId) {
      throw new UnauthorizedException('User ID is required');
    }

    return this.notificationService.getNotificationByRecipientIdV2(
      loginPayload,
    );
  }

  @Roles(UserType.Admin)
  @Get('/v2/all/:customerId')
  async getNotificationsByCustomerIdV2(
    @Param('customerId') customerId: number,
  ): Promise<NotificationV2Item[]> {
    return this.notificationService.getNotificationsByCustomerIdV2(customerId);
  }

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Get('/running-finished-all')
  async getRunningFinishedAllNotifications(
    @UserMe() loginPayload: { userId: number; typeUser: number },
  ): Promise<NotificationEntity[]> {
    if (!loginPayload?.userId) {
      throw new UnauthorizedException('User ID is required');
    }

    return this.notificationService.getRunningFinishedAllNotifications(
      loginPayload,
    );
  }

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Get('/v2/running-finished-all')
  async getRunningFinishedAllNotificationsV2(
    @UserMe() loginPayload: { userId: number; typeUser: number },
  ): Promise<NotificationV2Item[]> {
    if (!loginPayload?.userId) {
      throw new UnauthorizedException('User ID is required');
    }

    return this.notificationService.getRunningFinishedAllNotificationsV2(
      loginPayload,
    );
  }

  @Roles(UserType.User)
  @Get('/v2/unread-count')
  async getUnreadCount(
    @UserMe() loginPayload: { userId: number; typeUser: number },
  ): Promise<{ count: number }> {
    if (!loginPayload?.userId) {
      throw new UnauthorizedException('User ID is required');
    }

    return this.notificationService.getUnreadCount(loginPayload);
  }

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Get('/readAt/:notificationId')
  async readAt(
    @UserMe() loginPayload: { userId: number; typeUser: number },
    @Param('notificationId') notificationId: number,
  ): Promise<NotificationEntity> {
    return this.notificationService.readAt(loginPayload, notificationId);
  }

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Get('/v2/readAt/:notificationId')
  async readAtV2(
    @UserMe() loginPayload: { userId: number; typeUser: number },
    @Param('notificationId') notificationId: number,
  ): Promise<NotificationV2Item> {
    return this.notificationService.readAtV2(loginPayload, notificationId);
  }

  @Roles(UserType.Admin)
  @Get('/v2/:notificationId')
  async getNotificationByIdV2(
    @Param('notificationId') notificationId: number,
  ): Promise<NotificationV2Item> {
    return this.notificationService.getNotificationByIdV2(notificationId);
  }

  @Roles(UserType.Admin)
  @Put('/v2/:notificationId')
  async updateNotificationV2(
    @Param('notificationId') notificationId: number,
    @Body() notification: UpdateNotificationV2Payload,
  ): Promise<NotificationV2Item> {
    return this.notificationService.updateNotificationV2(
      notificationId,
      notification,
    );
  }

  @Roles(UserType.Admin)
  @Delete('/v2/:notificationId')
  async deleteNotificationV2(
    @Param('notificationId') notificationId: number,
  ): Promise<NotificationV2Item> {
    return this.notificationService.deleteNotificationV2(notificationId);
  }

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Put('/v2/readAt')
  async readManyAtV2(
    @UserMe() loginPayload: { userId: number; typeUser: number },
    @Body() payload: ReadNotificationsV2Payload,
  ): Promise<NotificationV2Item[]> {
    return this.notificationService.readManyAtV2(
      loginPayload,
      payload.notificationIds,
    );
  }
}
