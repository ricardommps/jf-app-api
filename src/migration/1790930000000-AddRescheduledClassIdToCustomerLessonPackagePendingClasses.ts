import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRescheduledClassIdToCustomerLessonPackagePendingClasses1790930000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "customer_lesson_package_pending_classes"
      ADD COLUMN "rescheduled_class_id" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "customer_lesson_package_pending_classes"
      ADD CONSTRAINT "fk_customer_lesson_package_pending_classes_rescheduled_class"
      FOREIGN KEY ("rescheduled_class_id")
      REFERENCES "customer_lesson_package_classes"("id")
      ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_customer_lesson_package_pending_classes_rescheduled_class_id"
      ON "customer_lesson_package_pending_classes" ("rescheduled_class_id")
      WHERE "rescheduled_class_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_customer_lesson_package_pending_classes_rescheduled_class_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "customer_lesson_package_pending_classes"
      DROP CONSTRAINT IF EXISTS "fk_customer_lesson_package_pending_classes_rescheduled_class"
    `);

    await queryRunner.query(`
      ALTER TABLE "customer_lesson_package_pending_classes"
      DROP COLUMN IF EXISTS "rescheduled_class_id"
    `);
  }
}
