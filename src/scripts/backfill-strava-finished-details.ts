import axios from 'axios';
import { AppDataSource } from '../data-source';
import { FinishedEntity } from '../entities/finished.entity';
import { StravaConnectionEntity } from '../entities/strava-connection.entity';

type CliOptions = {
  dryRun: boolean;
  force: boolean;
  limit: number;
  finishedId?: number;
};

type CandidateRow = {
  finishedId: number;
  customerId: number | null;
  linkStrava: string;
  summaryPolyline: string | null;
  externalId: string | number | null;
  source: string | null;
  stravaActivityName: string | null;
  stravaActivityType: string | null;
  stravaSportType: string | null;
  stravaWorkoutType: number | null;
  stravaDeviceName: string | null;
  stravaTimezone: string | null;
  stravaStartDate: string | null;
  stravaStartDateLocal: string | null;
  elapsedTimeInSeconds: string | number | null;
  totalElevationGain: string | number | null;
  averageHeartrate: string | number | null;
  maxHeartrate: string | number | null;
  averageCadence: string | number | null;
  calories: string | number | null;
  startLatitude: string | number | null;
  startLongitude: string | number | null;
  endLatitude: string | number | null;
  endLongitude: string | number | null;
  locationLabel: string | null;
  locationCity: string | null;
  locationState: string | null;
  locationCountry: string | null;
};

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

const getArgValue = (flag: string): string | undefined => {
  const arg = process.argv.find((item) => item === flag || item.startsWith(`${flag}=`));

  if (!arg) {
    return undefined;
  }

  if (arg === flag) {
    const index = process.argv.indexOf(arg);
    return process.argv[index + 1];
  }

  return arg.slice(flag.length + 1);
};

const parseOptions = (): CliOptions => {
  const limitValue = getArgValue('--limit');
  const finishedIdValue = getArgValue('--finished-id');

  return {
    dryRun: process.argv.includes('--dry-run'),
    force: process.argv.includes('--force'),
    limit:
      limitValue && !Number.isNaN(Number(limitValue))
        ? Math.max(1, Number(limitValue))
        : 50,
    finishedId:
      finishedIdValue && !Number.isNaN(Number(finishedIdValue))
        ? Number(finishedIdValue)
        : undefined,
  };
};

const extractActivityId = (linkStrava: string): number | null => {
  const normalizedLink = linkStrava.trim();
  const match =
    normalizedLink.match(/activities\/(\d+)/i) ??
    normalizedLink.match(/(\d+)(?!.*\d)/);

  if (!match?.[1]) {
    return null;
  }

  const activityId = Number(match[1]);
  return Number.isNaN(activityId) ? null : activityId;
};

const hasText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const hasValue = (value: unknown): boolean =>
  value !== null &&
  value !== undefined &&
  (!(typeof value === 'string') || value.trim().length > 0);

const toOptionalNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const numericValue = Number(value);
  return Number.isNaN(numericValue) ? undefined : numericValue;
};

