import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgramEntity } from '../entities/program.entity';
import { ProgramController } from './program.controller';
import { ProgramService } from './program.service';
@Module({
  imports: [TypeOrmModule.forFeature([ProgramEntity])],
  controllers: [ProgramController],
  providers: [ProgramService],
  exports: [ProgramService],
})
export class ProgramModule {}
