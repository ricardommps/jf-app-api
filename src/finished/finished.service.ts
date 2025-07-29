import { HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProgramEntity } from 'src/entities/program.entity';
import { Repository } from 'typeorm';
import { FinishedEntity } from '../entities/finished.entity';
import { WorkoutsEntity } from '../entities/workouts.entity';

type Formatted = {
  executionDay: string;
  distanceInKm: number;
  workoutId: number;
  [key: string]: any;
};

export class FinishedService {
  constructor(
    @InjectRepository(FinishedEntity)
    private finishedRepository: Repository<FinishedEntity>,

    @InjectRepository(WorkoutsEntity)
    private readonly workoutRepository: Repository<WorkoutsEntity>,

    @InjectRepository(ProgramEntity)
    private readonly programRepository: Repository<ProgramEntity>,
  ) {}

  async createFinished(payload) {
    try {
      const workout = await this.workoutRepository.findOne({
        where: { id: payload.workoutsId },
      });

      workout.finished = true;
      workout.unrealized = payload.unrealized;
      await this.workoutRepository.save(workout);
      return this.finishedRepository.save({
        ...payload,
      });
    } catch (error) {
      throw error;
    }
  }

  async getVolume(
    userId: number,
    programId: number,
    startDate: string,
    endDate: string,
  ) {
    try {
      // Verifica ownership em ambas as tabelas
      const programOwnershipOld = await this.finishedRepository
        .createQueryBuilder('finished')
        .select(['pro.customer_id'])
        .innerJoin('finished.workout', 'workout')
        .leftJoin(ProgramEntity, 'pro', 'workout.program_id = pro.id')
        .where('workout.program_id = :programId', { programId })
        .limit(1)
        .getRawOne();

      const programOwnershipNew = await this.finishedRepository
        .createQueryBuilder('finished')
        .select(['pro.customer_id'])
        .innerJoin('finished.workouts', 'workouts')
        .leftJoin(ProgramEntity, 'pro', 'workouts.program_id = pro.id')
        .where('workouts.program_id = :programId', { programId })
        .limit(1)
        .getRawOne();

      const programOwnership = programOwnershipOld || programOwnershipNew;

      if (!programOwnership || programOwnership.customer_id !== userId) {
        throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      }

      const endDateTime = `${endDate} 23:59:59`;

      // Query para a tabela antiga (workout)
      const finishedTrainingsOld = await this.finishedRepository
        .createQueryBuilder('finished')
        .select([
          'finished.execution_day',
          'finished.distance_in_meters',
          'finished.workout_id',
          'NULL as workouts_id',
        ])
        .innerJoin('finished.workout', 'workout')
        .leftJoin(ProgramEntity, 'pro', 'workout.program_id = pro.id')
        .where('pro.customer_id = :customerId', { customerId: userId })
        .andWhere('workout.program_id = :programId', { programId })
        .andWhere('finished.execution_day >= :startDate', { startDate })
        .andWhere('finished.execution_day <= :endDateTime', { endDateTime })
        .andWhere('finished.unrealized = :unrealized', { unrealized: false })
        .andWhere('workout.running = :running', { running: true })
        .getRawMany();

      // Query para a tabela nova (workouts)
      const finishedTrainingsNew = await this.finishedRepository
        .createQueryBuilder('finished')
        .select([
          'finished.execution_day',
          'finished.distance_in_meters',
          'NULL as workout_id',
          'finished.workouts_id',
        ])
        .innerJoin('finished.workouts', 'workouts')
        .leftJoin(ProgramEntity, 'pro', 'workouts.program_id = pro.id')
        .where('pro.customer_id = :customerId', { customerId: userId })
        .andWhere('workouts.program_id = :programId', { programId })
        .andWhere('finished.execution_day >= :startDate', { startDate })
        .andWhere('finished.execution_day <= :endDateTime', { endDateTime })
        .andWhere('finished.unrealized = :unrealized', { unrealized: false })
        .andWhere('workouts.running = :running', { running: true })
        .getRawMany();

      // Combina os resultados das duas queries
      const finishedTrainings = [
        ...finishedTrainingsOld,
        ...finishedTrainingsNew,
      ].sort(
        (a, b) =>
          new Date(a.execution_day).getTime() -
          new Date(b.execution_day).getTime(),
      );

      const formattedFinishedTrainings = finishedTrainings
        .map((finished) => {
          const formatted: Formatted = {} as Formatted;

          Object.keys(finished).forEach((key) => {
            const camelCaseKey = key.replace(/_([a-z])/g, (match, letter) =>
              letter.toUpperCase(),
            );

            if (camelCaseKey === 'distanceInMeters') {
              formatted['distanceInKm'] = finished[key]
                ? parseFloat((finished[key] / 100).toFixed(2))
                : 0;
            } else {
              formatted[camelCaseKey] = finished[key];
            }
          });

          // Fallback: se workoutId estiver nulo, usa workoutsId
          formatted.workoutId = formatted.workoutId || formatted.workoutsId;

          // Remove workoutsId do resultado final
          delete formatted.workoutsId;

          return formatted;
        })
        .sort(
          (a, b) =>
            new Date(b.executionDay).getTime() -
            new Date(a.executionDay).getTime(),
        );

      const totalDistanceInKm = finishedTrainings.reduce((sum, finished) => {
        const distance = finished.distance_in_meters
          ? finished.distance_in_meters / 100
          : 0;
        return sum + distance;
      }, 0);

      return {
        data: formattedFinishedTrainings,
        totalDistanceInKm: parseFloat(totalDistanceInKm.toFixed(2)),
      };
    } catch (error) {
      throw error;
    }
  }

