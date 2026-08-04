import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPublishLastErrorFields1784300000000 implements MigrationInterface {
  name = 'AddPublishLastErrorFields1784300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "telegram_last_error" TEXT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "whatsapp_last_error" TEXT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "instagram_last_error" TEXT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "facebook_last_error" TEXT DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
      DROP COLUMN IF EXISTS "telegram_last_error",
      DROP COLUMN IF EXISTS "whatsapp_last_error",
      DROP COLUMN IF EXISTS "instagram_last_error",
      DROP COLUMN IF EXISTS "facebook_last_error"
    `);
  }
}
