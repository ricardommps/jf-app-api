import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { UserId } from 'src/decorators/user-id.decorator';
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

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Get('getVolume')
  async getVolume(
    @UserId() userId: number,
    @Query('programId') programId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return await this.finishedService.getVolume(
      Number(userId),
      Number(programId),
      startDate,
      endDate,
    );
  }
}