const toOptionalDate = (value: unknown): Date | undefined => {
  if (!hasText(value)) {
    return undefined;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate;
};

const buildLocationLabel = (activity: StravaActivity): string | undefined => {
  const parts = [
    activity.location_city?.trim(),
    activity.location_state?.trim(),
    activity.location_country?.trim(),
  ].filter(Boolean);

  return parts.length ? parts.join(', ') : undefined;
};

const pendingBackfillConditionSql = `
  NOT (
    NULLIF(BTRIM(COALESCE(f.summary_polyline, '')), '') IS NOT NULL AND
    f.external_id IS NOT NULL AND
    NULLIF(BTRIM(COALESCE(f.source, '')), '') IS NOT NULL AND
    NULLIF(BTRIM(COALESCE(f.strava_activity_name, '')), '') IS NOT NULL AND
    NULLIF(BTRIM(COALESCE(f.strava_activity_type, '')), '') IS NOT NULL AND
    NULLIF(BTRIM(COALESCE(f.strava_sport_type, '')), '') IS NOT NULL AND
    f.strava_start_date IS NOT NULL AND
    f.strava_start_date_local IS NOT NULL AND
    f.elapsed_time_in_seconds IS NOT NULL AND
    f.total_elevation_gain IS NOT NULL AND
    f.start_latitude IS NOT NULL AND
    f.start_longitude IS NOT NULL AND
    f.end_latitude IS NOT NULL AND
    f.end_longitude IS NOT NULL
  )
`;

const needsBackfill = (candidate: CandidateRow): boolean => {
  return !(
    hasValue(candidate.summaryPolyline) &&
    hasValue(candidate.externalId) &&
    hasValue(candidate.source) &&
    hasValue(candidate.stravaActivityName) &&
    hasValue(candidate.stravaActivityType) &&
    hasValue(candidate.stravaSportType) &&
    hasValue(candidate.stravaStartDate) &&
    hasValue(candidate.stravaStartDateLocal) &&
    hasValue(candidate.elapsedTimeInSeconds) &&
    hasValue(candidate.totalElevationGain) &&
    hasValue(candidate.startLatitude) &&
    hasValue(candidate.startLongitude) &&
    hasValue(candidate.endLatitude) &&
    hasValue(candidate.endLongitude)
  );
};

const getCandidates = async (options: CliOptions): Promise<CandidateRow[]> => {
  const params: Array<number> = [];
  const conditions = [`NULLIF(BTRIM(f.linkstrava), '') IS NOT NULL`];

  if (!options.force) {
    conditions.push(pendingBackfillConditionSql);
  }

  if (options.finishedId) {
    params.push(options.finishedId);
    conditions.push(`f.id = $${params.length}`);
  }

  params.push(options.limit);

  return AppDataSource.manager.query(
    `
      SELECT
        f.id AS "finishedId",
        COALESCE(pws.customer_id, pw.customer_id) AS "customerId",
        f.linkstrava AS "linkStrava",
        f.summary_polyline AS "summaryPolyline",
        f.external_id AS "externalId",
        f.source AS "source",
        f.strava_activity_name AS "stravaActivityName",
        f.strava_activity_type AS "stravaActivityType",
        f.strava_sport_type AS "stravaSportType",
        f.strava_workout_type AS "stravaWorkoutType",
        f.strava_device_name AS "stravaDeviceName",
        f.strava_timezone AS "stravaTimezone",
        f.strava_start_date AS "stravaStartDate",
        f.strava_start_date_local AS "stravaStartDateLocal",
        f.elapsed_time_in_seconds AS "elapsedTimeInSeconds",
        f.total_elevation_gain AS "totalElevationGain",
        f.average_heartrate AS "averageHeartrate",
        f.max_heartrate AS "maxHeartrate",
        f.average_cadence AS "averageCadence",
        f.calories AS "calories",
        f.start_latitude AS "startLatitude",
        f.start_longitude AS "startLongitude",
        f.end_latitude AS "endLatitude",
        f.end_longitude AS "endLongitude",
        f.location_label AS "locationLabel",
        f.location_city AS "locationCity",
        f.location_state AS "locationState",
        f.location_country AS "locationCountry"
      FROM finished f
      LEFT JOIN workouts ws ON ws.id = f.workouts_id
      LEFT JOIN program pws ON pws.id = ws.program_id
      LEFT JOIN workout w ON w.id = f.workout_id
      LEFT JOIN program pw ON pw.id = w.program_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY f.execution_day DESC
      LIMIT $${params.length}
    `,
    params,
  );
};

const refreshTokenIfNeeded = async (
  connection: StravaConnectionEntity,
  stravaRepo,
): Promise<StravaConnectionEntity> => {
  const nowInSeconds = Math.floor(Date.now() / 1000);

  if (Number(connection.expiresAt) > nowInSeconds) {
    return connection;
  }

  const clientId = process.env.STRAVA_CLIENT_ID ?? '';
  const clientSecret = process.env.STRAVA_CLIENT_SECRET ?? '';

  if (!clientId || !clientSecret) {
    throw new Error('STRAVA_CLIENT_ID ou STRAVA_CLIENT_SECRET não configurados');
  }

  const refreshParams = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: connection.refreshToken,
    grant_type: 'refresh_token',
  });

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

  return stravaRepo.save(connection);
};

