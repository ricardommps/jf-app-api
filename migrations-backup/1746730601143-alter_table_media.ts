import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterTableMedia1746730601143 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "media"
            ADD COLUMN "workout_item_id" UUID;
      
            ALTER TABLE "media"
            ADD CONSTRAINT "FK_media_workout_item"
            FOREIGN KEY ("workout_item_id") REFERENCES "workout_items"("id") ON DELETE CASCADE;
          `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "media"
        DROP CONSTRAINT "FK_media_workout_item";
  
        ALTER TABLE "media"
        DROP COLUMN "workout_item_id";
      `);
  }
}
