import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { NotificationType } from 'src/types/notification.type';
import { Roles } from '../decorators/roles.decorator';
import { UserType } from '../utils/user-type.enum';
import { FirebaseService } from './firebase.service';

@Controller('firebase')
export class FirebaseController {
  constructor(private readonly firebaseService: FirebaseService) {}

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Get('sendNotification/:customerId')
  async sendNotification(@Param('customerId') customerId) {
    return await this.firebaseService.sendNotification(customerId);
  }

  @Roles(UserType.Admin, UserType.Root)
  @Post('sendNotificationNew/:customerId')
  async loginCustomer(
    @Param('customerId') customerId,
    @Body() messages: NotificationType,
  ) {
    return this.firebaseService.sendNotificationNew(customerId, messages);
  }
}
