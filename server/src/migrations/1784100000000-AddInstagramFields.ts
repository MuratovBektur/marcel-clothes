import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInstagramFields1784100000000 implements MigrationInterface {
  name = 'AddInstagramFields1784100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "instagram_media_id" TEXT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "instagram_permalink" TEXT DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
      DROP COLUMN IF EXISTS "instagram_media_id",
      DROP COLUMN IF EXISTS "instagram_permalink"
    `);
  }
}
