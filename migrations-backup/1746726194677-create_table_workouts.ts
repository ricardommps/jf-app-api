import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableWorkouts1746726194677 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        `);
    await queryRunner.query(`
        CREATE TABLE "workouts" (
            "id" UUID DEFAULT uuid_generate_v4(),
            "program_id" INTEGER NOT NULL,
            "title" character varying NOT NULL,
            "subtitle" character varying NOT NULL,
            "description" character varying NOT NULL,
            "heating" character varying NOT NULL,
            "recovery" character varying NOT NULL,
            "published" boolean NOT NULL,
            "hide" boolean NOT NULL,
            "finished" boolean NOT NULL,
            "unrealized" boolean NOT NULL,
            "running" boolean NOT NULL,
            "date_published" TIMESTAMP NOT NULL,
            "workout_date_other" TIMESTAMP NOT NULL,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_workouts_id" PRIMARY KEY ("id"),
            CONSTRAINT "FK_workouts_program" FOREIGN KEY ("program_id") REFERENCES "program"("id") ON DELETE CASCADE
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "workouts"`);
  }
}
