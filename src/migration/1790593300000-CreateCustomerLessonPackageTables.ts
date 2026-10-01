import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCustomerLessonPackageTables1790593300000 implements MigrationInterface {
  name = 'CreateCustomerLessonPackageTables1790593300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "customer_lesson_package_status" AS ENUM (
        'active',
        'paused',
        'finished'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "customer_lesson_package_class_status" AS ENUM (
        'scheduled',
        'pending',
        'finished',
        'canceled'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "customer_lesson_package_class_type" AS ENUM (
        'regular',
        'pending',
        'barter'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "customer_lesson_packages" (
        "id" SERIAL PRIMARY KEY,
        "customer_id" integer NOT NULL,
        "created_by_id" integer,
        "title" varchar NOT NULL,
        "description" varchar,
        "lesson_unit_price" numeric(10, 2) NOT NULL,
        "status" "customer_lesson_package_status" NOT NULL DEFAULT 'active',
        "total_lessons" integer NOT NULL DEFAULT 0,
        "paid_lessons" integer NOT NULL DEFAULT 0,
        "total_amount" numeric(10, 2) NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_customer_lesson_packages_customer"
          FOREIGN KEY ("customer_id")
          REFERENCES "customer"("id")
          ON DELETE CASCADE,
        CONSTRAINT "fk_customer_lesson_packages_created_by"
          FOREIGN KEY ("created_by_id")
          REFERENCES "user"("id")
          ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "customer_lesson_package_classes" (
        "id" SERIAL PRIMARY KEY,
        "package_id" integer NOT NULL,
        "customer_id" integer NOT NULL,
        "scheduled_date" date NOT NULL,
        "scheduled_time" time,
        "type" "customer_lesson_package_class_type" NOT NULL DEFAULT 'regular',
        "status" "customer_lesson_package_class_status" NOT NULL DEFAULT 'scheduled',
        "notes" varchar,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_customer_lesson_package_classes_package"
          FOREIGN KEY ("package_id")
          REFERENCES "customer_lesson_packages"("id")
          ON DELETE CASCADE,
        CONSTRAINT "fk_customer_lesson_package_classes_customer"
          FOREIGN KEY ("customer_id")
          REFERENCES "customer"("id")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "customer_lesson_package_pending_classes" (
        "id" SERIAL PRIMARY KEY,
        "package_id" integer NOT NULL,
        "class_id" integer,
        "customer_id" integer NOT NULL,
        "original_scheduled_date" date,
        "rescheduled_date" date,
        "rescheduled_time" time,
        "justification" varchar,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_customer_lesson_package_pending_classes_package"
          FOREIGN KEY ("package_id")
          REFERENCES "customer_lesson_packages"("id")
          ON DELETE CASCADE,
        CONSTRAINT "fk_customer_lesson_package_pending_classes_class"
          FOREIGN KEY ("class_id")
          REFERENCES "customer_lesson_package_classes"("id")
          ON DELETE SET NULL,
        CONSTRAINT "fk_customer_lesson_package_pending_classes_customer"
          FOREIGN KEY ("customer_id")
          REFERENCES "customer"("id")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_customer_lesson_packages_customer_id"
      ON "customer_lesson_packages" ("customer_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_customer_lesson_packages_status"
      ON "customer_lesson_packages" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_customer_lesson_package_classes_package_id"
      ON "customer_lesson_package_classes" ("package_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_customer_lesson_package_classes_customer_id"
      ON "customer_lesson_package_classes" ("customer_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_customer_lesson_package_classes_scheduled_date"
      ON "customer_lesson_package_classes" ("scheduled_date")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_customer_lesson_package_classes_status"
      ON "customer_lesson_package_classes" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_customer_lesson_package_pending_classes_package_id"
      ON "customer_lesson_package_pending_classes" ("package_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_customer_lesson_package_pending_classes_customer_id"
      ON "customer_lesson_package_pending_classes" ("customer_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_customer_lesson_package_pending_classes_rescheduled_date"
      ON "customer_lesson_package_pending_classes" ("rescheduled_date")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_customer_lesson_package_pending_classes_rescheduled_date"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_customer_lesson_package_pending_classes_customer_id"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_customer_lesson_package_pending_classes_package_id"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_customer_lesson_package_classes_status"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_customer_lesson_package_classes_scheduled_date"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_customer_lesson_package_classes_customer_id"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_customer_lesson_package_classes_package_id"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_customer_lesson_packages_status"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_customer_lesson_packages_customer_id"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "customer_lesson_package_pending_classes"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "customer_lesson_package_classes"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "customer_lesson_packages"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "customer_lesson_package_class_type"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "customer_lesson_package_class_status"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "customer_lesson_package_status"
    `);
  }
}
