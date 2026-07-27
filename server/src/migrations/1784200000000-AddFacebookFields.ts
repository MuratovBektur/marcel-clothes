import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFacebookFields1784200000000 implements MigrationInterface {
  name = 'AddFacebookFields1784200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "facebook_post_id" TEXT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "facebook_permalink" TEXT DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
      DROP COLUMN IF EXISTS "facebook_post_id",
      DROP COLUMN IF EXISTS "facebook_permalink"
    `);
  }
}
