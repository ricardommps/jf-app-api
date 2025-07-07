import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableWorkoutItems1746728038308
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "workout_items" (
              "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
              "workout_id" UUID NOT NULL,
              "category" VARCHAR NOT NULL,
              "description" VARCHAR NOT NULL,
              CONSTRAINT "PK_workout_items_id" PRIMARY KEY ("id"),
              CONSTRAINT "FK_workout_items_workout" FOREIGN KEY ("workout_id")
                REFERENCES "workouts"("id") ON DELETE CASCADE
            );
          `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "workout_items"`);
  }
}
