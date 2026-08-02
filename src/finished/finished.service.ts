import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CommentService } from 'src/comment/comment.service';
import { CommentEntity } from 'src/entities/comment.entity';
import { FirebaseService } from 'src/firebase/firebase.service';
import { CreateNotificationV2Payload } from 'src/notification/notification-v2.types';
import { NotificationService } from 'src/notification/notification.service';
import { StravaService } from 'src/strava/strava.service';
import { reviewCommentPayload } from 'src/types/review-comment.type';
import {
  formatRunningWorkoutTitle,
  formatStravaActivityTypeLabel,
  normalizeWorkoutTitleKey,
} from '../utils/workout-labels.util';
import { In, Repository } from 'typeorm';
import { FinishedEntity } from '../entities/finished.entity';
import { WorkoutsEntity } from '../entities/workouts.entity';

export class FinishedService {
  private readonly logger = new Logger(FinishedService.name);

  constructor(
    @InjectRepository(FinishedEntity)
    private finishedRepository: Repository<FinishedEntity>,

    @InjectRepository(WorkoutsEntity)
    private readonly workoutRepository: Repository<WorkoutsEntity>,

    @InjectRepository(CommentEntity)
    private readonly commentRepository: Repository<CommentEntity>,

    private readonly firebaseService: FirebaseService,

    private readonly commentService: CommentService,

    private readonly notificationService: NotificationService,

    private readonly stravaService: StravaService,
  ) {}

  async createFinished(payload, userId) {
    try {
      const workout = await this.workoutRepository.findOne({
        where: { id: payload.workoutsId },
      });

      if (!workout) {
        throw new NotFoundException('Workout não encontrado');
      }

      const resolvedExternalId = this.resolveIncomingStravaExternalId(payload);
      const duplicatedFinishedWithSameExternalId =
        resolvedExternalId !== null
          ? await this.finishedRepository.findOne({
              where: { externalId: resolvedExternalId },
            })
          : null;

      const finished = await this.finishedRepository.manager.transaction(
        async (manager) => {
          const workoutRepository = manager.getRepository(WorkoutsEntity);
          const finishedRepository = manager.getRepository(FinishedEntity);

          const workout = await workoutRepository.findOne({
            where: { id: payload.workoutsId },
          });

          if (!workout) {
            throw new NotFoundException('Workout não encontrado');
          }

          workout.finished = true;
          workout.unrealized = payload.unrealized;
          await workoutRepository.save(workout);

          return finishedRepository.save({
            ...payload,
            externalId: duplicatedFinishedWithSameExternalId
              ? null
              : resolvedExternalId ?? payload.externalId ?? null,
          });
        },
      );

      if (duplicatedFinishedWithSameExternalId) {
        this.logger.warn(
          `Atividade Strava ${resolvedExternalId} já estava vinculada ao finished ${duplicatedFinishedWithSameExternalId.id}. Novo finished ${finished.id} foi salvo sem externalId por ser um cenário de teste.`,
        );
      }

      if (this.toStringValue(payload.linkstrava)) {
        try {
          await this.stravaService.enrichFinishedWithStravaDetails(
            Number(userId),
            finished.id,
            payload.linkstrava,
          );
        } catch (error) {
          const detail =
            error instanceof Error ? error.message : 'erro desconhecido';
          this.logger.warn(
            `Falha ao enriquecer finished ${finished.id} com dados do Strava: ${detail}`,
          );
        }
      }

      if (payload.comments) {
        await this.commentService.createFinishedCommnet({
          finishedId: finished.id,
          content: payload.comments,
          authorUserId: Number(userId), // comentário em nome do aluno
        });
      }
      console.log('----AKI---');
      await this.notifyTeacherWhenStudentCompletesRunningWorkouts(
        Number(userId),
        finished.id,
        workout,
      );

      return finished;
    } catch (error) {
      throw error;
    }
  }

  private resolveIncomingStravaExternalId(payload: {
    externalId?: unknown;
    linkstrava?: unknown;
  }): number | null {
    const payloadExternalId = this.toOptionalNumber(payload.externalId);

    if (payloadExternalId !== null) {
      return payloadExternalId;
    }

    const linkStrava = this.toStringValue(payload.linkstrava);

    if (!linkStrava) {
      return null;
    }

    const match =
      linkStrava.match(/activities\/(\d+)/i) ??
      linkStrava.match(/(\d+)(?!.*\d)/);

    if (!match?.[1]) {
      return null;
    }

    const parsedExternalId = Number(match[1]);
    return Number.isNaN(parsedExternalId) ? null : parsedExternalId;
  }

