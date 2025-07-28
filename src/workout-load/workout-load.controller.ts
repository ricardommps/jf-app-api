import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Roles } from 'src/decorators/roles.decorator';
import { UserId } from 'src/decorators/user-id.decorator';
import { WorkoutLoadEntity } from 'src/entities/workoutLoad.entity';
import { UserType } from 'src/utils/user-type.enum';
import { WorkoutLoadService } from './workout-load.service';

@Controller('workout-load')
export class WorkoutLoadController {
  constructor(private readonly workoutLoadService: WorkoutLoadService) {}

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Get('/:mediaId')
  async getWorkoutLoads(
    @UserId() userId: number,
    @Param('mediaId') mediaId: number,
  ): Promise<WorkoutLoadEntity[]> {
    return this.workoutLoadService.getWorkoutLoadsByCustomerAndMedia(
      userId,
      mediaId,
    );
  }

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Post('/:mediaId')
  async createWorkoutLoad(
    @UserId() userId: number,
    @Param('mediaId') mediaId: string,
    @Body('load') load: string,
  ): Promise<WorkoutLoadEntity> {
    return this.workoutLoadService.createWorkoutLoad(userId, mediaId, load);
  }
}
