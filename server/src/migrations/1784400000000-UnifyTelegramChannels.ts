import { MigrationInterface, QueryRunner } from 'typeorm';

export class UnifyTelegramChannels1784400000000 implements MigrationInterface {
  name = 'UnifyTelegramChannels1784400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "telegram_channels" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "chatId" bigint NOT NULL UNIQUE,
        "chatTitle" varchar,
        "addedBy" bigint,
        "createdAt" timestamp NOT NULL DEFAULT now()
      )
    `);

    // Переносим уже настроенные (одним из админов) каналы в общий список,
    // чтобы никто не потерял то, что уже было подключено. На чистой базе (или
    // если dev-синхронизация схемы уже снесла старые колонки раньше, чем
    // отработала эта миграция) bot_user_groups.chatId может не существовать —
    // тогда переносить нечего, пропускаем этот шаг вместо падения с ошибкой.
    const [{ exists }] = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bot_user_groups' AND column_name = 'chatId'
      ) AS exists
    `);

    if (exists) {
      await queryRunner.query(`
        INSERT INTO "telegram_channels" ("chatId", "chatTitle", "addedBy")
        SELECT "chatId", "chatTitle", "telegramId"
        FROM "bot_user_groups"
        WHERE "chatId" IS NOT NULL
        ON CONFLICT ("chatId") DO NOTHING
      `);

      await queryRunner.query(`
        ALTER TABLE "bot_user_groups"
        DROP COLUMN IF EXISTS "chatId",
        DROP COLUMN IF EXISTS "chatTitle"
      `);
    }

    // publishedPost был одиночным объектом {chatId, messageIds} — теперь это
    // массив (товар может публиковаться сразу в несколько каналов).
    await queryRunner.query(`
      UPDATE "products"
      SET "publishedPost" = jsonb_build_array("publishedPost")
      WHERE "publishedPost" IS NOT NULL
        AND jsonb_typeof("publishedPost") = 'object'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "products"
      SET "publishedPost" = "publishedPost"->0
      WHERE "publishedPost" IS NOT NULL
        AND jsonb_typeof("publishedPost") = 'array'
    `);

    await queryRunner.query(`
      ALTER TABLE "bot_user_groups"
      ADD COLUMN IF NOT EXISTS "chatId" bigint,
      ADD COLUMN IF NOT EXISTS "chatTitle" varchar
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "telegram_channels"`);
  }
}
