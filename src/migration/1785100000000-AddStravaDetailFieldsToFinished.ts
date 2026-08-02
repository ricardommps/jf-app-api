import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStravaDetailFieldsToFinished1785100000000
  implements MigrationInterface
{
  name = 'AddStravaDetailFieldsToFinished1785100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "finished"
      ADD COLUMN "strava_activity_name" varchar
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      ADD COLUMN "strava_activity_type" varchar
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      ADD COLUMN "strava_sport_type" varchar
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      ADD COLUMN "strava_workout_type" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      ADD COLUMN "strava_device_name" varchar
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      ADD COLUMN "strava_timezone" varchar
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      ADD COLUMN "strava_start_date" timestamptz
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      ADD COLUMN "strava_start_date_local" timestamptz
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      ADD COLUMN "elapsed_time_in_seconds" numeric(10, 2)
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      ADD COLUMN "total_elevation_gain" numeric(10, 2)
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      ADD COLUMN "average_heartrate" numeric(10, 2)
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      ADD COLUMN "max_heartrate" numeric(10, 2)
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      ADD COLUMN "average_cadence" numeric(10, 2)
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      ADD COLUMN "calories" numeric(10, 2)
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      ADD COLUMN "start_latitude" numeric(9, 6)
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      ADD COLUMN "start_longitude" numeric(9, 6)
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      ADD COLUMN "end_latitude" numeric(9, 6)
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      ADD COLUMN "end_longitude" numeric(9, 6)
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      ADD COLUMN "location_label" varchar
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      ADD COLUMN "location_city" varchar
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      ADD COLUMN "location_state" varchar
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      ADD COLUMN "location_country" varchar
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "finished"
      DROP COLUMN IF EXISTS "location_country"
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      DROP COLUMN IF EXISTS "location_state"
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      DROP COLUMN IF EXISTS "location_city"
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      DROP COLUMN IF EXISTS "location_label"
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      DROP COLUMN IF EXISTS "end_longitude"
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      DROP COLUMN IF EXISTS "end_latitude"
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      DROP COLUMN IF EXISTS "start_longitude"
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      DROP COLUMN IF EXISTS "start_latitude"
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      DROP COLUMN IF EXISTS "calories"
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      DROP COLUMN IF EXISTS "average_cadence"
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      DROP COLUMN IF EXISTS "max_heartrate"
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      DROP COLUMN IF EXISTS "average_heartrate"
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      DROP COLUMN IF EXISTS "total_elevation_gain"
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      DROP COLUMN IF EXISTS "elapsed_time_in_seconds"
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      DROP COLUMN IF EXISTS "strava_start_date_local"
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      DROP COLUMN IF EXISTS "strava_start_date"
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      DROP COLUMN IF EXISTS "strava_timezone"
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      DROP COLUMN IF EXISTS "strava_device_name"
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      DROP COLUMN IF EXISTS "strava_workout_type"
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      DROP COLUMN IF EXISTS "strava_sport_type"
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      DROP COLUMN IF EXISTS "strava_activity_type"
    `);

    await queryRunner.query(`
      ALTER TABLE "finished"
      DROP COLUMN IF EXISTS "strava_activity_name"
    `);
  }
}
