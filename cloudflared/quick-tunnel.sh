#!/bin/sh
# Поднимает бесплатный Cloudflare Quick Tunnel на nginx и пишет выданный
# адрес (https://<случайные-слова>.trycloudflare.com) в общий файл, который
# server читает при каждой публикации в Instagram/Facebook/глобальный маркет
# (см. server/src/libs/public-url.ts) — без ручной правки .env.local.
#
# Quick Tunnel — бесплатный режим без аккаунта Cloudflare, поэтому при
# каждом перезапуске контейнера адрес будет НОВЫЙ (это ограничение самого
# Cloudflare, не наше). Автоматически поднимается и переподхватывается —
# просто адрес каждый раз новый.
set -eu

URL_FILE="${TUNNEL_URL_FILE:-/tunnel/url.txt}"
TARGET_URL="${TUNNEL_TARGET_URL:-http://nginx:80}"

: > "$URL_FILE"

cloudflared tunnel --url "$TARGET_URL" --no-autoupdate 2>&1 | while IFS= read -r line; do
  echo "$line"
  url=$(echo "$line" | grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' || true)
  if [ -n "$url" ]; then
    echo "$url" > "$URL_FILE"
    echo "[quick-tunnel] PUBLIC_URL готов: $url"
  fi
done
