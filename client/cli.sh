# получем имя докер композера 
# (либо docker compose либо docker-compose)
# по которому можно обращяться
source ../docker-compose-name.sh;

DOCKER_COMPOSE_FILE='../docker-compose.local.yml';

# Добавляем флаг --user root
"${DOCKER_COMPOSE[@]}" -f "$DOCKER_COMPOSE_FILE" exec --user root client "$@"