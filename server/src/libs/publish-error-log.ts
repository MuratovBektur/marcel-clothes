import * as fs from 'fs';
import * as path from 'path';

// Ошибки публикации (Telegram-канал/Instagram/Facebook) пишем ещё и в файл на
// диске — `docker logs` ротируется/пропадает при пересоздании контейнера, а
// этот файл лежит в volume (см. ./logs в docker-compose*.yml) и переживает
// рестарты/деплои, так что историю сбоев публикации можно посмотреть потом.
const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'publish-errors.log');

fs.mkdirSync(LOG_DIR, { recursive: true });

export type PublishPlatform =
  | 'Telegram'
  | 'WhatsApp'
  | 'Instagram'
  | 'Facebook';

export function logPublishError(
  platform: PublishPlatform,
  productId: string | null | undefined,
  err: unknown,
): void {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  // Graph API (Instagram/Facebook) кладёт детали ошибки сюда — без этого в
  // логе остаётся бесполезное "Request failed with status code 400".
  const graphError = (err as any)?.response?.data?.error;

  const entry = {
    time: new Date().toISOString(),
    platform,
    productId: productId ?? null,
    message,
    ...(graphError ? { graphError } : {}),
    ...(stack ? { stack } : {}),
  };

  try {
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
  } catch {
    // Диск недоступен/переполнен — не роняем публикацию из-за файла с логами,
    // ошибка и так уходит в консоль/Logger вызывающей стороной.
  }
}

/**
 * Короткое человекочитаемое сообщение об ошибке — чтобы показать причину
 * прямо в чате бота, а не только в консоли/файле (админ не читает `docker logs`).
 */
export function shortErrorMessage(err: unknown, maxLength = 200): string {
  const graphError = (err as any)?.response?.data?.error as
    | { error_user_msg?: string; message?: string }
    | undefined;
  const raw: string =
    graphError?.error_user_msg ||
    graphError?.message ||
    (err instanceof Error ? err.message : String(err));
  return raw.length > maxLength ? `${raw.slice(0, maxLength)}…` : raw;
}
