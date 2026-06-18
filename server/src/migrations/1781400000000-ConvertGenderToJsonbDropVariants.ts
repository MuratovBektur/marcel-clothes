import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertGenderToJsonbDropVariants1781400000000 implements MigrationInterface {
  name = 'ConvertGenderToJsonbDropVariants1781400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // gender хранил агрегированную строку ("Для мальчиков, Для подростков") —
    // переводим в jsonb-массив категорий, размеры по категории берём из кода (AGE_CATEGORY_SIZES),
    // отдельная таблица product_variants больше не нужна.
    // На dev-окружениях (synchronize: true) колонка может быть уже переведена в jsonb
    // самим TypeORM при старте сервера — тогда конвертация не нужна (и невозможна).
    const [{ data_type: currentType }] = await queryRunner.query(`
      SELECT data_type FROM information_schema.columns
      WHERE table_name = 'products' AND column_name = 'gender'
    `);
    if (currentType !== 'jsonb') {
      await queryRunner.query(`
        ALTER TABLE "products"
        ALTER COLUMN "gender" TYPE jsonb
        USING CASE WHEN "gender" IS NULL THEN NULL ELSE to_jsonb(string_to_array("gender", ', ')) END
      `);
    }
    await queryRunner.query(`DROP TABLE IF EXISTS "product_variants"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_variants" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "product_id" uuid NOT NULL,
        "gender" text NOT NULL,
        "sizes" jsonb NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_product_variants" PRIMARY KEY ("id"),
        CONSTRAINT "FK_product_variants_product" FOREIGN KEY ("product_id")
          REFERENCES "products"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_product_variants_product_id" ON "product_variants" ("product_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "products"
      ALTER COLUMN "gender" TYPE text
      USING CASE WHEN "gender" IS NULL THEN NULL ELSE array_to_string(
        ARRAY(SELECT jsonb_array_elements_text("gender")), ', '
      ) END
    `);
  }
}
