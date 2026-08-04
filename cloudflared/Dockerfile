# Официальный образ cloudflare/cloudflared — минимальный (без shell), поэтому
# просто копируем бинарник в alpine, где есть sh/grep для quick-tunnel.sh
# (парсит адрес туннеля из вывода и пишет в общий файл для server).
FROM cloudflare/cloudflared:latest AS cf

FROM alpine:latest
RUN apk add --no-cache ca-certificates
COPY --from=cf /usr/local/bin/cloudflared /usr/local/bin/cloudflared
COPY quick-tunnel.sh /quick-tunnel.sh
RUN chmod +x /quick-tunnel.sh
ENTRYPOINT ["/quick-tunnel.sh"]
