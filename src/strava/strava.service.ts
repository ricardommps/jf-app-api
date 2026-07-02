import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { Repository } from 'typeorm';

import { FinishedEntity } from 'src/entities/finished.entity';
import { ProgramEntity } from 'src/entities/program.entity';
import { StravaConnectionEntity } from 'src/entities/strava-connection.entity';
import { WorkoutsEntity } from 'src/entities/workouts.entity';

@Injectable()
export class StravaService {
  private readonly logger = new Logger(StravaService.name);

  private isInactiveApplicationError(error: unknown) {
    if (!axios.isAxiosError(error)) {
      return false;
    }

    const errors = error.response?.data?.errors;

    return (
      error.response?.status === 403 &&
      Array.isArray(errors) &&
      errors.some(
        (item) =>
          item?.resource === 'Application' &&
          item?.field === 'Status' &&
          item?.code === 'Inactive',
      )
    );
  }

  private handleStravaError(error: unknown, context: string): never {
    if (axios.isAxiosError(error)) {
      this.logger.error(`Strava request failed during ${context}`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        response: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
        params: error.config?.params,
      });

      if (this.isInactiveApplicationError(error)) {
        throw new ForbiddenException({
          statusCode: HttpStatus.FORBIDDEN,
          error: 'Forbidden',
          code: 'STRAVA_APPLICATION_INACTIVE',
          message: 'Strava application is inactive.',
          detail:
            'Activate the application in the Strava developer panel before requesting Strava activities.',
        });
      }

      throw new HttpException(
        {
          statusCode: error.response?.status ?? HttpStatus.BAD_GATEWAY,
          error: 'Strava API Error',
          code: 'STRAVA_API_ERROR',
          message: 'Strava request failed.',
          detail:
            error.response?.data?.message ??
            'Unexpected error while requesting data from Strava.',
          stravaErrors: Array.isArray(error.response?.data?.errors)
            ? error.response?.data?.errors
            : undefined,
        },
        error.response?.status ?? HttpStatus.BAD_GATEWAY,
      );
    } else {
      this.logger.error(`Unexpected Strava error during ${context}`, error);
    }