  private formatDateTime(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  private formatDateLabel(dateValue?: string | Date | null): string | null {
    if (!dateValue) {
      return null;
    }

    const parsedDate =
      dateValue instanceof Date ? dateValue : new Date(dateValue);

    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    const day = String(parsedDate.getDate()).padStart(2, '0');
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const year = parsedDate.getFullYear();

    return `${day}/${month}/${year}`;
  }

  private toStringValue(value: unknown): string | null {
    if (typeof value === 'string') {
      const normalized = value.trim();
      return normalized.length ? normalized : null;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    return null;
  }

  private firstNonEmpty(...values: Array<string | null | undefined>) {
    return values.find(
      (value): value is string => typeof value === 'string' && value.trim().length > 0,
    ) ?? null;
  }

  private toOptionalNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsedValue = Number(value);
    return Number.isNaN(parsedValue) ? null : parsedValue;
  }

  private formatDecimalLabel(value: number, suffix: string, fractionDigits = 2) {
    return `${new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value)} ${suffix}`;
  }

  private formatIntegerLabel(value: number, suffix: string) {
    return `${new Intl.NumberFormat('pt-BR', {
      maximumFractionDigits: 0,
    }).format(value)} ${suffix}`;
  }

  private formatDurationLabel(totalSeconds?: number | null) {
    if (totalSeconds === null || totalSeconds === undefined) {
      return null;
    }

    const roundedTotalSeconds = Math.max(0, Math.round(totalSeconds));
    const hours = Math.floor(roundedTotalSeconds / 3600);
    const minutes = Math.floor((roundedTotalSeconds % 3600) / 60);
    const seconds = roundedTotalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  private parseStoredPaceToSecondsPerKm(value?: number | null) {
    if (value === null || value === undefined) {
      return null;
    }

    const roundedValue = Math.round(value);

    if (roundedValue >= 100) {
      const minutes = Math.floor(roundedValue / 100);
      const seconds = roundedValue % 100;

      if (seconds < 60) {
        return minutes * 60 + seconds;
      }
    }

    return roundedValue > 0 ? roundedValue : null;
  }

  private formatPaceLabel(totalSeconds?: number | null) {
    if (totalSeconds === null || totalSeconds === undefined) {
      return null;
    }

    const roundedTotalSeconds = Math.max(0, Math.round(totalSeconds));
    const minutes = Math.floor(roundedTotalSeconds / 60);
    const seconds = roundedTotalSeconds % 60;

    return `${minutes}:${String(seconds).padStart(2, '0')} /km`;
  }

  private formatActivityDateLabel(dateValue?: string | Date | null) {
    if (!dateValue) {
      return null;
    }

    const parsedDate =
      dateValue instanceof Date ? dateValue : new Date(dateValue);

    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    const shortMonth = new Intl.DateTimeFormat('pt-BR', {
      month: 'short',
      timeZone: 'UTC',
    }).format(parsedDate);

    const normalizedMonth = shortMonth.endsWith('.')
      ? shortMonth
      : `${shortMonth}.`;

    const day = String(parsedDate.getUTCDate()).padStart(2, '0');
    const year = parsedDate.getUTCFullYear();
    const hours = String(parsedDate.getUTCHours()).padStart(2, '0');
    const minutes = String(parsedDate.getUTCMinutes()).padStart(2, '0');

    return `${day} de ${normalizedMonth} de ${year} às ${hours}:${minutes}`;
  }

  private toIsoStringOrNull(value?: string | Date | null) {
    if (!value) {
      return null;
    }

    const parsedDate = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    return parsedDate.toISOString();
  }

  private buildLocationLabel(details: {
    locationLabel?: string | null;
    locationCity?: string | null;
    locationState?: string | null;
    locationCountry?: string | null;
  }) {
    const explicitLabel = this.toStringValue(details.locationLabel);

    if (explicitLabel) {
      return explicitLabel;
    }

    const parts = [
      this.toStringValue(details.locationCity),
      this.toStringValue(details.locationState),
      this.toStringValue(details.locationCountry),
    ].filter(Boolean);

    return parts.length ? parts.join(', ') : null;
  }

  private resolveDistanceInKm(details: {
    distanceInMeters?: unknown;
    distance?: unknown;
  }) {
    const normalizedDistanceInMeters = this.toOptionalNumber(
      details.distanceInMeters,
    );

    if (normalizedDistanceInMeters !== null) {
      return Number((normalizedDistanceInMeters / 100).toFixed(2));
    }

    const normalizedDistance = this.toOptionalNumber(details.distance);

    if (normalizedDistance !== null) {
      return Number(normalizedDistance.toFixed(2));
    }

    return null;
  }

  private resolveMovingTimeInSeconds(details: {
    durationInSeconds?: unknown;
    elapsedTimeInSeconds?: unknown;
  }) {
    return (
      this.toOptionalNumber(details.durationInSeconds) ??
      this.toOptionalNumber(details.elapsedTimeInSeconds) ??
      null
    );
  }

  private resolveAveragePaceSecondsPerKm(details: {
    paceInSeconds?: unknown;
    durationInSeconds?: unknown;
    elapsedTimeInSeconds?: unknown;
    distanceInMeters?: unknown;
    distance?: unknown;
  }) {
    const storedPaceValue = this.parseStoredPaceToSecondsPerKm(
      this.toOptionalNumber(details.paceInSeconds),
    );

    if (storedPaceValue !== null) {
      return storedPaceValue;
    }

    const distanceInKm = this.resolveDistanceInKm(details);
    const movingTimeInSeconds = this.resolveMovingTimeInSeconds(details);

    if (!distanceInKm || !movingTimeInSeconds) {
      return null;
    }

    return Math.round(movingTimeInSeconds / distanceInKm);
  }

  private resolveActivityTypeLabel(details: {
    stravaSportType?: unknown;
    stravaActivityType?: unknown;
  }) {
    const rawValue = this.firstNonEmpty(
      this.toStringValue(details.stravaSportType),
      this.toStringValue(details.stravaActivityType),
    );

    if (!rawValue) {
      return null;
    }

    return formatStravaActivityTypeLabel(rawValue) ?? rawValue;
  }

  private resolveWorkoutKind(details: {
    trainingRunning?: unknown;
    linkstrava?: unknown;
    stravaSportType?: unknown;
    stravaActivityType?: unknown;
  }): 'running' | 'strength' {
    const normalizedSportType = normalizeWorkoutTitleKey(
      this.toStringValue(details.stravaSportType),
    );
    const normalizedActivityType = normalizeWorkoutTitleKey(
      this.toStringValue(details.stravaActivityType),
    );

    const isRunning =
      details.trainingRunning === true ||
      details.trainingRunning === 't' ||
      normalizedSportType === 'RUN' ||
      normalizedActivityType === 'RUN' ||
      Boolean(this.toStringValue(details.linkstrava));

    return isRunning ? 'running' : 'strength';
  }

  private async validateActivityDetailsAccess(userId: number, finishedId: number) {
    const [context] = await this.finishedRepository.manager.query(
      `
        SELECT
          COALESCE(pws.customer_id, pw.customer_id) AS "ownerCustomerId",
          EXISTS (
            SELECT 1
            FROM notifications n
            WHERE n.recipient_id = $2
              AND n.type = 'feedback'
              AND (
                n.link = f.id::text
                OR n.metadata ->> 'finishedId' = f.id::text
              )
          ) AS "hasNotificationAccess"
        FROM finished f
        LEFT JOIN workouts ws ON ws.id = f.workouts_id
        LEFT JOIN program pws ON pws.id = ws.program_id
        LEFT JOIN workout w ON w.id = f.workout_id
        LEFT JOIN program pw ON pw.id = w.program_id
        WHERE f.id = $1
        LIMIT 1
      `,
      [finishedId, userId],
    );

    if (!context) {
      throw new NotFoundException('Feedback não encontrado');
    }

    const ownerCustomerId = this.toOptionalNumber(context.ownerCustomerId);
    const hasOwnerAccess = ownerCustomerId === userId;
    const hasNotificationAccess = Boolean(context.hasNotificationAccess);

    if (!hasOwnerAccess && !hasNotificationAccess) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar os detalhes desta atividade',
      );
    }
  }

