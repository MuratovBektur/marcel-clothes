# marcel-clothes

## Before FIRST launching into mode with ssl

1. Delete cerbot folder (nginx/certbot) if it exists
2. Change nginx settings to work only in http1 mode in nginx/prod/config.conf file (you can comment 5-18 line)
3. Run app with command "./restart.sh"
4. Change the "server_name" field in nginx/prod/config.conf to your domain names and and after the path /etc/letsencrypt/live/ to the ssl_certificate field and ssl_certificate_key field
5. Change the "init-letsencrypt.sh" file where you must change the "domains" field to your domain names and change the email field to your email
6. Run the command "./init-letsencrypt.sh"
7. Revert old nginx settings with http 2.0 mode in nginx/prod/config.conf file
8. Run app with command "./restart.sh"

## Предварительные требования

### Установите docker и docker compose

### Заполните файл переменнего окружения

1. Создайте файл .env.prod (В режиме локальной разработки .env.local)

2. Заполните файл по аналогии с файлом .env.example


## Запуск 

```bash (если у вас виндовс, то запустите через гит баш)
./restart-local.sh # local dev mode (port - 7000)
```

<br/>

```bash (если у вас виндовс, то запустите через гит баш)
./restart.sh # prod mode (port - 80)
```

## Инструменты разработки

### Для облегчения работы с Express (только в local режиме) в docker контейнере:

1) Перейдите в терминале в папку   сервера:

```bash (если у вас виндовс, то запустите через гит баш)
cd server
```

2) Пропишете нужную команду для сервера:

```bash (если у вас виндовс, то запустите через гит баш)
./cli.sh your_command # например ./cli.sh npx nest g res cat
```

### Также для облегчения работы с Vue (только в local режиме) в docker контейнере:

1) Перейдите в терминале в папку клиента:

```bash (если у вас виндовс, то запустите через гит баш)
cd client
```

2) Пропишете нужную команду для клиента:

```bash (если у вас виндовс, то запустите через гит баш)
./cli.sh your_command # например ./cli.sh npm i axios
```