    throw new HttpException(
      {
        statusCode: HttpStatus.BAD_GATEWAY,
        error: 'Strava API Error',
        code: 'STRAVA_API_ERROR',
        message: 'Unexpected error while requesting data from Strava.',
      },
      HttpStatus.BAD_GATEWAY,
    );
  }

  constructor(
    @InjectRepository(StravaConnectionEntity)
    private readonly stravaRepo: Repository<StravaConnectionEntity>,

    @InjectRepository(ProgramEntity)
    private readonly programRepo: Repository<ProgramEntity>,

    @InjectRepository(WorkoutsEntity)
    private readonly workoutsRepo: Repository<WorkoutsEntity>,

    @InjectRepository(FinishedEntity)
    private readonly finishedRepo: Repository<FinishedEntity>,
  ) {}

  async handleNewActivity(activityId: number, ownerId: number) {
    const connection = await this.stravaRepo.findOne({
      where: { stravaAthleteId: ownerId },
    });

    if (!connection) {
      this.logger.warn('Conexão Strava não encontrada');
      return;
    }

    await this.refreshTokenIfNeeded(connection);

    const activity = await this.fetchActivity(
      activityId,
      connection.accessToken,
    );

    await this.processActivity(connection.customerId, activity);
  }

  private async fetchActivity(activityId: number, accessToken: string) {
    try {
      const response = await axios.get(
        `https://www.strava.com/api/v3/activities/${activityId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      this.handleStravaError(error, 'fetchActivity');
    }
  }

  private async processActivity(customerId: number, activity: any) {
    if (activity.type !== 'Run') return;

    const program = await this.programRepo.findOne({
      where: {
        customerId,
        active: true,
      },
    });

    if (!program) return;

    const activityDate = new Date(activity.start_date);

    // Buscar treino do mesmo dia na tabela workouts (uuid)
    const workout = await this.workoutsRepo
      .createQueryBuilder('workouts')
      .where('workouts.program_id = :programId', {
        programId: program.id,
      })
      .andWhere('DATE(workouts.date_published) = DATE(:activityDate)', {
        activityDate,
      })
      .getOne();

    if (!workout) {
      this.logger.warn('Treino não encontrado na tabela workouts');
      return;
    }

    // Evitar duplicação pelo externalId
    const alreadyExists = await this.finishedRepo.findOne({
      where: {
        externalId: activity.id,
      },
    });

    if (alreadyExists) {
      this.logger.log('Atividade já registrada');
      return;
    }

    const paceInSeconds =
      activity.average_speed > 0 ? 1000 / activity.average_speed : null;

    const finished = this.finishedRepo.create({
      workouts: workout, // ✅ usa relação ManyToOne
      executionDay: activityDate.toISOString(),
      distanceInMeters: activity.distance,
      durationInSeconds: activity.moving_time,
      paceInSeconds,
      externalId: activity.id,
      source: 'strava',
    });

    await this.finishedRepo.save(finished);
  }

  private async refreshTokenIfNeeded(connection: StravaConnectionEntity) {
    const now = Math.floor(Date.now() / 1000);

    if (connection.expiresAt > now) return;

    const refreshParams = new URLSearchParams({
      client_id: process.env.STRAVA_CLIENT_ID ?? '',
      client_secret: process.env.STRAVA_CLIENT_SECRET ?? '',
      refresh_token: connection.refreshToken,
      grant_type: 'refresh_token',
    });

    try {
      const response = await axios.post(
        'https://www.strava.com/api/v3/oauth/token',
        refreshParams,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      connection.accessToken = response.data.access_token;
      connection.refreshToken = response.data.refresh_token;
      connection.expiresAt = response.data.expires_at;

      await this.stravaRepo.save(connection);
    } catch (error) {
      this.handleStravaError(error, 'refreshTokenIfNeeded');
    }
  }

  async saveConnection(data: {
    userId: number;
    athleteId: number;
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  }) {
    let connection = await this.stravaRepo.findOne({
      where: { customerId: data.userId },
    });

    if (!connection) {
      connection = this.stravaRepo.create();
    }

    connection.customerId = data.userId;
    connection.stravaAthleteId = data.athleteId;
    connection.accessToken = data.accessToken;
    connection.refreshToken = data.refreshToken;
    connection.expiresAt = data.expiresAt;

    await this.stravaRepo.save(connection);
  }

  async findByUser(userId: number) {
    return this.stravaRepo.findOne({
      where: { customerId: userId },
    });
  }

  // async getActivitiesByDate(userId: number, date: string) {
  //   const connection = await this.findByUser(userId);

  //   if (!connection) {
  //     throw new BadRequestException('Strava not connected');
  //   }

  //   await this.refreshTokenIfNeeded(connection); // ✅ reutiliza lógica já existente

  //   const start = new Date(`${date}T00:00:00`);
  //   const end = new Date(`${date}T23:59:59`);

  //   const after = Math.floor(start.getTime() / 1000);
  //   const before = Math.floor(end.getTime() / 1000);

  //   const response = await axios.get(
  //     'https://www.strava.com/api/v3/athlete/activities',
  //     {
  //       headers: { Authorization: `Bearer ${connection.accessToken}` },
  //       params: { after, before },
  //     },
  //   );

  //   const run = (response.data as any[]).find((a) => a.type === 'Run');
  //   return run ?? null;
  // }

  async getActivitiesByDate(userId: number, date: string) {
    const connection = await this.findByUser(userId);

    if (!connection) {
      throw new BadRequestException('Strava not connected');
    }

    try {
      await this.refreshTokenIfNeeded(connection);

      const start = new Date(`${date}T00:00:00`);
      const end = new Date(`${date}T23:59:59`);

      const after = Math.floor(start.getTime() / 1000);
      const before = Math.floor(end.getTime() / 1000);

      const response = await axios.get(
        'https://www.strava.com/api/v3/athlete/activities',
        {
          headers: {
            Authorization: `Bearer ${connection.accessToken}`,
          },
          params: {
            after,
            before,
            per_page: 100,
          },
        },
      );

      const run = (response.data as any[]).find(
        (activity) => activity.type === 'Run',
      );

      return run ?? null;
    } catch (error) {
      this.handleStravaError(error, 'getActivitiesByDate');
    }
  }
  async refreshToken(refreshToken: string) {
    const refreshParams = new URLSearchParams({
      client_id: process.env.STRAVA_CLIENT_ID ?? '',
      client_secret: process.env.STRAVA_CLIENT_SECRET ?? '',
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    try {
      const response = await axios.post(
        'https://www.strava.com/api/v3/oauth/token',
        refreshParams,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
      return response.data;
    } catch (error) {
      this.handleStravaError(error, 'refreshToken');
    }
  }
}
