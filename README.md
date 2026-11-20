# Nest Course: User Service и Notification Service

Монорепозиторий NestJS: HTTP API пользователей, профилей, аватаров и переводов;
уведомления о переводах через Kafka и Socket.IO. Общий код находится в
`libs/common`.

## Подготовка

Нужны Node.js 22+, npm и Docker Compose. Все команды выполняются из корня
проекта.
Приложения запускаются локально, инфраструктура — в Docker.

```bash
npm ci
cp .env.example .env
```

Заполните `.env` для локального запуска:

| Переменные                                        | Значения                       |
|---------------------------------------------------|--------------------------------|
| `DB_HOST`, `DB_PORT`, `DB_NAME`                   | `localhost`, `5432`, `nest_db` |
| `DB_USERNAME`, `DB_PASSWORD`                      | `nest_user`, `nest_password`   |
| `DB_SYNCHRONIZE`                                  | `false`                        |
| `S3_ENDPOINT`                                     | `http://localhost:9000`        |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`        | оба `minioadmin`               |
| `REDIS_HOST`, `REDIS_PORT`                        | `localhost`, `6379`            |
| `REDIS_PASSWORD`                                  | свой пароль                    |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`         | два разных секрета             |
| `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | `15m`, `7d`                    |
| `NODE_ENV`                                        | `development`                  |

Остальные значения оставьте из `.env.example`. Оба приложения используют один
`.env`.

```bash
docker compose up -d
docker compose ps -a
```

Compose поднимает PostgreSQL, Redis, MinIO, Kafka, Kafka UI и MongoDB.
`kafka-init` должен завершиться с кодом 0: он создаёт топик
`transfer.completed`.
MongoDB используется реализованным бонусом истории и необходима текущему
Notification Service.

Откройте MinIO Console: http://localhost:9001, войдите с `minioadmin` /
`minioadmin`
и создайте приватный бакет `user-avatars`. Это нужно для загрузки аватаров.

## Первый запуск на пустой БД

Начальной миграции всех таблиц пока нет. Только для новой локальной БД
выполните:

```bash
DB_SYNCHRONIZE=true npx nest start user-service
```

После запуска остановите приложение через Ctrl+C. В `.env` оставьте
`DB_SYNCHRONIZE=false`. Для готовой БД этот шаг пропустите; в production
синхронизацию не используйте. Миграция Outbox применяется автоматически.

## Запуск приложений

В двух отдельных терминалах:

```bash
npx nest start user-service --watch
```

```bash
npx nest start notification-service --watch
```

- User Service: http://localhost:3000, Swagger: http://localhost:3000/api/docs
- Notification Service: http://localhost:3001
- Kafka UI: http://localhost:8080
- У обоих приложений: `GET /health/live`, `GET /health/ready` (200 — готово,
  503 — не готово).
- Метрики Notification Service: `GET http://localhost:3001/metrics`.

## Socket.IO

В Postman создайте Socket.IO-запрос к `http://localhost:3001`.
Передайте access-токен User Service в handshake auth:
`{"token":"<accessToken>"}`
(`handshake.auth.token`). Добавьте слушатель события `notification` и
подключитесь.
Сервер проверит JWT и добавит соединение в комнату пользователя; после успешного
перевода уведомление получают подключённые устройства отправителя и получателя.

## Проверки кода

```bash
npx nest build user-service
npx nest build notification-service
npm run lint
```
