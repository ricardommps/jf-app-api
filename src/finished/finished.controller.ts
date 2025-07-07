import { Body, Controller, Post } from '@nestjs/common';
import { Roles } from '../decorators/roles.decorator';
import { UserType } from '../utils/user-type.enum';
import { FinishedService } from './finished.service';

@Controller('finished')
export class FinishedController {
  constructor(private readonly finishedService: FinishedService) {}

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Post()
  async createFinished(@Body() payload) {
    return this.finishedService.createFinished(payload);
  }
}
