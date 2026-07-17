import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { NotificationEntity } from 'src/entities/notification.entity';
import { Roles } from '../decorators/roles.decorator';
import { UserMe } from '../decorators/user-id.decorator';
import { UserType } from '../utils/user-type.enum';
import { NotificationService } from './notification.service';

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Roles(UserType.Admin)
  @Post('/send')
  async sendNotification(@Body() notifications) {
    return this.notificationService.sendNotification(notifications);
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
  @Get('/readAt/:notificationId')
  async readAt(
    @UserMe() loginPayload: { userId: number; typeUser: number },
    @Param('notificationId') notificationId: number,
  ): Promise<NotificationEntity> {
    return this.notificationService.readAt(loginPayload, notificationId);
  }
}
