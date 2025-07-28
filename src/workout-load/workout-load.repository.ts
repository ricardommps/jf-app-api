import { WorkoutLoadEntity } from 'src/entities/workoutLoad.entity';
import { DataSource, Repository } from 'typeorm';

export class WorkoutLoadRepository extends Repository<WorkoutLoadEntity> {
  constructor(dataSource: DataSource) {
    super(WorkoutLoadEntity, dataSource.manager);
  }

  async findByCustomerAndMedia(
    customerId: number,
    mediaId: number,
  ): Promise<WorkoutLoadEntity[]> {
    return this.createQueryBuilder('workout_load')
      .where('workout_load.customer_id = :customerId', { customerId })
      .andWhere('workout_load.media_id = :mediaId', { mediaId })
      .orderBy('workout_load.created_at', 'DESC')
      .getMany();
  }
}
