import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWarningsToCustomerLessonPackages1790841600000
  implements MigrationInterface
{
  name = 'AddWarningsToCustomerLessonPackages1790841600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "customer_lesson_packages"
      ADD COLUMN "warnings" varchar
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "customer_lesson_packages"
      DROP COLUMN IF EXISTS "warnings"
    `);
  }
}