  async getActivitiesDetails(userId: number, feedbackId: number) {
    await this.validateActivityDetailsAccess(userId, feedbackId);

    const [details] = await this.finishedRepository.manager.query(
      `
        SELECT
          f.id,
          f.workouts_id AS "workoutsId",
          f.execution_day AS "executionDay",
          f.distance,
          f.duration,
          f.pace,
          f.link,
          f.review,
          f.unrealized,
          f.intensities,
          f.unitmeasurement AS "unitMeasurement",
          f.type_workout AS "typeWorkout",
          f.check_list AS "checkList",
          f.trimp,
          f.rpe,
          f.outdoor,
          f.linkstrava,
          f.summary_polyline AS "summaryPolyline",
          f.distance_in_meters AS "distanceInMeters",
          f.duration_in_seconds AS "durationInSeconds",
          f.pace_in_seconds AS "paceInSeconds",
          f.cool_down_duration AS "coolDownDuration",
          f.cool_down_intensities AS "coolDownIntensities",
          f.warm_up_duration AS "warmUpDuration",
          f.warm_up_intensities AS "warmUpIntensities",
          f.elapsed_time_in_seconds AS "elapsedTimeInSeconds",
          f.total_elevation_gain AS "totalElevationGain",
          f.average_heartrate AS "averageHeartrate",
          f.max_heartrate AS "maxHeartrate",
          f.average_cadence AS "averageCadence",
          f.calories,
          f.start_latitude AS "startLatitude",
          f.start_longitude AS "startLongitude",
          f.end_latitude AS "endLatitude",
          f.end_longitude AS "endLongitude",
          f.location_label AS "locationLabel",
          f.location_city AS "locationCity",
          f.location_state AS "locationState",
          f.location_country AS "locationCountry",
          f.strava_activity_name AS "stravaActivityName",
          f.strava_activity_type AS "stravaActivityType",
          f.strava_sport_type AS "stravaSportType",
          f.strava_workout_type AS "stravaWorkoutType",
          f.strava_device_name AS "stravaDeviceName",
          f.strava_timezone AS "stravaTimezone",
          f.strava_start_date AS "stravaStartDate",
          f.strava_start_date_local AS "stravaStartDateLocal",
          f.created_at AS "createdAt",
          f.updated_at AS "updatedAt",
          training.id AS "trainingId",
          training.name AS "trainingName",
          training.subtitle AS "trainingSubtitle",
          training.running AS "trainingRunning",
          training.source AS "trainingSource"
        FROM finished f
        LEFT JOIN (
          SELECT
            id::text AS id,
            name,
            subtitle,
            running,
            'old' AS source
          FROM workout
          UNION ALL
          SELECT
            id::text AS id,
            title AS name,
            subtitle,
            running,
            'new' AS source
          FROM workouts
        ) training ON (
          (f.workout_id::text = training.id AND training.source = 'old')
          OR (f.workouts_id::text = training.id AND training.source = 'new')
        )
        WHERE f.id = $1
        LIMIT 1
      `,
      [feedbackId],
    );

    if (!details) {
      throw new NotFoundException('Detalhes da atividade não encontrados');
    }

    const comments = await this.commentRepository.find({
      where: { finishedId: feedbackId },
      relations: ['author'],
      order: { createdAt: 'ASC' },
    });

    const workoutKind = this.resolveWorkoutKind(details);
    const isRunning = workoutKind === 'running';

    const title = isRunning
      ? this.firstNonEmpty(
          this.toStringValue(details.stravaActivityName),
          formatRunningWorkoutTitle(this.toStringValue(details.trainingName)),
          this.toStringValue(details.trainingName),
          this.toStringValue(details.trainingSubtitle),
        )
      : this.firstNonEmpty(
          this.toStringValue(details.trainingSubtitle),
          this.toStringValue(details.trainingName),
          this.toStringValue(details.stravaActivityName),
        );
    const activityTypeLabel = isRunning
      ? this.resolveActivityTypeLabel(details)
      : 'Treino de força';
    const distanceInKm = this.resolveDistanceInKm(details);
    const movingTimeInSeconds = this.resolveMovingTimeInSeconds(details);
    const movingTimeLabel = this.formatDurationLabel(movingTimeInSeconds);
    const elapsedTimeInSeconds = this.toOptionalNumber(
      details.elapsedTimeInSeconds,
    );
    const elapsedTimeLabel = this.formatDurationLabel(elapsedTimeInSeconds);
    const paceInSeconds = this.resolveAveragePaceSecondsPerKm(details);
    const paceLabel = this.formatPaceLabel(paceInSeconds);
    const elevationGainInMeters = this.toOptionalNumber(
      details.totalElevationGain,
    );
    const averageHeartRate = this.toOptionalNumber(details.averageHeartrate);
    const averageCadence = this.toOptionalNumber(details.averageCadence);
    const cadenceInStepsPerMinute =
      averageCadence !== null ? Math.round(averageCadence * 2) : null;
    const calories = this.toOptionalNumber(details.calories);
    const locationLabel = this.buildLocationLabel(details);
    const activityDateValue =
      details.stravaStartDateLocal ??
      details.stravaStartDate ??
      details.executionDay;
    const activityDate = this.toIsoStringOrNull(activityDateValue);
    const outdoor =
      typeof details.outdoor === 'boolean'
        ? details.outdoor
        : details.outdoor === 't';
    const review =
      typeof details.review === 'boolean'
        ? details.review
        : details.review === 't';
    const unrealized =
      typeof details.unrealized === 'boolean'
        ? details.unrealized
        : details.unrealized === 't';
    const unitMeasurement = this.toStringValue(details.unitMeasurement);
    const workout = {
      title: this.toStringValue(details.trainingName),
      subtitle: this.toStringValue(details.trainingSubtitle),
    };

    return {
      feedbackId,
      id: details.id,
      workoutsId: this.toStringValue(details.workoutsId),
      executionDay: this.toStringValue(details.executionDay),
      distance: details.distance ?? null,
      duration: details.duration ?? null,
      pace: this.toStringValue(details.pace),
      link: this.toStringValue(details.link),
      linkstrava: this.toStringValue(details.linkstrava),
      summaryPolyline: this.toStringValue(details.summaryPolyline),
      review,
      unrealized,
      intensities: Array.isArray(details.intensities) ? details.intensities : null,
      unitMeasurement,
      unitmeasurement: unitMeasurement,
      typeWorkout: this.toStringValue(details.typeWorkout),
      distanceInMeters: details.distanceInMeters ?? null,
      durationInSeconds: details.durationInSeconds ?? null,
      paceInSeconds: details.paceInSeconds ?? null,
      coolDownDuration: details.coolDownDuration ?? null,
      coolDownIntensities: details.coolDownIntensities ?? null,
      warmUpDuration: details.warmUpDuration ?? null,
      warmUpIntensities: details.warmUpIntensities ?? null,
      checkList: details.checkList ?? null,
      createdAt: details.createdAt ?? null,
      updatedAt: details.updatedAt ?? null,
      finishedId: details.id,
      workoutId: this.firstNonEmpty(
        this.toStringValue(details.trainingId),
        this.toStringValue(details.workoutsId),
      ),
      workoutSource: this.toStringValue(details.trainingSource),
      workoutKind,
      title,
      trainingTitle: this.toStringValue(details.trainingName),
      trainingSubtitle: this.toStringValue(details.trainingSubtitle),
      trimp: this.toStringValue(details.trimp),
      rpe: this.toOptionalNumber(details.rpe),
      outdoor,
      activityTypeLabel,
      activityDate,
      activityDateLabel: this.formatActivityDateLabel(activityDateValue),
      locationLabel,
      comments: comments.map((comment) => ({
        id: comment.id,
        finishedId: comment.finishedId,
        content: comment.content,
        isAdmin: comment.isAdmin,
        read: comment.read,
        parentId: comment.parentId,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        author: comment.author
          ? {
              id: comment.author.id,
              name: comment.author.name,
              email: comment.author.email,
              avatar: comment.author.avatar,
            }
          : null,
      })),
      workout,
      strava: {
        url: this.toStringValue(details.linkstrava),
        activityType: this.toStringValue(details.stravaActivityType),
        sportType: this.toStringValue(details.stravaSportType),
        workoutType: this.toOptionalNumber(details.stravaWorkoutType),
        deviceName: this.toStringValue(details.stravaDeviceName),
        timezone: this.toStringValue(details.stravaTimezone),
      },
      map: isRunning
        ? {
            summaryPolyline: this.toStringValue(details.summaryPolyline),
            startLatitude: this.toOptionalNumber(details.startLatitude),
            startLongitude: this.toOptionalNumber(details.startLongitude),
            endLatitude: this.toOptionalNumber(details.endLatitude),
            endLongitude: this.toOptionalNumber(details.endLongitude),
          }
        : null,
      metrics: {
        distanceInKm: isRunning ? distanceInKm : null,
        distanceLabel:
          isRunning && distanceInKm !== null
            ? this.formatDecimalLabel(distanceInKm, 'km')
            : null,
        movingTimeInSeconds,
        movingTimeLabel,
        intensities: Array.isArray(details.intensities) ? details.intensities : null,
        unitMeasurement,
        unitmeasurement: unitMeasurement,
        warmUpDuration: details.warmUpDuration ?? null,
        warmUpIntensities: details.warmUpIntensities ?? null,
        coolDownDuration: details.coolDownDuration ?? null,
        coolDownIntensities: details.coolDownIntensities ?? null,
        elapsedTimeInSeconds: isRunning ? elapsedTimeInSeconds : null,
        elapsedTimeLabel: isRunning ? elapsedTimeLabel : null,
        paceInSeconds: isRunning ? paceInSeconds : null,
        paceLabel: isRunning ? paceLabel : null,
        elevationGainInMeters: isRunning ? elevationGainInMeters : null,
        elevationGainLabel:
          isRunning && elevationGainInMeters !== null
            ? this.formatIntegerLabel(Math.round(elevationGainInMeters), 'm')
            : null,
        averageHeartRate: isRunning ? averageHeartRate : null,
        averageHeartRateLabel:
          isRunning && averageHeartRate !== null
            ? this.formatIntegerLabel(Math.round(averageHeartRate), 'bpm')
            : null,
        cadenceInStepsPerMinute: isRunning ? cadenceInStepsPerMinute : null,
        cadenceLabel:
          isRunning && cadenceInStepsPerMinute !== null
            ? this.formatIntegerLabel(cadenceInStepsPerMinute, 'spm')
            : null,
        calories: isRunning ? calories : null,
        caloriesLabel:
          isRunning && calories !== null
            ? new Intl.NumberFormat('pt-BR', {
                maximumFractionDigits: 0,
              }).format(Math.round(calories))
            : null,
      },
    };
  }

