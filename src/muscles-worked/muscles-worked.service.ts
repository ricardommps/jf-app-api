import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MusclesWorkedEntity } from '../entities/muscles-worked.entity';
import { SaveMusclesWorked } from '../types/muscles-worked.type';

@Injectable()
export class MusclesWorkedService {
  constructor(
    @InjectRepository(MusclesWorkedEntity)
    private readonly repository: Repository<MusclesWorkedEntity>,
  ) {}

  async save(data: SaveMusclesWorked): Promise<MusclesWorkedEntity> {
    const existing = await this.repository.findOne({
      where: { mediaId: data.mediaId },
    });

    if (existing) {
      existing.musclesId = data.musclesId;
      return this.repository.save(existing);
    }

    const entity = this.repository.create({
      mediaId: data.mediaId,
      musclesId: data.musclesId,
    });

    return this.repository.save(entity);
  }

  async update(
    mediaId: number,
    musclesId: number[],
  ): Promise<MusclesWorkedEntity> {
    const existing = await this.repository.findOne({
      where: { mediaId },
    });

    if (!existing) {
      throw new NotFoundException('MusclesWorked not found');
    }

    existing.musclesId = musclesId;
    return this.repository.save(existing);
  }

  async delete(mediaId: number): Promise<void> {
    const result = await this.repository.delete({ mediaId });

    if (!result.affected) {
      throw new NotFoundException('MusclesWorked not found');
    }
  }

  async findByMediaId(mediaId: number): Promise<MusclesWorkedEntity | null> {
    return this.repository.findOne({
      where: { mediaId },
    });
  }

  async findByMediaIds(mediaIds: number[]): Promise<MusclesWorkedEntity[]> {
    if (!mediaIds.length) return [];

    return this.repository
      .createQueryBuilder('mw')
      .where('mw.mediaId IN (:...mediaIds)', { mediaIds })
      .getMany();
  }
}
