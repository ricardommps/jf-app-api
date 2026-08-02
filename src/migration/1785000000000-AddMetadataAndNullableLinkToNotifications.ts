import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMetadataAndNullableLinkToNotifications1785000000000
  implements MigrationInterface
{
  name = 'AddMetadataAndNullableLinkToNotifications1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notifications"
      ALTER COLUMN "link" DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications"
      ADD COLUMN "metadata" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notifications"
      DROP COLUMN IF EXISTS "metadata"
    `);

    await queryRunner.query(`
      UPDATE "notifications"
      SET "link" = ''
      WHERE "link" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications"
      ALTER COLUMN "link" SET NOT NULL
    `);
  }
}
