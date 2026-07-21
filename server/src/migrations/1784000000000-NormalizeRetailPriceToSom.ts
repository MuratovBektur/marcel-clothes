import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizeRetailPriceToSom1784000000000 implements MigrationInterface {
  name = 'NormalizeRetailPriceToSom1784000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Розница — только локальный рынок, валюта всегда сом.
    // Заменяем валюту в уже сохранённых ценах на "сом", число не трогаем.
    await queryRunner.query(`
      UPDATE "products"
      SET "retail_price" = TRIM(SPLIT_PART("retail_price", ' ', 1)) || ' сом'
      WHERE "retail_price" IS NOT NULL AND "retail_price" != ''
    `);
  }

  public async down(): Promise<void> {
    // Исходная валюта каждой цены не сохранялась отдельно — откат невозможен.
  }
}
