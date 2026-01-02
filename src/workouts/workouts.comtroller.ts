import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Roles } from '../decorators/roles.decorator';
import { WorkoutsEntity } from '../entities/workouts.entity';
import { UserType } from '../utils/user-type.enum';
import { WorkoutsService, WorkoutWithGroupedMedias } from './workouts.service';

@Controller('workouts')
export class WorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  @Roles(UserType.Admin, UserType.Root)
  @Post()
  async createWorkout(@Body() workout): Promise<WorkoutWithGroupedMedias> {
    return this.workoutsService.createWorkout(workout);
  }

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Post('createRunningRaces')
  async createRunningRaces(@Body() workout): Promise<WorkoutWithGroupedMedias> {
    return this.workoutsService.createWorkout(workout);
  }

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Put('updateRunningRaces')
  async updateRunningRaces(
    @Body() workout,
    @Query('workoutId') workoutId: string,
  ): Promise<WorkoutWithGroupedMedias> {
    return this.workoutsService.updateWorkout(workoutId, workout);
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
  ): Promise<WorkoutsEntity> {
    return this.workoutsService.deleteWorkout(workoutId);
  }

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Delete('deleteRunningRaces')
  async deleteRunningRaces(
    @Query('workoutId') workoutId: string,
  ): Promise<WorkoutsEntity> {
    return this.workoutsService.deleteWorkout(workoutId);
  }

  @Roles(UserType.Admin, UserType.Root)
  @Get('clone')
  async cloneWorkout(
    @Query('workoutId') workoutId: string,
    @Query('qnt') qnt: string,
  ) {
    return this.workoutsService.cloneWorkout(workoutId, Number(qnt));
  }

  @Roles(UserType.Admin, UserType.Root)
  @Get('send')
  async sendWorkout(
    @Query('workoutId') workoutId: string,
    @Query('programsId') programsId: string,
  ) {
    const ids = programsId.split(',').map((id) => id.trim());
    return this.workoutsService.sendWorkout(workoutId, ids);
  }

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Get('list')
  async getWorkoutsByProgramId(
    @Query('programId') programId: number,
    @Query('running') running?: boolean,
    @Query('published') published?: boolean,
  ): Promise<WorkoutsEntity[]> {
    const workouts = await this.workoutsService.getWorkoutsByProgramIdSimple(
      programId,
      running,
      published,
    );
    return workouts.map((program) => program);
  }

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Get('list/admin')
  async getWorkoutsByProgramIdAdmin(
    @Query('programId') programId: number,
    @Query('running') running?: boolean,
    @Query('published') published?: boolean,
  ): Promise<WorkoutsEntity[]> {
    const workouts =
      await this.workoutsService.getWorkoutsByProgramIdSimpleAdmin(
        programId,
        running,
        published,
      );
    return workouts.map((program) => program);
  }

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Get('runningRaces')
  async getWorkoutRunningRaces(
    @Query('programId') programId: number,
  ): Promise<WorkoutsEntity[]> {
    const workouts =
      await this.workoutsService.getWorkoutRunningRaces(programId);
    return workouts.map((program) => program);
  }

  //getWorkoutRunningRaces

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Get('workout')
  async getWorkoutById(@Query('id') id: string): Promise<WorkoutsEntity> {
    const workouts = await this.workoutsService.getWorkoutById(id);
    return workouts;
  }
}
