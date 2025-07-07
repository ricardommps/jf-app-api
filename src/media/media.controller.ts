import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../decorators/roles.decorator';
import { UserId } from '../decorators/user-id.decorator';
import { MediaEntity } from '../entities/media.entity';
import { UserType } from '../utils/user-type.enum';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Roles(UserType.Admin, UserType.Root)
  @Get()
  async getMedias(@UserId() userId: number): Promise<MediaEntity[]> {
    if (!userId) {
      throw new UnauthorizedException('User ID is required');
    }

    return this.mediaService.getMedias(userId.toString());
  }
}
