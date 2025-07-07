import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateMediaFk1746792408553 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Primeiro, remova a constraint antiga
    await queryRunner.query(`
        ALTER TABLE "media"
        DROP CONSTRAINT IF EXISTS "FK_media_workout_item_id";
      `);

    // Depois, crie uma nova constraint com ON DELETE SET NULL
    await queryRunner.query(`
        ALTER TABLE "media"
        ADD CONSTRAINT "FK_media_workout_item_id"
        FOREIGN KEY ("workout_item_id") REFERENCES "workout_items"("id")
        ON DELETE SET NULL;
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverte para o comportamento anterior, se necessário
    await queryRunner.query(`
    ALTER TABLE "media"
    DROP CONSTRAINT IF EXISTS "FK_media_workout_item_id";
  `);

    await queryRunner.query(`
    ALTER TABLE "media"
    ADD CONSTRAINT "FK_media_workout_item_id"
    FOREIGN KEY ("workout_item_id") REFERENCES "workout_items"("id")
    ON DELETE CASCADE;
  `);
  }
}
