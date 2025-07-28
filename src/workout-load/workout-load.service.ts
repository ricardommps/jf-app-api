import { Injectable } from '@nestjs/common';
import { CustomerEntity } from 'src/entities/customer.entity';
import { MediaEntity } from 'src/entities/media.entity';
import { WorkoutLoadEntity } from 'src/entities/workoutLoad.entity';
import { DataSource } from 'typeorm';
import { WorkoutLoadRepository } from './workout-load.repository';

@Injectable()
export class WorkoutLoadService {
  private workoutLoadRepository: WorkoutLoadRepository;

  constructor(private readonly dataSource: DataSource) {
    this.workoutLoadRepository = new WorkoutLoadRepository(dataSource);
  }

  async getWorkoutLoadsByCustomerAndMedia(
    customerId: number,
    mediaId: number,
  ): Promise<WorkoutLoadEntity[]> {
    console.log('=getWorkoutLoadsByCustomerAndMedia===', {
      customerId,
      mediaId,
    });
    const workoutLoad = this.workoutLoadRepository.findByCustomerAndMedia(
      customerId,
      mediaId,
    );
    console.log('--workoutLoad-', workoutLoad);
    return workoutLoad;
  }

  async createWorkoutLoad(
    customerId: number,
    mediaId: string,
    load: string,
  ): Promise<WorkoutLoadEntity> {
    const customer = await this.dataSource
      .getRepository(CustomerEntity)
      .findOne({ where: { id: customerId } });
    const media = await this.dataSource
      .getRepository(MediaEntity)
      .findOne({ where: { id: mediaId } });

    if (!customer || !media) {
      throw new Error('Customer or Media not found');
    }

    const workoutLoad = this.workoutLoadRepository.create({
      customer,
      media,
      load,
    });

    return this.workoutLoadRepository.save(workoutLoad);
  }
}
