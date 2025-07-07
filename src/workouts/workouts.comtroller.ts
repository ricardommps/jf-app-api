import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Roles } from 'src/decorators/roles.decorator';
import { WorkoutEntity } from 'src/entities/workouts.entity';
import { UserType } from 'src/utils/user-type.enum';
import { WorkoutsService, WorkoutWithGroupedMedias } from './workouts.service';

@Controller('workouts')
export class WorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  @Roles(UserType.Admin, UserType.Root)
  @Post()
  async createWorkout(@Body() workout): Promise<WorkoutWithGroupedMedias> {
    return this.workoutsService.createWorkout(workout);
  }

  @Roles(UserType.Admin, UserType.Root)
  @Put()
  async updateWorkout(
    @Body() workout,
    @Query('workoutId') workoutId: string,
  ): Promise<WorkoutWithGroupedMedias> {
    return this.workoutsService.updateWorkout(workoutId, workout);
  }

  @Roles(UserType.Admin, UserType.Root)
  @Delete('')
  async deleteWorkout(
    @Query('workoutId') workoutId: string,
  ): Promise<WorkoutEntity> {
    return this.workoutsService.deleteWorkout(workoutId);
  }

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Get('list')
  async getWorkoutsByProgramId(
    @Query('programId') programId: number,
    @Query('running') running?: boolean,
  ): Promise<WorkoutEntity[]> {
    const workouts = await this.workoutsService.getWorkoutsByProgramIdSimple(
      programId,
      running,
    );
    return workouts.map((program) => program);
  }

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Get('workout')
  async getWorkoutById(@Query('id') id: string): Promise<WorkoutEntity> {
    const workouts = await this.workoutsService.getWorkoutById(id);
    return workouts;
  }
}
