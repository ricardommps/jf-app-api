import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkoutLoadEntity } from 'src/entities/workoutLoad.entity';
import { UserModule } from 'src/user/user.module';
import { WorkoutLoadController } from './workout-load.controller';
import { WorkoutLoadService } from './workout-load.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkoutLoadEntity]),
    forwardRef(() => UserModule),
  ],
  controllers: [WorkoutLoadController],
  providers: [WorkoutLoadService],
  exports: [WorkoutLoadService],
})
export class WorkoutLoadModule {}
