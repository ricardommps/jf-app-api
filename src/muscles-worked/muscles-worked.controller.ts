import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { Roles } from 'src/decorators/roles.decorator';
import { SaveMusclesWorked } from 'src/types/muscles-worked.type';
import { UserType } from 'src/utils/user-type.enum';
import { MusclesWorkedService } from './muscles-worked.service';

@Controller('muscles-worked')
export class MusclesWorkedController {
  constructor(private readonly service: MusclesWorkedService) {}

  @Roles(UserType.Admin, UserType.Root)
  @Post()
  save(@Body() payload: SaveMusclesWorked) {
    return this.service.save(payload);
  }

  @Roles(UserType.Admin, UserType.Root)
  @Get('/getMedia/:mediaId')
  findByMediaNewMedia(@Param('mediaId') mediaId: string) {
    return this.service.findByMediaIdNew(mediaId);
  }

  @Roles(UserType.Admin, UserType.Root)
  @Put(':mediaId')
  update(
    @Param('mediaId') mediaId: string,
    @Body('musclesId') musclesId: number[],
  ) {
    return this.service.update(Number(mediaId), musclesId);
  }

  @Roles(UserType.Admin, UserType.Root)
  @Delete(':mediaId')
  delete(@Param('mediaId') mediaId: string) {
    return this.service.delete(Number(mediaId));
  }

  @Roles(UserType.Admin, UserType.Root)
  @Get(':mediaId')
  findByMedia(@Param('mediaId') mediaId: string) {
    return this.service.findByMediaId(Number(mediaId));
  }
}
