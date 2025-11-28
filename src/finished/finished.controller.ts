import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { UserId } from 'src/decorators/user-id.decorator';
import { FinishedEntity } from 'src/entities/finished.entity';
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

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Get('history')
  async history(@UserId() userId: number) {
    return await this.finishedService.history(userId);
  }

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Get('getTrimp')
  async getTrimp(@UserId() userId: number) {
    return await this.finishedService.getTrimp(userId);
  }

  @Roles(UserType.Admin, UserType.Root)
  @Get('/unreviewedFinished')
  async getUnreviewedFinished() {
    return this.finishedService.getUnreviewedFinished();
  }

  @Roles(UserType.Admin, UserType.Root)
  @Put('/review/:customerId/:id')
  async reviewWorkout(
    @Body() reviewWorkoutDto,
    @Param('id') id: string,
    @Param('customerId') customerId: string,
  ): Promise<FinishedEntity> {
    const { feedback } = reviewWorkoutDto;
    return this.finishedService.reviewWorkout(customerId, Number(id), feedback);
  }

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Get('getVolumeByCustomer/:userId')
  async getVolumeByCustomer(
    @Param('userId') userId: string,
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

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Get('/:id')
  async findFinishedById(@UserId() userId: number, @Param('id') id: string) {
    return await this.finishedService.findFinishedById(userId, Number(id));
  }
}
