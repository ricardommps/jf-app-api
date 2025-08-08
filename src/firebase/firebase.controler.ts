import { Controller, Get, Param } from '@nestjs/common';
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
}
