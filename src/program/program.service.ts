import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WorkoutsEntity } from 'src/entities/workouts.entity';
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

    @InjectRepository(WorkoutsEntity)
    private workoutRepository: Repository<WorkoutsEntity>,
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

  async getRunnerProgram(customerId: number): Promise<ProgramEntity[]> {
    const programs = await this.programRepository.find({
      where: {
        customerId,
        hide: false,
        vs2: true,
        type: 1,
      },
      order: { updatedAt: 'DESC' },
    });

    if (!programs.length) {
      throw new BadRequestException(
        'Nenhum programa encontrado para este atleta.',
      );
    }

    const now = new Date();

    const expiredProgram = programs.find(
      (program) => program.endDate && new Date(program.endDate) < now,
    );

    if (expiredProgram) {
      throw new BadRequestException(
        'O programa de treino está vencido. Entre em contato com seu treinador.',
      );
    }

    return programs;
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
        ...program,
        items: null,
        message: 'Seu planejamento acabou! Está na hora de evoluirmos.',
      };
    }
    return program;
  }

  // async findProgramByIdUViewPdf(programId: number) {
  //   const program = await this.programRepository.findOne({
  //     where: {
  //       id: programId,
  //       workouts: {
  //         published: true,
  //       },
  //     },
  //     relations: ['workouts', 'workouts.medias', 'customer'],

  //     order: {
  //       workouts: {
  //         datePublished: 'ASC',
  //       },
  //     },
  //   });

  //   if (!program) {
  //     throw new NotFoundException(`Program id: ${programId} not found`);
  //   }
  //   return program;
  // }

  async findProgramByIdUViewPdf(programId: number) {
    const program = await this.programRepository
      .createQueryBuilder('program')
      .leftJoinAndSelect(
        'program.workouts',
        'workout',
        'workout.published = true',
      )
      .leftJoinAndSelect('workout.medias', 'media') // Adicione diretamente aqui
      .leftJoinAndSelect('program.customer', 'customer')
      .where('program.id = :programId', { programId })
      .orderBy('workout.datePublished', 'ASC')
      .getOne();

    if (!program) {
      throw new NotFoundException(`Program id: ${programId} not found`);
    }

    return program;
  }
}
