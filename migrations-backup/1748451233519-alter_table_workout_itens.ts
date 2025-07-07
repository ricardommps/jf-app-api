import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterTableWorkoutItens1748451233519 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE public.workout_items
            ADD COLUMN _id integer;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE public.workout
        DROP COLUMN _id;
    `);
  }
}
