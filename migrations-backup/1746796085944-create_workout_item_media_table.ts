import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWorkoutItemMediaTable1746796085944
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE "workout_item_media_entity" (
          "workoutItemId" UUID NOT NULL,
          "mediaId" INT NOT NULL,
          PRIMARY KEY ("workoutItemId", "mediaId"),
          FOREIGN KEY ("workoutItemId") REFERENCES "workout_items"("id") ON DELETE CASCADE,
          FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE CASCADE
        )
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP TABLE "workout_item_media_entity";
      `);
  }
}
