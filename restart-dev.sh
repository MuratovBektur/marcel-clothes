git pull;

# билдим клиент в папку client/dist
# чтобы потом вставить её в nginx контейнер
cd client;
source ./build.sh;
cd ..;


# Получаем имя docker compose команды
# (либо docker compose либо docker-compose)
source docker-compose-name.sh;

"${DOCKER_COMPOSE[@]}" -f docker-compose.dev.yml down -v;
"${DOCKER_COMPOSE[@]}" -f docker-compose.dev.yml up -d --build;
"${DOCKER_COMPOSE[@]}" -f docker-compose.dev.yml logs -f --tail=100;