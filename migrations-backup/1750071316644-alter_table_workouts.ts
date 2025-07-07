import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterTableWorkouts1750071316644 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "workouts"
            DROP COLUMN "is_workout_load";
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "workouts"
        ADD COLUMN "is_workout_load" boolean;
    `);
  }
}
