import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MusclesWorkedEntity } from 'src/entities/muscles-worked.entity';
import { Repository } from 'typeorm';
import { MediaEntity } from '../entities/media.entity';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(MediaEntity)
    private mediaRepository: Repository<MediaEntity>,
  ) {}

  async getMedias(userId: string): Promise<MediaEntity[]> {
    try {
      const medias = await this.mediaRepository.find({
        where: {
          userId,
        },
        order: { createdAt: 'DESC' },
      });
      return medias;
    } catch (error) {
      throw new Error(error);
    }
  }

  async getMediasMusclesWorked(userId: string) {
    const rows = await this.mediaRepository
      .createQueryBuilder('media')
      .leftJoin(MusclesWorkedEntity, 'mw', 'mw.media_id = media.id')
      .where('media.user_id = :userId', { userId })
      .orderBy('media.created_at', 'DESC')
      .select([
        'media.id AS media_id',
        'media.user_id AS media_userid',
        'media.title AS media_title',
        'media.thumbnail AS media_thumbnail',
        'media.video_url AS media_videourl',
        'media.instrucctions AS media_instrucctions',
        'media.created_at AS media_createdat',
        'media.updated_at AS media_updatedat',

        'mw.id AS mw_id',
        'mw.media_id AS mw_mediaid',
        'mw."musclesId" AS mw_musclesid',
      ])
      .getRawMany();

    return rows.map((result) => ({
      id: result.media_id,
      userId: result.media_userid,
      title: result.media_title,
      thumbnail: result.media_thumbnail,
      videoUrl: result.media_videourl,
      instrucctions: result.media_instrucctions,
      createdAt: result.media_createdat,
      updatedAt: result.media_updatedat,
      musclesWorked: result.mw_id
        ? {
            id: result.mw_id,
            mediaId: result.mw_mediaid, // ✅ lowercase
            musclesId: result.mw_musclesid, // ✅ lowercase
          }
        : null,
    }));
  }
}
