import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMediaInfoTable1746971201712 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "media_info" (
              "id" SERIAL NOT NULL,
              "workout_item_id" UUID NOT NULL,
              "media_id" integer NOT NULL,
              "method" character varying,
              "reps" character varying,
              "reset" character varying,
              "rir" character varying,
              "cadence" character varying,
              "comments" text,
              "created_at" TIMESTAMP NOT NULL DEFAULT now(),
              "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
              CONSTRAINT "PK_media_info_id" PRIMARY KEY ("id"),
              CONSTRAINT "FK_media_info_workout_item" FOREIGN KEY ("workout_item_id") REFERENCES "workout_items"("id") ON DELETE CASCADE,
              CONSTRAINT "FK_media_info_media" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE
            );
          `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "media_info"`);
  }
}
