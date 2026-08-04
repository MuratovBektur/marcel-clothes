import * as fs from 'fs';

// Прод/dev — обычный PUBLIC_URL из .env (marcel.kg). Локально вместо ручной
// правки .env.local при каждом перезапуске Cloudflare Quick Tunnel — сервис
// cloudflared (см. docker-compose.local.yml, cloudflared/quick-tunnel.sh)
// сам пишет актуальный адрес в общий файл; читаем его тут заново при КАЖДОМ
// вызове (не кэшируем!), чтобы подхватывать новый адрес без пересборки —
// в проде/деве этого файла просто нет, и всегда используется PUBLIC_URL.
const TUNNEL_URL_FILE = process.env.TUNNEL_URL_FILE || '/tunnel/url.txt';
const DEFAULT_PUBLIC_URL = process.env.PUBLIC_URL ?? 'https://marcel.kg';

/** Публичный домен для абсолютных ссылок на фото/видео (Instagram/Facebook/глобальный маркет). */
export function getPublicUrl(): string {
  try {
    const fromTunnel = fs.readFileSync(TUNNEL_URL_FILE, 'utf-8').trim();
    if (fromTunnel) return fromTunnel;
  } catch {
    // файла нет — локальный туннель не поднят, используем обычное значение
  }
  return DEFAULT_PUBLIC_URL;
}
