import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaEntity } from '../entities/media.entity';
import { MediaInfoEntity } from '../entities/mediaInfo.entity';
import { WorkoutItemMediaEntity } from '../entities/workoutItemMedia.entity';
import { WorkoutItemEntity } from '../entities/workoutItens.entity';
import { WorkoutEntity } from '../entities/workouts.entity';
import { WorkoutsController } from './workouts.comtroller';
import { WorkoutsService } from './workouts.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkoutEntity,
      WorkoutItemEntity,
      MediaEntity,
      WorkoutItemMediaEntity,
      MediaInfoEntity,
    ]),
  ],
  controllers: [WorkoutsController],
  providers: [WorkoutsService],
  exports: [WorkoutsService],
})
export class WorkoutsModule {}
