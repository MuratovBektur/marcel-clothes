import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGenderField1781187240000 implements MigrationInterface {
  name = 'AddGenderField1781187240000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "gender" TEXT DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
      DROP COLUMN IF EXISTS "gender"
    `);
  }
}
