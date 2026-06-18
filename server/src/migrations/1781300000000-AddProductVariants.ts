import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductVariants1781300000000 implements MigrationInterface {
  name = 'AddProductVariants1781300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "product_variants"`);
  }
}
