import { Body, Controller, Param, Post } from '@nestjs/common';
import { Roles } from '../decorators/roles.decorator';
import { UserType } from '../utils/user-type.enum';
import { FirebaseService } from './firebase.service';

@Controller('firebase')
export class FirebaseController {
  constructor(private readonly firebaseService: FirebaseService) {}

  @Roles(UserType.Admin, UserType.Root)
  @Post('sendNotificationNew/:customerId')
  async loginCustomer(@Param('customerId') customerId, @Body() messages: any) {
    return this.firebaseService.sendNotificationNew(customerId, messages);
  }
}
