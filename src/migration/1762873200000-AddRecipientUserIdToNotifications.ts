import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRecipientUserIdToNotifications1762873200000
  implements MigrationInterface
{
  name = 'AddRecipientUserIdToNotifications1762873200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notifications"
      ALTER COLUMN "recipient_id" DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications"
      ADD COLUMN "recipient_user_id" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications"
      ADD CONSTRAINT "FK_notifications_recipient_user_id"
      FOREIGN KEY ("recipient_user_id")
      REFERENCES "user"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_recipient_user_id"
      ON "notifications" ("recipient_user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_notifications_recipient_user_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications"
      DROP CONSTRAINT IF EXISTS "FK_notifications_recipient_user_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications"
      DROP COLUMN IF EXISTS "recipient_user_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications"
      ALTER COLUMN "recipient_id" SET NOT NULL
    `);
  }
}
