import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaEntity } from 'src/entities/media.entity';
import { MediaInfoEntity } from 'src/entities/mediaInfo.entity';
import { WorkoutItemMediaEntity } from 'src/entities/workoutItemMedia.entity';
import { WorkoutItemEntity } from 'src/entities/workoutItens.entity';
import { WorkoutEntity } from 'src/entities/workouts.entity';
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