  private getRunningWindowBounds(referenceDate?: string) {
    const parsedReferenceDate = referenceDate ? new Date(referenceDate) : null;
    const baseDate =
      parsedReferenceDate && !Number.isNaN(parsedReferenceDate.getTime())
        ? parsedReferenceDate
        : new Date();

    const startOfToday = new Date(baseDate);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfNextSevenDays = new Date(startOfToday);
    endOfNextSevenDays.setDate(endOfNextSevenDays.getDate() + 7);
    endOfNextSevenDays.setHours(23, 59, 59, 999);

    const startOfPreviousSevenDays = new Date(startOfToday);
    startOfPreviousSevenDays.setDate(startOfPreviousSevenDays.getDate() - 7);

    const endOfPreviousDay = new Date(startOfToday.getTime() - 1);

    return {
      upcomingStart: this.formatDateTime(startOfToday),
      upcomingEnd: this.formatDateTime(endOfNextSevenDays),
      overdueStart: this.formatDateTime(startOfPreviousSevenDays),
      overdueEnd: this.formatDateTime(endOfPreviousDay),
    };
  }

  private async getPendingRunningWorkoutsSummary(
    customerId: number,
    referenceDate?: string,
  ) {
    const { upcomingStart, upcomingEnd, overdueStart, overdueEnd } =
      this.getRunningWindowBounds(referenceDate);

    const [summary] = await this.finishedRepository.manager.query(
      `
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN scheduled_date BETWEEN $2 AND $3 THEN 1
              ELSE 0
            END
          ),
          0
        ) AS upcoming_count,
        COALESCE(
          SUM(
            CASE
              WHEN scheduled_date BETWEEN $4 AND $5 THEN 1
              ELSE 0
            END
          ),
          0
        ) AS overdue_count
      FROM (
        SELECT COALESCE(ws.date_published, ws.workout_date_other) AS scheduled_date
        FROM workouts ws
        INNER JOIN program p ON p.id = ws.program_id
        WHERE p.customer_id = $1
          AND COALESCE(p.active, false) = true
          AND COALESCE(p.hide, false) = false
          AND COALESCE(ws.running, false) = true
          AND COALESCE(ws.finished, false) = false
          AND COALESCE(ws.title, '') <> 'COMPETICAO'
          AND COALESCE(ws.hide, false) = false
          AND COALESCE(ws.published, false) = true
          AND COALESCE(ws.date_published, ws.workout_date_other) IS NOT NULL
          AND COALESCE(ws.date_published, ws.workout_date_other) BETWEEN $4 AND $3

        UNION ALL

        SELECT COALESCE(w.date_published, w.workout_date_other) AS scheduled_date
        FROM workout w
        INNER JOIN program p ON p.id = w.program_id
        WHERE p.customer_id = $1
          AND COALESCE(p.active, false) = true
          AND COALESCE(p.hide, false) = false
          AND COALESCE(w.running, false) = true
          AND COALESCE(w.finished, false) = false
          AND COALESCE(w.name, '') <> 'COMPETICAO'
          AND COALESCE(w.hide, false) = false
          AND COALESCE(w.published, false) = true
          AND COALESCE(w.date_published, w.workout_date_other) IS NOT NULL
          AND COALESCE(w.date_published, w.workout_date_other) BETWEEN $4 AND $3
      ) pending_running
      `,
      [customerId, upcomingStart, upcomingEnd, overdueStart, overdueEnd],
    );

    return {
      upcomingCount: Number(summary?.upcoming_count || 0),
      overdueCount: Number(summary?.overdue_count || 0),
    };
  }

