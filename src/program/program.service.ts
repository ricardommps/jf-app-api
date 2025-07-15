import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProgramEntity } from '../entities/program.entity';

function isExpired(startDate: string, endDate: string): boolean {
  const currentDate = new Date();

  // Garantir que `endDate` seja tratado como o final do dia
  const parsedEndDate = new Date(endDate);
  const endOfDay = new Date(
    parsedEndDate.getFullYear(),
    parsedEndDate.getMonth(),
    parsedEndDate.getDate(),
    23,
    59,
    59,
    999, // Final do dia
  );

  // Retornar true se a data atual for maior que o final do dia de `endDate`
  return currentDate > endOfDay;
}

@Injectable()
export class ProgramService {
  constructor(
    @InjectRepository(ProgramEntity)
    private readonly programRepository: Repository<ProgramEntity>,
  ) {}

  async myPrograms(customerId: number): Promise<ProgramEntity[]> {
    const program = await this.programRepository.find({
      where: {
        customerId: customerId,
        hide: false,
        vs2: true,
      },
      order: { updatedAt: 'DESC' },
    });
    return program;
  }

  async findProgramById(programId: number) {
    const program = await this.programRepository.findOne({
      where: {
        id: programId,
      },
    });
    if (!program) {
      throw new NotFoundException(`Program id: ${programId} not found`);
    }
    let expired = null;
    if (program.startDate && program.endDate) {
      expired = isExpired(
        program.startDate.toISOString(),
        program.endDate ? program.endDate.toISOString() : null,
      );
    }

    if (expired) {
      return {
        program,
        items: null,
        message: 'Seu planejamento acabou! Está na hora de evoluirmos.',
      };
    }
    return program;
  }
}
