import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinishedEntity } from 'src/entities/finished.entity';
import { WorkoutEntity } from 'src/entities/workouts.entity';
import { FinishedController } from './finished.controller';
import { FinishedService } from './finished.service';
@Module({
  imports: [TypeOrmModule.forFeature([FinishedEntity, WorkoutEntity])],
  controllers: [FinishedController],
  providers: [FinishedService],
  exports: [FinishedService],
})
export class FinishedModule {}
