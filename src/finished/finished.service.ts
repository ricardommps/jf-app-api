import { InjectRepository } from '@nestjs/typeorm';
import { FinishedEntity } from 'src/entities/finished.entity';
import { WorkoutEntity } from 'src/entities/workouts.entity';
import { Repository } from 'typeorm';

export class FinishedService {
  constructor(
    @InjectRepository(FinishedEntity)
    private finishedRepository: Repository<FinishedEntity>,

    @InjectRepository(WorkoutEntity)
    private readonly workoutRepository: Repository<WorkoutEntity>,
  ) {}

  async createFinished(payload) {
    try {
      const workout = await this.workoutRepository.findOne({
        where: { id: payload.workoutsId },
      });

      workout.finished = true;
      workout.unrealized = payload.unrealized;
      await this.workoutRepository.save(workout);
      return this.finishedRepository.save({
        ...payload,
      });
    } catch (error) {
      throw error;
    }
  }
}
