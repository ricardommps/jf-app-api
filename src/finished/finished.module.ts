import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinishedEntity } from '../entities/finished.entity';
import { WorkoutEntity } from '../entities/workouts.entity';
import { FinishedController } from './finished.controller';
import { FinishedService } from './finished.service';
@Module({
  imports: [TypeOrmModule.forFeature([FinishedEntity, WorkoutEntity])],
  controllers: [FinishedController],
  providers: [FinishedService],
  exports: [FinishedService],
})
export class FinishedModule {}