  async history(userId: number) {
    // Query otimizada filtrando pelo mês atual
    const query = `
      SELECT 
        finished.*,
        training.name as "trainingName",
        training.subtitle as "trainingSubtitle", 
        training.description as "trainingDesc",
        training.running as "trainingRunninge",
        training.date_published as "trainingDatePublished",
        training.id as "trainingId",
        pro.name as "programName",
        pro.type,
        pro.goal,
        pro.pv,
        pro.pace as "programpace",
        pro.difficulty_level as "difficulty",
        pro.reference_month as "month",
        pro.id as "programId"
      FROM finished
      INNER JOIN (
        SELECT 
          id::text as id,
          name,
          subtitle,
          description,
          running,
          date_published,
          program_id,
          'old' as source
        FROM workout
        WHERE program_id IN (
          SELECT id FROM program WHERE customer_id = $1
        )
        
        UNION ALL
        
        SELECT 
          id::text as id,
          title as name,
          subtitle,
          description,
          running,
          date_published,
          program_id,
          'new' as source
        FROM workouts
        WHERE program_id IN (
          SELECT id FROM program WHERE customer_id = $1
        )
      ) training ON (
        (finished.workout_id::text = training.id AND training.source = 'old') OR
        (finished.workouts_id::text = training.id AND training.source = 'new')
      )
      INNER JOIN program pro ON training.program_id = pro.id
      WHERE finished.execution_day >= TO_CHAR(DATE_TRUNC('month', CURRENT_DATE), 'YYYY-MM-DD')
        AND finished.execution_day <= TO_CHAR(DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 MONTH' - INTERVAL '1 DAY', 'YYYY-MM-DD')
      ORDER BY finished.execution_day DESC
    `;

    const finishedTrainings = await this.finishedRepository.manager.query(
      query,
      [userId],
    );

    // Função helper para conversão camelCase (mais eficiente)
    const toCamelCase = (str: string): string =>
      str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

    // Formatação otimizada usando Object.fromEntries
    const formattedFinishedTrainings = finishedTrainings.map((finished) =>
      Object.fromEntries(
        Object.entries(finished).map(([key, value]) => [
          toCamelCase(key),
          value,
        ]),
      ),
    );

    return formattedFinishedTrainings;
  }
}
