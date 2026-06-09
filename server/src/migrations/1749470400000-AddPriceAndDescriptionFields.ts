import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPriceAndDescriptionFields1749470400000 implements MigrationInterface {
  name = 'AddPriceAndDescriptionFields1749470400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Добавляем новые колонки цен
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "wholesale_price" TEXT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "retail_price" TEXT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "additional_description" TEXT DEFAULT NULL
    `);

    // Копируем старую цену в обе новые колонки, чтобы не потерять данные
    await queryRunner.query(`
      UPDATE "products"
      SET
        "wholesale_price" = "price",
        "retail_price"    = "price"
      WHERE "price" IS NOT NULL AND "price" != ''
    `);

    // Удаляем старую колонку price
    await queryRunner.query(`
      ALTER TABLE "products" DROP COLUMN IF EXISTS "price"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Возвращаем колонку price из retail_price
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "price" TEXT NOT NULL DEFAULT ''
    `);

    await queryRunner.query(`
      UPDATE "products"
      SET "price" = COALESCE("retail_price", "wholesale_price", '')
    `);

    // Убираем NOT NULL DEFAULT после заполнения
    await queryRunner.query(`
      ALTER TABLE "products"
      ALTER COLUMN "price" DROP DEFAULT
    `);

    // Удаляем новые колонки
    await queryRunner.query(`
      ALTER TABLE "products"
      DROP COLUMN IF EXISTS "wholesale_price",
      DROP COLUMN IF EXISTS "retail_price",
      DROP COLUMN IF EXISTS "additional_description"
    `);
  }
}
