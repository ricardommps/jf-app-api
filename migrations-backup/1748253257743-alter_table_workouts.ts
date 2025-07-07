import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterTableWorkouts1748253257743 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE public.workouts
            ADD COLUMN display_order integer;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE public.workout
        DROP COLUMN display_order;
    `);
  }
}
