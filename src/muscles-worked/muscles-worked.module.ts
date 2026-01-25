// src/modules/muscles-worked/muscles-worked.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MusclesWorkedEntity } from 'src/entities/muscles-worked.entity';
import { MusclesWorkedController } from './muscles-worked.controller';
import { MusclesWorkedService } from './muscles-worked.service';

@Module({
  imports: [TypeOrmModule.forFeature([MusclesWorkedEntity])],
  controllers: [MusclesWorkedController],
  providers: [MusclesWorkedService],
  exports: [MusclesWorkedService],
})
export class MusclesWorkedModule {}
