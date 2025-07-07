import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MediaEntity } from 'src/entities/media.entity';
import { Repository } from 'typeorm';

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
}
