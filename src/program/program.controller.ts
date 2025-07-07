import { Controller, Get, Param, Query } from '@nestjs/common';
import { Roles } from '../decorators/roles.decorator';
import { HomeProgramDto } from '../dtos/program.dto';
import { UserType } from '../utils/user-type.enum';
import { ProgramService } from './program.service';

@Controller('program')
export class ProgramController {
  constructor(private readonly programService: ProgramService) {}

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Get('myPrograms')
  async myPrograms(
    @Query('customerId') customerId: number,
  ): Promise<HomeProgramDto[]> {
    const programs = await this.programService.myPrograms(customerId);
    return programs.map((program) => new HomeProgramDto(program));
  }

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Get('/:programId')
  async findProgramById(@Param('programId') programId) {
    return await this.programService.findProgramById(programId);
  }
}