const fetchActivity = async (
  activityId: number,
  accessToken: string,
): Promise<StravaActivity> => {
  const response = await axios.get<StravaActivity>(
    `https://www.strava.com/api/v3/activities/${activityId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  return response.data;
};

const main = async () => {
  const options = parseOptions();

  await AppDataSource.initialize();
  const finishedRepo = AppDataSource.getRepository(FinishedEntity);
  const stravaRepo = AppDataSource.getRepository(StravaConnectionEntity);

  console.log('[backfill] options:', options);

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const candidates = await getCandidates(options);
    const filteredCandidates = options.force
      ? candidates
      : candidates.filter(needsBackfill);

    console.log(
      `[backfill] candidatos encontrados: ${candidates.length}; após filtro: ${filteredCandidates.length}`,
    );

    for (const candidate of filteredCandidates) {
      processed += 1;

      const activityId = extractActivityId(candidate.linkStrava);

      if (!activityId) {
        skipped += 1;
        console.warn(
          `[backfill] finished ${candidate.finishedId} ignorado: activityId não pôde ser extraído de ${candidate.linkStrava}`,
        );
        continue;
      }

      if (!candidate.customerId) {
        skipped += 1;
        console.warn(
          `[backfill] finished ${candidate.finishedId} ignorado: customerId não encontrado`,
        );
        continue;
      }

      try {
        let connection = await stravaRepo.findOne({
          where: { customerId: candidate.customerId },
        });

        if (!connection) {
          skipped += 1;
          console.warn(
            `[backfill] finished ${candidate.finishedId} ignorado: conexão Strava não encontrada para customer ${candidate.customerId}`,
          );
          continue;
        }

        connection = await refreshTokenIfNeeded(connection, stravaRepo);

        const activity = await fetchActivity(activityId, connection.accessToken);

        const locationLabel = buildLocationLabel(activity);
        const patch: Partial<FinishedEntity> = {
          id: candidate.finishedId,
          externalId: toOptionalNumber(activity.id) ?? toOptionalNumber(candidate.externalId),
          source: hasText(candidate.source) ? candidate.source : 'strava',
          summaryPolyline:
            activity.map?.summary_polyline?.trim() ||
            candidate.summaryPolyline ||
            null,
          stravaActivityName: activity.name?.trim() || undefined,
          stravaActivityType: activity.type?.trim() || undefined,
          stravaSportType: activity.sport_type?.trim() || undefined,
          stravaWorkoutType: toOptionalNumber(activity.workout_type),
          stravaDeviceName: activity.device_name?.trim() || undefined,
          stravaTimezone: activity.timezone?.trim() || undefined,
          stravaStartDate: toOptionalDate(activity.start_date),
          stravaStartDateLocal: toOptionalDate(activity.start_date_local),
          elapsedTimeInSeconds: toOptionalNumber(activity.elapsed_time),
          totalElevationGain: toOptionalNumber(activity.total_elevation_gain),
          averageHeartrate: toOptionalNumber(activity.average_heartrate),
          maxHeartrate: toOptionalNumber(activity.max_heartrate),
          averageCadence: toOptionalNumber(activity.average_cadence),
          calories: toOptionalNumber(activity.calories),
          startLatitude: toOptionalNumber(activity.start_latlng?.[0]),
          startLongitude: toOptionalNumber(activity.start_latlng?.[1]),
          endLatitude: toOptionalNumber(activity.end_latlng?.[0]),
          endLongitude: toOptionalNumber(activity.end_latlng?.[1]),
          locationLabel,
          locationCity: activity.location_city?.trim() || undefined,
          locationState: activity.location_state?.trim() || undefined,
          locationCountry: activity.location_country?.trim() || undefined,
        };

        if (options.dryRun) {
          console.log('[backfill][dry-run]', {
            finishedId: candidate.finishedId,
            activityId,
            patch,
          });
          continue;
        }

        await finishedRepo.save(patch);
        updated += 1;
        console.log(
          `[backfill] finished ${candidate.finishedId} atualizado com atividade ${activityId}`,
        );
      } catch (error) {
        failed += 1;
        const message =
          axios.isAxiosError(error) && error.response
            ? `${error.response.status} ${JSON.stringify(error.response.data)}`
            : error instanceof Error
              ? error.message
              : 'erro desconhecido';

        console.error(
          `[backfill] falha no finished ${candidate.finishedId}: ${message}`,
        );
      }
    }
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }

  console.log(
    `[backfill] resumo -> processados: ${processed}, atualizados: ${updated}, ignorados: ${skipped}, falhas: ${failed}`,
  );
};

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('[backfill] erro fatal:', error);
    process.exit(1);
  });
