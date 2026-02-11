import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MediaEntity } from 'src/entities/media.entity';
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
    const item = await this.repository.findOne({
      where: { mediaId },
    });
    return item;
  }

  async findByMediaIdNew(mediaId: string) {
    const result = await this.repository.manager
      .getRepository(MediaEntity)
      .createQueryBuilder('media')
      .leftJoin(MusclesWorkedEntity, 'mw', 'mw.media_id = media.id')
      .where('media.id = :mediaId', { mediaId })
      .select([
        'media.id AS media_id',
        'media.userId AS media_userId',
        'media.title AS media_title',
        'media.thumbnail AS media_thumbnail',
        'media.videoUrl AS media_videoUrl',
        'media.instrucctions AS media_instrucctions',
        'media.createdAt AS media_createdAt',
        'media.updatedAt AS media_updatedAt',

        'mw.id AS mw_id',
        'mw.media_id AS mw_mediaId',
        'mw."musclesId" AS mw_musclesId', // 👈 AQUI
      ])
      .getRawOne();
    if (!result) return null;

    return {
      id: result.media_id,
      userId: result.media_userid, // 👈 lowercase
      title: result.media_title,
      thumbnail: result.media_thumbnail,
      videoUrl: result.media_videourl,
      instrucctions: result.media_instrucctions,
      createdAt: result.media_createdat,
      updatedAt: result.media_updatedat,
      musclesWorked: result.mw_id
        ? {
            id: result.mw_id,
            mediaId: result.mw_mediaid, // 👈 lowercase
            musclesId: result.mw_musclesid, // 👈 lowercase
          }
        : null,
    };
  }

  async findByMediaIds(mediaIds: number[]): Promise<MusclesWorkedEntity[]> {
    if (!mediaIds.length) return [];

    return this.repository
      .createQueryBuilder('mw')
      .where('mw.mediaId IN (:...mediaIds)', { mediaIds })
      .getMany();
  }
}
