import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterTableWorkoutItens1746991589785 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "workout_items"
            ADD COLUMN "media_order" JSONB;
          `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "workout_items"
        DROP COLUMN "media_order";
      `);
  }
}