  private async notifyTeacherWhenStudentCompletesRunningWorkouts(
    customerId: number,
    finishedId: number,
    workout: WorkoutsEntity,
  ) {
    console.log('-notifyTeacherWhenStudentCompletesRunningWorkouts--', workout);
    if (!workout?.running) {
      return;
    }

    try {
      const { upcomingCount, overdueCount } =
        await this.getPendingRunningWorkoutsSummary(customerId);

      if (upcomingCount > 0 || overdueCount > 0) {
        return;
      }

      const [student] = await this.finishedRepository.manager.query(
        `
        SELECT
          c.id,
          c.name,
          c.user_id AS teacher_user_id,
          u.type_user AS teacher_user_type
        FROM customer c
        LEFT JOIN "user" u ON u.id = c.user_id
        WHERE c.id = $1
        LIMIT 1
        `,
        [customerId],
      );

      if (!student?.name) {
        this.logger.warn(
          `Aluno ${customerId} não encontrado para notificação de corridas concluídas`,
        );
        return;
      }

      console.log('-student--', student);
      const teacherUserId = Number(student.teacher_user_id || 0);
      const teacherUserType = Number(student.teacher_user_type || 0);
      console.log('-teacherUserId--', teacherUserId);
      console.log('-teacherUserType--', teacherUserType);

      if (!teacherUserId || ![2, 3].includes(teacherUserType)) {
        this.logger.warn(
          `Nenhum professor elegível encontrado para o aluno ${customerId}`,
        );
        return;
      }

      const title = 'Treinos de corrida concluídos';
      const content = `${student.name} finalizou todos os treinos de corrida e não possui pendências nos últimos 7 dias.`;

      try {
        await this.notificationService.createNotification({
          recipientUserId: teacherUserId,
          title,
          content,
          type: 'running-finished-all',
          link: String(finishedId),
        });
      } catch (notificationError) {
        const message =
          notificationError instanceof Error
            ? notificationError.message
            : 'Erro desconhecido ao criar notificação';

        this.logger.error(
          `Falha ao criar notificação de corridas concluídas para o professor ${teacherUserId}: ${message}`,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro desconhecido ao verificar corridas concluídas';

      this.logger.error(
        `Falha ao verificar notificação de corridas concluídas para o aluno ${customerId}: ${message}`,
      );
    }
  }

  private async findFinishedForReview(
    id: number,
    loadRelations = false,
  ): Promise<FinishedEntity> {
    const finished = await this.finishedRepository.findOne({
      where: { id },
      relations: loadRelations
        ? {
            workouts: true,
            workout: true,
          }
        : undefined,
    });

    if (!finished) {
      throw new NotFoundException(`finished not found`);
    }

    return finished;
  }

  private async createAdminReviewCommentAndSave(
    customerId: string,
    finished: FinishedEntity,
    reviewWorkoutDto: reviewCommentPayload,
  ): Promise<FinishedEntity> {
    const createComment = await this.commentService.createComment(
      Number(customerId),
      {
        finishedId: finished.id,
        content: reviewWorkoutDto.feedback,
        authorUserId: Number(customerId),
      },
      true,
    );

    if (!createComment.id) {
      throw new HttpException(
        'Erro ao criar o comentário de feedback',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (reviewWorkoutDto.commentId) {
      await this.commentService.markAsRead(
        Number(customerId),
        [reviewWorkoutDto.commentId],
        true,
      );
    }

    return this.finishedRepository.save({
      ...finished,
      feedback: reviewWorkoutDto.feedback,
      review: true,
    });
  }

  private buildReviewCommentNotificationV2Payload(
    customerId: string,
    finished: FinishedEntity,
    feedback: string,
  ): CreateNotificationV2Payload {
    const rawWorkoutTitle = finished.workouts?.title ?? finished.workout?.name ?? null;
    const workoutSubtitle =
      finished.workouts?.subtitle ?? finished.workout?.subtitle ?? null;
    const isRunning =
      finished.workouts?.running ?? finished.workout?.running ?? false;
    const workoutTitle = isRunning
      ? formatRunningWorkoutTitle(rawWorkoutTitle) ??
        rawWorkoutTitle ??
        'Feedback de treino'
      : workoutSubtitle ?? rawWorkoutTitle ?? 'Feedback de treino';

    return {
      recipientId: customerId,
      title: workoutTitle,
      content: feedback,
      type: 'feedback',
      link: String(finished.id),
      metadata: {
        finishedId: finished.id,
        workoutTitle: rawWorkoutTitle ?? workoutTitle,
        workoutSubtitle,
        referenceDate: this.formatDateLabel(finished.executionDay),
        workoutKind: isRunning ? 'running' : 'strength',
      },
    };
  }

  async getFinishedById(id: number): Promise<FinishedEntity> {
    return this.finishedRepository.findOne({
      where: { id },
    });
  }

  async getVolume(
    userId: number,
    programId: number,
    startDate: string,
    endDate: string,
  ) {
    // Verifica ownership do programa (uma query unificada em vez de duas)
    const programOwnership = await this.finishedRepository.manager.query(
      `
      SELECT pro.customer_id
      FROM program pro
      WHERE pro.id = $1
      LIMIT 1
      `,
      [programId],
    );

    if (
      !programOwnership.length ||
      programOwnership[0].customer_id !== userId
    ) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    const endDateTime = `${endDate} 23:59:59`;

    // Query unificada usando UNION para ambas as tabelas
    const finishedTrainings = await this.finishedRepository.manager.query(
      `
      SELECT 
        finished.execution_day,
        finished.distance_in_meters,
        finished.duration_in_seconds,
        finished.workout_id,
        NULL as workouts_id
      FROM finished
      INNER JOIN workout ON finished.workout_id = workout.id
      WHERE workout.program_id = $1
        AND finished.execution_day >= $2
        AND finished.execution_day <= $3
        AND finished.unrealized = false
        AND workout.running = true
      
      UNION ALL
      
      SELECT 
        finished.execution_day,
        finished.distance_in_meters,
        finished.duration_in_seconds,
        NULL as workout_id,
        finished.workouts_id
      FROM finished
      INNER JOIN workouts ON finished.workouts_id = workouts.id
      WHERE workouts.program_id = $1
        AND finished.execution_day >= $2
        AND finished.execution_day <= $3
        AND finished.unrealized = false
        AND workouts.running = true
      
      ORDER BY execution_day ASC
      `,
      [programId, startDate, endDateTime],
    );

    // Calcula totais durante a formatação (uma única passagem)
    let totalDistanceInKm = 0;
    let totalDurationInSeconds = 0;

    const formattedFinishedTrainings = finishedTrainings.map((finished) => {
      // Acumula os totais
      totalDistanceInKm += finished.distance_in_meters
        ? finished.distance_in_meters / 100
        : 0;
      totalDurationInSeconds += finished.duration_in_seconds
        ? Number(finished.duration_in_seconds)
        : 0;

      // Formata o registro
      return {
        executionDay: finished.execution_day,
        distanceInKm: finished.distance_in_meters
          ? parseFloat((finished.distance_in_meters / 100).toFixed(2))
          : 0,
        durationInSeconds: finished.duration_in_seconds
          ? Number(finished.duration_in_seconds)
          : 0,
        workoutId: finished.workout_id || finished.workouts_id,
      };
    });

    // Ordena por data decrescente
    formattedFinishedTrainings.sort(
      (a, b) =>
        new Date(b.executionDay).getTime() - new Date(a.executionDay).getTime(),
    );

    return {
      data: formattedFinishedTrainings,
      totalDistanceInKm: parseFloat(totalDistanceInKm.toFixed(2)),
      totalDurationInSeconds,
    };
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
      WHERE TO_TIMESTAMP(finished.execution_day, 'YYYY-MM-DD') >= CURRENT_DATE - INTERVAL '30 days'
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

  async historyComments(userId: number) {
    const query = `
      SELECT 
        finished.*,
        training.name as "trainingName",
        training.subtitle as "trainingSubtitle", 
        training.description as "trainingDesc",
        training.running as "trainingRunning",
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
      WHERE TO_TIMESTAMP(finished.execution_day, 'YYYY-MM-DD') >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY finished.execution_day DESC
    `;

    const results = await this.finishedRepository.manager.query(query, [
      userId,
    ]);

    const finishedIds = results.map((r) => r.id);

    // 🔥 Busca todos comentários de uma vez
    const comments = finishedIds.length
      ? await this.commentRepository.find({
          where: { finishedId: In(finishedIds) },
          relations: ['author'],
          order: { createdAt: 'ASC' },
        })
      : [];

    // 🔥 Agrupa por finishedId
    const commentsByFinished = comments.reduce(
      (acc, comment) => {
        if (!acc[comment.finishedId]) {
          acc[comment.finishedId] = [];
        }

        acc[comment.finishedId].push({
          id: comment.id,
          content: comment.content,
          isAdmin: comment.isAdmin,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          read: comment.read,
          parentId: comment.parentId,
          author: {
            id: comment.author.id,
            name: comment.author.name,
            email: comment.author.email,
            avatar: comment.author.avatar,
          },
        });

        return acc;
      },
      {} as Record<number, any[]>,
    );

    // 🔥 Formata camelCase + adiciona comments
    return results.map((row) => {
      const formatted: any = {};

      Object.keys(row).forEach((key) => {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
          letter.toUpperCase(),
        );
        formatted[camelKey] = row[key];
      });

      return {
        ...formatted,
        comments: commentsByFinished[formatted.id] || [],
      };
    });
  }

  async findFinishedById(userId: number, id: number) {
    const query = `
      SELECT 
        finished.*,
        training.name as "trainingName",
        training.subtitle as "trainingSubtitle",
        training.description as "trainingDesc",
        training.date_published as "trainingDatePublished",
        training.id as "trainingId",
        pro.name as "programName",
        pro.type as "type",
        pro.goal as "goal",
        pro.pv as "pv",
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
          date_published, 
          program_id, 
          'old' as source
        FROM workout
        UNION ALL
        SELECT 
          id::text as id, 
          title as name, 
          subtitle, 
          description, 
          date_published, 
          program_id, 
          'new' as source
        FROM workouts
      ) training ON (
        (finished.workout_id::text = training.id AND training.source = 'old') OR
        (finished.workouts_id::text = training.id AND training.source = 'new')
      )
      LEFT JOIN program pro ON training.program_id = pro.id
      WHERE pro.customer_id = $1
        AND finished.id = $2
      ORDER BY finished.execution_day DESC
    `;
    const finishedTrainings = await this.finishedRepository.manager.query(
      query,
      [userId, id],
    );

    const formattedFinishedTrainings = finishedTrainings.map((finished) => {
      const formatted = {};
      Object.keys(finished).forEach((key) => {
        const camelCaseKey = key.replace(/_([a-z])/g, (match, letter) =>
          letter.toUpperCase(),
        );
        formatted[camelCaseKey] = finished[key];
      });
      return formatted;
    });

    return formattedFinishedTrainings;
  }

  async reviewWorkout(customerId: string, id: number, feedback: string) {
    const finished = await this.finishedRepository.findOne({
      where: {
        id: id,
      },
    });

    if (!finished) {
      throw new NotFoundException(`finished not found`);
    }

    const finishedSave = await this.finishedRepository.save({
      ...finished,
      feedback: feedback,
      review: true,
    });

    if (customerId && finished) {
      // {
      //   title: 'Título da Notificação',
      //   body: 'Corpo da notificação',
      //   screen: 'profile',
      //   params: { id: '123', source: 'push' },
      // }
      const payloadNotification = {
        recipientId: customerId,
        title: 'Olá',
        content: 'O feedback do seu último treino já está disponível! Vem ver!',
        type: 'feedback',
        link: finishedSave.id,
      };
      const notification =
        await this.notificationService.createNotification(payloadNotification);
      const message = {
        title: payloadNotification.title,
        body: payloadNotification.content,
        data: {
          url: `jfapp://feedback?feedbackId=${finishedSave.id}&notificationId=${notification.id}`,
          screen: 'feedback',
          params: `{\"feedbackId\":\"${finishedSave.id}\",\"notificationId\":\"${notification.id}\",\"source\":\"push\"}`,
        },
      };
      await this.firebaseService.sendNotificationNew(customerId, message);
    }

    return this.getFinishedById(id);
  }

  async reviewWorkoutComments(
    customerId: string,
    id: number,
    reviewWorkoutDto: reviewCommentPayload,
  ) {
    const finished = await this.findFinishedForReview(id);
    const finishedSave = await this.createAdminReviewCommentAndSave(
      customerId,
      finished,
      reviewWorkoutDto,
    );

    if (customerId && finished) {
      // {
      //   title: 'Título da Notificação',
      //   body: 'Corpo da notificação',
      //   screen: 'profile',
      //   params: { id: '123', source: 'push' },
      // }
      const payloadNotification = {
        recipientId: customerId,
        title: 'Olá',
        content: 'O feedback do seu último treino já está disponível! Vem ver!',
        type: 'feedback',
        link: finishedSave.id,
      };
      const notification =
        await this.notificationService.createNotification(payloadNotification);
      const message = {
        title: payloadNotification.title,
        body: payloadNotification.content,
        data: {
          url: `jfapp://feedback?feedbackId=${finishedSave.id}&notificationId=${notification.id}`,
          screen: 'feedback',
          params: `{\"feedbackId\":\"${finishedSave.id}\",\"notificationId\":\"${notification.id}\",\"source\":\"push\"}`,
        },
      };
      await this.firebaseService.sendNotificationNew(customerId, message);
    }

    return this.getFinishedById(id);
  }

  async reviewWorkoutCommentsV2(
    customerId: string,
    id: number,
    reviewWorkoutDto: reviewCommentPayload,
  ) {
    const finished = await this.findFinishedForReview(id, true);
    await this.createAdminReviewCommentAndSave(
      customerId,
      finished,
      reviewWorkoutDto,
    );

    if (customerId && finished) {
      const notificationPayload = this.buildReviewCommentNotificationV2Payload(
        customerId,
        finished,
        reviewWorkoutDto.feedback,
      );

      await this.notificationService.sendNotificationV2(notificationPayload);
    }

    return this.getFinishedById(id);
  }

  async getUnreviewedFinished() {
    const query = `
      SELECT 
        finished.*,
        training.name as "trainingName",
        training.subtitle as "trainingSubtitle",
        training.description as "trainingDesc",
        training.date_published as "trainingDatePublished",
        training.id as "trainingId",
        training.source as "trainingSource",
        training.running as "trainingRunning",
        customer.id as "customerId",
        customer.name as "customerName",
        customer.email as "customerEmail",
        customer.phone as "customerPhone",
        customer.avatar as "customerAvatar"
      FROM finished
      INNER JOIN (
        SELECT 
          id::text as id, 
          name, 
          subtitle, 
          description, 
          date_published, 
          program_id,
          running,
          'old' as source
        FROM workout
        UNION ALL
        SELECT 
          id::text as id, 
          title as name, 
          subtitle, 
          description, 
          date_published, 
          program_id,
          running,
          'new' as source
        FROM workouts
      ) training ON (
        (finished.workout_id::text = training.id AND training.source = 'old') OR
        (finished.workouts_id::text = training.id AND training.source = 'new')
      )
      LEFT JOIN program pro ON training.program_id = pro.id
      LEFT JOIN customer ON pro.customer_id = customer.id
      WHERE finished.review IS NULL OR finished.review = false
      ORDER BY finished.execution_day DESC
    `;

    const results = await this.finishedRepository.manager.query(query);

    // Buscar todos os IDs dos finished
    const finishedIds = results.map((r) => r.id);

    // Buscar todos os comentários de uma vez
    const comments = await this.commentRepository.find({
      where: finishedIds.length > 0 ? { finishedId: In(finishedIds) } : {},
      relations: ['author'],
      order: { createdAt: 'ASC' },
    });

    // Agrupar comentários por finishedId
    const commentsByFinished = comments.reduce(
      (acc, comment) => {
        if (!acc[comment.finishedId]) {
          acc[comment.finishedId] = [];
        }
        acc[comment.finishedId].push({
          id: comment.id,
          content: comment.content,
          isAdmin: comment.isAdmin,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          read: comment.read,
          author: {
            id: comment.author.id,
            name: comment.author.name,
            email: comment.author.email,
            avatar: comment.author.avatar,
          },
        });
        return acc;
      },
      {} as Record<number, any[]>,
    );

    // Formatar para camelCase
    return results.map((row) => {
      const formatted: any = {};
      Object.keys(row).forEach((key) => {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
          letter.toUpperCase(),
        );
        formatted[camelKey] = row[key];
      });

      return {
        id: formatted.id,
        workoutId: formatted.workoutId || formatted.workoutsId,
        distance: formatted.distance,
        duration: formatted.duration,
        pace: formatted.pace,
        link: formatted.link,
        linkstrava: formatted.linkstrava,
        summaryPolyline: formatted.summaryPolyline,
        rpe: formatted.rpe,
        trimp: formatted.trimp,
        review: formatted.review,
        executionDay: formatted.executionDay,
        unrealized: formatted.unrealized,
        intensities: formatted.intensities,
        outdoor: formatted.outdoor,
        unitMeasurement: formatted.unitMeasurement,
        typeWorkout: formatted.typeWorkout,
        distanceInMeters: formatted.distanceInMeters,
        durationInSeconds: formatted.durationInSeconds,
        coolDownDuration: formatted.coolDownDuration,
        coolDownIntensities: formatted.coolDownIntensities,
        warmUpDuration: formatted.warmUpDuration,
        warmUpIntensities: formatted.warmUpIntensities,
        unitmeasurement: formatted.unitmeasurement,
        paceInSeconds: formatted.paceInSeconds,
        checkList: formatted.checkList,
        createdAt: formatted.createdAt,
        updatedAt: formatted.updatedAt,
        workout: {
          id: formatted.trainingId,
          name: formatted.trainingName,
          subtitle: formatted.trainingSubtitle,
          description: formatted.trainingDesc,
          datePublished: formatted.trainingDatePublished,
          source: formatted.trainingSource,
          running: formatted.trainingRunning,
        },
        customer: {
          id: formatted.customerId,
          name: formatted.customerName,
          email: formatted.customerEmail,
          phone: formatted.customerPhone,
          avatar: formatted.customerAvatar,
        },
        comments: commentsByFinished[formatted.id] || [],
      };
    });
  }

  async getReviewedWithAdminComments() {
    const query = `
      SELECT 
        finished.*,
        training.name as "trainingName",
        training.subtitle as "trainingSubtitle",
        training.description as "trainingDesc",
        training.date_published as "trainingDatePublished",
        training.id as "trainingId",
        training.source as "trainingSource",
        training.running as "trainingRunning",
        customer.id as "customerId",
        customer.name as "customerName",
        customer.email as "customerEmail",
        customer.phone as "customerPhone",
        customer.avatar as "customerAvatar"
      FROM finished
      INNER JOIN (
        SELECT 
          id::text as id, 
          name, 
          subtitle, 
          description, 
          date_published, 
          program_id,
          running,
          'old' as source
        FROM workout
        UNION ALL
        SELECT 
          id::text as id, 
          title as name, 
          subtitle, 
          description, 
          date_published, 
          program_id,
          running,
          'new' as source
        FROM workouts
      ) training ON (
        (finished.workout_id::text = training.id AND training.source = 'old') OR
        (finished.workouts_id::text = training.id AND training.source = 'new')
      )
      LEFT JOIN program pro ON training.program_id = pro.id
      LEFT JOIN customer ON pro.customer_id = customer.id
      WHERE finished.review = true
      ORDER BY finished.execution_day DESC
    `;

    const results = await this.finishedRepository.manager.query(query);
    const finishedIds = results.map((r) => r.id);

    if (!finishedIds.length) {
      return [];
    }

    const comments = await this.commentRepository.find({
      where: {
        finishedId: In(finishedIds),
      },
      relations: ['author'],
      order: { createdAt: 'ASC' },
    });

    // Agrupar comentários por finishedId
    const commentsByFinished = comments.reduce(
      (acc, comment) => {
        if (!acc[comment.finishedId]) {
          acc[comment.finishedId] = [];
        }

        acc[comment.finishedId].push({
          id: comment.id,
          content: comment.content,
          isAdmin: comment.isAdmin,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          read: comment.read,
          parentId: comment.parentId, // 👈 obrigatório
          author: {
            id: comment.author.id,
            name: comment.author.name,
            email: comment.author.email,
            avatar: comment.author.avatar,
          },
        });

        return acc;
      },
      {} as Record<number, any[]>,
    );

    return results
      .map((row) => {
        const formatted: any = {};
        Object.keys(row).forEach((key) => {
          const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
            letter.toUpperCase(),
          );
          formatted[camelKey] = row[key];
        });

        const comments = commentsByFinished[formatted.id] || [];

        const shouldReturn = comments.some(
          (c) => c.isAdmin === false && c.read === false && c.parentId !== null,
        );

        if (!shouldReturn) {
          return null;
        }

        return {
          id: formatted.id,
          workoutId: formatted.workoutId || formatted.workoutsId,
          distance: formatted.distance,
          duration: formatted.duration,
          pace: formatted.pace,
          link: formatted.link,
          rpe: formatted.rpe,
          trimp: formatted.trimp,
          review: formatted.review,
          executionDay: formatted.executionDay,
          unrealized: formatted.unrealized,
          intensities: formatted.intensities,
          outdoor: formatted.outdoor,
          unitMeasurement: formatted.unitMeasurement,
          typeWorkout: formatted.typeWorkout,
          distanceInMeters: formatted.distanceInMeters,
          durationInSeconds: formatted.durationInSeconds,
          paceInSeconds: formatted.paceInSeconds,
          createdAt: formatted.createdAt,
          updatedAt: formatted.updatedAt,
          workout: {
            id: formatted.trainingId,
            name: formatted.trainingName,
            subtitle: formatted.trainingSubtitle,
            description: formatted.trainingDesc,
            datePublished: formatted.trainingDatePublished,
            source: formatted.trainingSource,
            running: formatted.trainingRunning,
          },
          customer: {
            id: formatted.customerId,
            name: formatted.customerName,
            email: formatted.customerEmail,
            phone: formatted.customerPhone,
            avatar: formatted.customerAvatar,
          },
          comments,
        };
      })
      .filter(Boolean);
  }

  async getTrimp(userId: number) {
    // === Cálculo das últimas 4 semanas ===
    const today = new Date();

    // Encontra a segunda-feira da semana atual
    const currentMonday = new Date(today);
    currentMonday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

    // 3 semanas antes → início do intervalo
    const startDateObj = new Date(currentMonday);
    startDateObj.setDate(currentMonday.getDate() - 21); // 3 semanas antes
    const startDate = startDateObj.toISOString().slice(0, 10);

    // Domingo da semana atual → fim do intervalo
    const endDateObj = new Date(currentMonday);
    endDateObj.setDate(currentMonday.getDate() + 6);
    const endDate = endDateObj.toISOString().slice(0, 10);
    const endDateTime = `${endDate} 23:59:59`;

    // === Query combinada workout + workouts ===
    const finished = await this.finishedRepository.manager.query(
      `
        SELECT 
          f.execution_day,
          f.rpe,
          f.duration_in_seconds,
          f.trimp,
          w.running
        FROM finished f
        INNER JOIN workout w ON f.workout_id = w.id
        INNER JOIN program p1 ON w.program_id = p1.id
        WHERE p1.customer_id = $1
          AND f.execution_day >= $2
          AND f.execution_day <= $3
          AND f.unrealized = false
  
        UNION ALL
  
        SELECT 
          f.execution_day,
          f.rpe,
          f.duration_in_seconds,
          f.trimp,
          ws.running
        FROM finished f      
        INNER JOIN workouts ws ON f.workouts_id = ws.id
        INNER JOIN program p2 ON ws.program_id = p2.id
        WHERE p2.customer_id = $1
          AND f.execution_day >= $2
          AND f.execution_day <= $3
          AND f.unrealized = false
  
        ORDER BY execution_day ASC
      `,
      [userId, startDate, endDateTime],
    );

    const formatted = finished.map((f) => {
      const duration = Number(f.duration_in_seconds ?? 0);
      const rpe = Number(f.rpe ?? 0);

      const trimp =
        duration > 0 && rpe > 0
          ? Number(((duration / 60) * rpe).toFixed(2))
          : 0;

      return {
        executionDay: f.execution_day,
        rpe,
        durationInSeconds: duration,
        trimp,
        running: Boolean(f.running),
      };
    });

    formatted.sort(
      (a, b) =>
        new Date(b.executionDay).getTime() - new Date(a.executionDay).getTime(),
    );

    return {
      data: formatted,
      startDate,
      endDate,
    };
  }

  async getReview(
    userId: number,
    programId: number,
    startDate: string,
    endDate: string,
  ) {
    // Verifica ownership do programa
    const programOwnership = await this.finishedRepository.manager.query(
      `
      SELECT pro.customer_id
      FROM program pro
      WHERE pro.id = $1
      LIMIT 1
      `,
      [programId],
    );

    if (
      !programOwnership.length ||
      programOwnership[0].customer_id !== userId
    ) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    const endDateTime = `${endDate} 23:59:59`;

    // Query base (volume)
    const finishedTrainings = await this.finishedRepository.manager.query(
      `
      SELECT 
        finished.distance_in_meters,
        finished.duration_in_seconds
      FROM finished
      INNER JOIN workout ON finished.workout_id = workout.id
      WHERE workout.program_id = $1
        AND finished.execution_day >= $2
        AND finished.execution_day <= $3
        AND finished.unrealized = false
        AND workout.running = true
  
      UNION ALL
  
      SELECT 
        finished.distance_in_meters,
        finished.duration_in_seconds
      FROM finished
      INNER JOIN workouts ON finished.workouts_id = workouts.id
      WHERE workouts.program_id = $1
        AND finished.execution_day >= $2
        AND finished.execution_day <= $3
        AND finished.unrealized = false
        AND workouts.running = true
      `,
      [programId, startDate, endDateTime],
    );

    let totalDistanceInKm = 0;
    let totalDurationInSeconds = 0;

    finishedTrainings.forEach((item) => {
      totalDistanceInKm += item.distance_in_meters
        ? item.distance_in_meters / 100
        : 0;

      totalDurationInSeconds += item.duration_in_seconds
        ? Number(item.duration_in_seconds)
        : 0;
    });

    const totalDays = finishedTrainings.length;

    // ✅ Conta COMPETIÇÕES em workout + workouts
    const runningRacesResult = await this.finishedRepository.manager.query(
      `
      SELECT COUNT(*) AS total
      FROM (
        SELECT finished.id
        FROM finished
        INNER JOIN workout ON finished.workout_id = workout.id
        WHERE workout.program_id = $1
          AND workout.name = 'COMPETICAO'
          AND workout.running = true
          AND finished.execution_day >= $2
          AND finished.execution_day <= $3
          AND finished.unrealized = false
  
        UNION ALL
  
        SELECT finished.id
        FROM finished
        INNER JOIN workouts ON finished.workouts_id = workouts.id
        WHERE workouts.program_id = $1
          AND workouts.title = 'COMPETICAO'
          AND workouts.running = true
          AND finished.execution_day >= $2
          AND finished.execution_day <= $3
          AND finished.unrealized = false
      ) races
      `,
      [programId, startDate, endDateTime],
    );

    const totalRunningRaces = Number(runningRacesResult[0]?.total || 0);

    return {
      totalDistanceInKm: parseFloat(totalDistanceInKm.toFixed(2)),
      totalDurationInSeconds,
      totalDays,
      totalRunningRaces,
    };
  }

  async findAllByWorkoutId(workoutId: string) {
    const results = await this.finishedRepository
      .createQueryBuilder('finished')
      .leftJoinAndSelect('finished.workouts', 'workouts')
      .where('finished.workouts_id = :workoutId', { workoutId })
      .orderBy('finished.execution_day', 'DESC')
      .getMany();

    if (!results.length) {
      return [];
    }

    const finishedIds = results.map((f) => f.id);

    const comments = await this.commentRepository.find({
      where: { finishedId: In(finishedIds) },
      relations: ['author'],
      order: { createdAt: 'ASC' },
    });

    const commentsByFinished = comments.reduce(
      (acc, comment) => {
        if (!acc[comment.finishedId]) {
          acc[comment.finishedId] = [];
        }
        acc[comment.finishedId].push({
          id: comment.id,
          content: comment.content,
          isAdmin: comment.isAdmin,
          read: comment.read,
          parentId: comment.parentId,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          author: {
            id: comment.author.id,
            name: comment.author.name,
            email: comment.author.email,
            avatar: comment.author.avatar,
          },
        });
        return acc;
      },
      {} as Record<number, any[]>,
    );

    return results.map((finished) => ({
      id: finished.id,
      workoutsId: finished.workoutsId,
      executionDay: finished.executionDay,
      distance: finished.distance,
      duration: finished.duration,
      pace: finished.pace,
      link: finished.link,
      linkstrava: finished.linkstrava,
      summaryPolyline: finished.summaryPolyline,
      rpe: finished.rpe,
      trimp: finished.trimp,
      review: finished.review,
      unrealized: finished.unrealized,
      outdoor: finished.outdoor,
      intensities: finished.intensities,
      unitMeasurement: finished.unitMeasurement,
      typeWorkout: finished.typeWorkout,
      distanceInMeters: finished.distanceInMeters,
      durationInSeconds: finished.durationInSeconds,
      paceInSeconds: finished.paceInSeconds,
      coolDownDuration: finished.coolDownDuration,
      coolDownIntensities: finished.coolDownIntensities,
      warmUpDuration: finished.warmUpDuration,
      warmUpIntensities: finished.warmUpIntensities,
      checkList: finished.checkList,
      createdAt: finished.createdAt,
      updatedAt: finished.updatedAt,
      workout: {
        title: finished.workouts?.title ?? null,
        subtitle: finished.workouts?.subtitle ?? null,
      },
      comments: commentsByFinished[finished.id] || [],
    }));
  }
}
