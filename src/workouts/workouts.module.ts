import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgramEntity } from 'src/entities/program.entity';
import { MusclesWorkedModule } from 'src/muscles-worked/muscles-worked.module';
import { MediaEntity } from '../entities/media.entity';
import { MediaInfoEntity } from '../entities/mediaInfo.entity';
import { WorkoutItemMediaEntity } from '../entities/workoutItemMedia.entity';
import { WorkoutItemEntity } from '../entities/workoutItens.entity';
import { WorkoutsEntity } from '../entities/workouts.entity';
import { WorkoutsController } from './workouts.comtroller';
import { WorkoutsService } from './workouts.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkoutsEntity,
      WorkoutItemEntity,
      MediaEntity,
      WorkoutItemMediaEntity,
      MediaInfoEntity,
      ProgramEntity,
    ]),
    MusclesWorkedModule,
  ],
  controllers: [WorkoutsController],
  providers: [WorkoutsService],
  exports: [WorkoutsService],
})
export class WorkoutsModule {}
