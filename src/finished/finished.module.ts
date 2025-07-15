import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgramEntity } from 'src/entities/program.entity';
import { FinishedEntity } from '../entities/finished.entity';
import { WorkoutsEntity } from '../entities/workouts.entity';
import { FinishedController } from './finished.controller';
import { FinishedService } from './finished.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([FinishedEntity, WorkoutsEntity, ProgramEntity]),
  ],
  controllers: [FinishedController],
  providers: [FinishedService],
  exports: [FinishedService],
})
export class FinishedModule {}
