import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterTableWorkoutItens1750071384590 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.workout_items
      ADD COLUMN is_workout_load boolean;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.workout_items
      DROP COLUMN is_workout_load;
  `);
  }
}
