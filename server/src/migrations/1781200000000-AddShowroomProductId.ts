import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShowroomProductId1781200000000 implements MigrationInterface {
  name = 'AddShowroomProductId1781200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "showroom_product_id" TEXT DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
      DROP COLUMN IF EXISTS "showroom_product_id"
    `);
  }
}
