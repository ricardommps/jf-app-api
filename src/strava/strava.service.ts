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

type StravaActivity = {
  id?: number;
  name?: string | null;
  type?: string | null;
  sport_type?: string | null;
  workout_type?: number | null;
  device_name?: string | null;
  timezone?: string | null;
  start_date?: string | null;
  start_date_local?: string | null;
  elapsed_time?: number | null;
  total_elevation_gain?: number | null;
  average_heartrate?: number | null;
  max_heartrate?: number | null;
  average_cadence?: number | null;
  calories?: number | null;
  location_city?: string | null;
  location_state?: string | null;
  location_country?: string | null;
  map?: {
    summary_polyline?: string | null;
  } | null;
  start_latlng?: [number, number] | null;
  end_latlng?: [number, number] | null;
};

@Injectable()
export class StravaService {
  private readonly logger = new Logger(StravaService.name);

  private hasText(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }

  private extractActivityId(linkStrava: string): number | null {
    const normalizedLink = linkStrava.trim();
    const match =
      normalizedLink.match(/activities\/(\d+)/i) ??
      normalizedLink.match(/(\d+)(?!.*\d)/);

    if (!match?.[1]) {
      return null;
    }

    const activityId = Number(match[1]);
    return Number.isNaN(activityId) ? null : activityId;
  }

  private toOptionalNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    const numericValue = Number(value);
    return Number.isNaN(numericValue) ? undefined : numericValue;
  }

  private toOptionalDate(value: unknown): Date | undefined {
    if (!this.hasText(value)) {
      return undefined;
    }

    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate;
  }

  private buildLocationLabel(activity: StravaActivity): string | undefined {
    const parts = [
      activity.location_city?.trim(),
      activity.location_state?.trim(),
      activity.location_country?.trim(),
    ].filter(Boolean);

    return parts.length ? parts.join(', ') : undefined;
  }

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

  async enrichFinishedWithStravaDetails(
    customerId: number,
    finishedId: number,
    linkStrava: string,
  ) {
    if (!this.hasText(linkStrava)) {
      return false;
    }

    const activityId = this.extractActivityId(linkStrava);

    if (!activityId) {
      this.logger.warn(
        `Não foi possível extrair o activityId do link do Strava para o finished ${finishedId}`,
      );
      return false;
    }

    let connection = await this.findByUser(customerId);

    if (!connection) {
      this.logger.warn(
        `Conexão Strava não encontrada para customer ${customerId} ao enriquecer finished ${finishedId}`,
      );
      return false;
    }

    connection = await this.refreshTokenIfNeeded(connection);

    const activity = (await this.fetchActivity(
      activityId,
      connection.accessToken,
    )) as StravaActivity;

    const resolvedExternalId = this.toOptionalNumber(activity.id);
    const duplicatedFinishedWithSameExternalId =
      resolvedExternalId !== undefined
        ? await this.finishedRepo.findOne({
            where: { externalId: resolvedExternalId },
          })
        : null;

    const patch: Partial<FinishedEntity> = {
      id: finishedId,
      source: 'strava',
      summaryPolyline: activity.map?.summary_polyline?.trim() || undefined,
      stravaActivityName: activity.name?.trim() || undefined,
      stravaActivityType: activity.type?.trim() || undefined,
      stravaSportType: activity.sport_type?.trim() || undefined,
      stravaWorkoutType: this.toOptionalNumber(activity.workout_type),
      stravaDeviceName: activity.device_name?.trim() || undefined,
      stravaTimezone: activity.timezone?.trim() || undefined,
      stravaStartDate: this.toOptionalDate(activity.start_date),
      stravaStartDateLocal: this.toOptionalDate(activity.start_date_local),
      elapsedTimeInSeconds: this.toOptionalNumber(activity.elapsed_time),
      totalElevationGain: this.toOptionalNumber(activity.total_elevation_gain),
      averageHeartrate: this.toOptionalNumber(activity.average_heartrate),
      maxHeartrate: this.toOptionalNumber(activity.max_heartrate),
      averageCadence: this.toOptionalNumber(activity.average_cadence),
      calories: this.toOptionalNumber(activity.calories),
      startLatitude: this.toOptionalNumber(activity.start_latlng?.[0]),
      startLongitude: this.toOptionalNumber(activity.start_latlng?.[1]),
      endLatitude: this.toOptionalNumber(activity.end_latlng?.[0]),
      endLongitude: this.toOptionalNumber(activity.end_latlng?.[1]),
      locationLabel: this.buildLocationLabel(activity),
      locationCity: activity.location_city?.trim() || undefined,
      locationState: activity.location_state?.trim() || undefined,
      locationCountry: activity.location_country?.trim() || undefined,
    };

    if (
      duplicatedFinishedWithSameExternalId &&
      duplicatedFinishedWithSameExternalId.id !== finishedId
    ) {
      this.logger.warn(
        `Atividade Strava ${resolvedExternalId} já vinculada ao finished ${duplicatedFinishedWithSameExternalId.id}. O finished ${finishedId} será enriquecido sem externalId por ser um cenário de teste.`,
      );
    } else {
      patch.externalId = resolvedExternalId;
    }

    await this.finishedRepo.save(patch);

    return true;
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

    if (connection.expiresAt > now) return connection;

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
      return connection;
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

  async disconnectByUser(userId: number) {
    const connection = await this.findByUser(userId);

    if (!connection) {
      return {
        connected: false,
        disconnected: false,
      };
    }

    try {
      const deauthorizeParams = new URLSearchParams({
        access_token: connection.accessToken,
      });

      await axios.post(
        'https://www.strava.com/oauth/deauthorize',
        deauthorizeParams,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.warn(
          `Falha ao desautorizar no Strava para customer ${userId}: ${error.response?.status ?? 'unknown'} ${JSON.stringify(error.response?.data ?? {})}`,
        );
      } else {
        this.logger.warn(
          `Falha inesperada ao desautorizar no Strava para customer ${userId}. A conexão local será removida mesmo assim.`,
        );
      }
    }

    await this.stravaRepo.delete({ id: connection.id });

    return {
      connected: false,
      disconnected: true,
    };
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

      if (!run?.id) {
        return null;
      }

      const detailedRun = await this.fetchActivity(run.id, connection.accessToken);

      return detailedRun ?? run;
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
