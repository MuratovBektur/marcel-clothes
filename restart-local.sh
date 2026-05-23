git pull;

# получем имя докер композера 
# (либо docker compose либо docker-compose)
# по которому можно обращяться
source docker-compose-name.sh;

"${DOCKER_COMPOSE[@]}" -f docker-compose.local.yml down -v;
"${DOCKER_COMPOSE[@]}" -f docker-compose.local.yml up -d --build;
"${DOCKER_COMPOSE[@]}" -f docker-compose.local.yml logs -f --tail=100;