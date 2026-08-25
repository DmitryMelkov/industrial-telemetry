# Backend guide

Этот документ объясняет backend проекта Industrial Telemetry: из каких частей он состоит, зачем нужна каждая технология и как данные проходят путь от датчика до dashboard.

## 1. Идея проекта

Проект имитирует промышленную систему мониторинга:

- есть промышленные объекты (`sites`);
- на объектах есть линии (`lines`);
- на линиях установлены датчики (`sensors`);
- датчики постоянно отправляют измерения;
- система хранит историю, текущее состояние и alerts;
- Operator видит realtime-мониторинг;
- Admin меняет датчики и пороги.

Главный поток:

```text
telemetry-generator
        |
        v
Kafka: telemetry.raw
        |
        +--> telemetry-consumer --> MongoDB: history
        |                         --> Tarantool: latest state
        |                         --> Redis: telemetry event
        |
        +--> alert-consumer ------> PostgreSQL: alerts
                                  --> Redis: alert event

Redis events --> BFF WebSocket --> browser
REST browser --> BFF --> core-api --> databases
```

Браузер не подключается напрямую к Kafka, MongoDB, PostgreSQL, Redis или Tarantool. Единственная внешняя точка для frontend - BFF.

## 2. Что такое NestJS

NestJS - backend-фреймворк для Node.js. Он организует код вокруг модулей, controllers и services.

Пример структуры приложения:

```text
AppModule
  +-- AuthController       HTTP endpoints
  +-- MonitoringController HTTP proxy/endpoints
  +-- AuthService          auth logic
  +-- RealtimeGateway      WebSocket logic
  +-- PrismaModule         PostgreSQL access
```

### Module

`@Module(...)` описывает состав части приложения:

```typescript
@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AppModule {}
```

- `imports` подключает другие модули;
- `controllers` регистрирует HTTP-классы;
- `providers` регистрирует сервисы, которые Nest создаёт через dependency injection.

Аналогия с Angular: Nest module похож на Angular NgModule, а dependency injection работает похожим образом.

### Controller

Controller принимает внешний запрос и передаёт его в сервис.

```typescript
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  login(@Body() body: LoginBody) {
    return this.auth.login(body.email, body.password);
  }
}
```

`@Controller('auth')` задаёт общий prefix.

`@Post('login')` означает HTTP-маршрут:

```text
POST /auth/login
```

Другие часто используемые декораторы:

```typescript
@Get('me')                  // GET /auth/me
@Patch(':id')               // PATCH /resource/:id
@Put(':id/thresholds')      // PUT /resource/:id/thresholds
@Body()                     // JSON body запроса
@Param('id')                // параметр URL
@Query('limit')             // query parameter
@Headers('authorization')  // HTTP header
@Req()                      // весь request
@Res()                      // response
```

### Service

Service содержит бизнес-логику и работу с базами. Он не должен заниматься отображением UI.

```typescript
@Injectable()
export class AuthService {
  async login(email: string, password: string) {
    // найти пользователя, проверить пароль, создать сессию
  }
}
```

Controller отвечает на вопрос: «какой HTTP endpoint вызвать?»

Service отвечает на вопрос: «что должно произойти внутри системы?»

### Worker

`telemetry-consumer` и `alert-consumer` - не HTTP-сервисы. Они запускаются через `NestFactory.createApplicationContext` и работают как фоновые процессы:

```text
запустился процесс
  -> подключился к Kafka
  -> слушает сообщения
  -> выполняет работу
```

## 3. Сервисы проекта

### telemetry-generator

Эмулятор датчиков. Периодически читает активные `sensors` из Postgres и каждую секунду публикует по одной точке на датчик в Kafka `telemetry.raw`.

Seed-датчики (T-101 и др.) сохраняют прежний профиль сигнала из `SEED_SENSORS`. Датчик, созданный в Admin с `isActive=true`, попадает в батч после refresh каталога (`GENERATOR_SENSOR_REFRESH_MS`, по умолчанию 10 с) — править `SEED_SENSORS` не нужно. Для новых датчиков `baseValue`/`noise` берутся из дефолтов по `metric`.

Generator не пишет телеметрию в базы: Postgres для него только справочник датчиков. Поток идёт через Kafka.

### telemetry-consumer

Слушает `telemetry.raw` и сохраняет каждую корректную точку в три места:

```text
MongoDB   - полная история
Tarantool - последняя точка датчика
Redis     - realtime notification
```

Для одного сообщения:

```json
{
  "sensorId": "T-101",
  "value": 72.4,
  "unit": "°C",
  "ts": "2026-08-23T10:00:00.000Z"
}
```

результат такой:

```text
MongoDB:   добавить новую запись
Tarantool: заменить current state T-101
Redis:     publish telemetry:updates
```

### alert-consumer

Тоже читает `telemetry.raw`, но занимается порогами.

Пример:

```text
T-101 warning: 60..90
T-101 critical: 50..100
```

Если пришло `95` и значение держится выше порога `ALERT_OPEN_DEBOUNCE_SECONDS` (по умолчанию 20 с), создаётся alert в PostgreSQL и публикуется в Redis.

Если потом пришло `75` и норма держится `ALERT_RESOLVE_HYSTERESIS_SECONDS` (по умолчанию 20 с), alert переводится в `resolved`. Краткий «заход» вокруг порога не открывает и не закрывает запись.

Чтобы не создавать дубликаты журнала, для одного датчика и severity поддерживается один активный alert (`open` или `acked`). Пока он есть, новый `open` не создаётся. Pending debounce/hysteresis живёт в памяти consumer (отдельная alerts DB не нужна).

`0` в env отключает соответствующую задержку (сразу open/resolve).

### core-api

Внутренний доменный API. Он знает, как собрать данные из хранилищ:

- PostgreSQL - sites, lines, sensors, thresholds, alerts;
- Tarantool - latest values;
- MongoDB - history.

Сейчас в нём реализованы monitoring endpoints, sensors CRUD, thresholds и alerts.

### bff

BFF (`Backend For Frontend`) - внешний backend для frontend-приложений.

Он отвечает за:

- auth session;
- проверку роли;
- внешний REST API;
- proxy-запросы в `core-api`;
- WebSocket для realtime.

Frontend общается с BFF, а не с `core-api` напрямую.

## 4. Зачем нужны технологии

### Kafka

Kafka - распределённый журнал сообщений и буфер между producer и consumers.

```text
producer --> topic --> consumer
```

Она отделяет generator от обработчиков. Generator не знает о MongoDB, Tarantool и Redis.

Kafka помогает пережить кратковременный дисбаланс скорости:

```text
producer: 1000 messages/sec
consumer:  500 messages/sec
backlog:   +500 messages/sec
```

Но Kafka не исправляет постоянную нехватку производительности. Если producer всегда быстрее, очередь будет расти. Тогда нужно масштабировать consumers, добавлять partitions, писать batches или замедлять producer.

В проекте topic:

```text
telemetry.raw
```

`groupId` задаёт группу consumers. Consumers с одинаковой группой делят partitions между собой.

### PostgreSQL

PostgreSQL хранит структурированные мастер-данные и бизнес-состояния:

```text
Site
  -> Line
      -> Sensor
          -> Threshold
          -> Alert

User -> role
```

Он нужен там, где важны связи, foreign keys, уникальность и транзакции.

Пример: sensor не должен ссылаться на несуществующую line. PostgreSQL контролирует это через relation.

PostgreSQL отвечает на вопрос:

```text
Как устроена система и какие у неё правила?
```

### MongoDB

MongoDB хранит поток измерений как append-only history:

```text
T-101: 72.4 at 10:00:01
T-101: 72.8 at 10:00:02
T-101: 73.1 at 10:00:03
```

Она нужна для:

- исторических графиков;
- поиска измерений за период;
- анализа аварий;
- больших потоков точек.

MongoDB отвечает на вопрос:

```text
Что происходило с датчиком?
```

### History: raw vs bucket

Одна коллекция `telemetry_points`. Отдельные «суточные» базы/коллекции не нужны: длинное окно сжимается **в запросе**.

`GET /api/sensors/:id/history?from=&to=&limit=` (BFF проксирует query как есть, включая опциональный `interval`):

| Длительность `(to - from)` | Режим | Шаг | `value` |
|----------------------------|--------|-----|---------|
| ≤ 2ч (и `1h`) | raw `find + sort + limit` | как писали (~1 Гц) | исходное |
| 2–12ч (`6h`) | `$group` по бакету | ~1 мин | avg |
| 12–48ч (`24h`) | `$group` | ~5 мин | avg |
| ≤ 7 суток | `$group` | ~15 мин | avg |
| шире | `$group` | 1ч | avg |

Явный `interval=raw|1m|5m|15m|1h` переопределяет автовыбор. Контракт `points[]` тот же; для бакета `ts` — начало интервала. Индекс `{ sensorId, ts }`. Operator `interval` не шлёт.

### Tarantool

Tarantool - быстрое хранилище текущего состояния.

В space `sensor_latest` одна запись на датчик:

```text
sensor_id -> current value
```

MongoDB хранит много точек, а Tarantool хранит только последнюю:

```text
MongoDB:   72.4, 72.8, 73.1, 72.9
Tarantool: 72.9
```

Tarantool отвечает на вопрос:

```text
Какое значение у датчика сейчас?
```

### Redis

В проекте Redis выполняет две роли.

#### Pub/Sub

Consumer публикует событие:

```text
telemetry:updates
alerts:updates
```

BFF подписан на эти каналы и пересылает события в WebSocket.

#### Session storage

AuthService хранит серверную сессию:

```text
session:<random-token> -> user data
```

TTL сессии - 8 часов.

Redis не является главным источником истории. Если Redis очистить, история MongoDB и мастер-данные PostgreSQL не исчезнут.

### WebSocket

WebSocket держит постоянное соединение с browser.

REST используется для запроса:

```text
дай мне текущее состояние
```

WebSocket используется для события:

```text
появилось новое значение
появился alert
```

Схема dashboard:

```text
1. GET /sites/:id/overview  - initial state
2. WS /ws                  - live updates
3. PATCH /alerts/:id/ack   - command пользователя через REST
```

## 5. Авторизация

В проекте используется server-side session, не JWT access/refresh.

### Login

```http
POST /auth/login
Content-Type: application/json
```

```json
{
  "email": "operator@telemetry.local",
  "password": "password123"
}
```

BFF:

1. ищет пользователя в PostgreSQL;
2. проверяет bcrypt hash;
3. генерирует случайный token;
4. сохраняет user в Redis;
5. отправляет `Set-Cookie`.

Cookie:

```text
it_session=<token>; HttpOnly; SameSite=Lax
```

Frontend не видит token. Браузер сам отправляет cookie в следующих запросах.

### Проверка запроса

```text
Browser -> Cookie: it_session=...
BFF    -> Redis: session:<token>
Redis  -> user + role
BFF    -> разрешить или вернуть 401/403
```

### Logout

```http
POST /auth/logout
Cookie: it_session=<token>
```

BFF удаляет session key в Redis и очищает cookie.

### Роли

`operator`:

- читать sites, sensors, overview, history;
- читать alerts;
- подтверждать alerts.

`admin`:

- всё, что operator;
- создавать sensors;
- изменять sensors;
- изменять thresholds.

Если operator вызывает admin endpoint, BFF возвращает `403 Forbidden`.

## 6. REST API

Текущие фактические маршруты BFF не имеют `/api` prefix:

```text
POST /auth/login
POST /auth/logout
GET  /auth/me

GET  /sites
GET  /sites/:siteId/overview
GET  /sensors
GET  /sensors/:id
GET  /sensors/:id/history
GET  /alerts
PATCH /alerts/:id/ack

POST /sensors                       admin
PATCH /sensors/:id                  admin
PUT /sensors/:id/thresholds         admin
```

Журнал алертов (`GET /alerts`, тот же путь через BFF `/api/alerts`). Query проксируется в `core-api` как есть:

```text
status     open | acked | resolved
siteId     uuid
sensorId   uuid
severity   warning | critical
from, to   ISO-8601 по openedAt
limit      default 100, max 500
offset     default 0
```

Сортировка всегда `openedAt desc`. `PATCH /alerts/:id/ack` по смыслу не меняется: `open` → `acked`.

Пример чтения данных:

```http
GET /sites/111.../overview
Cookie: it_session=...
```

Пример изменения порогов:

```http
PUT /sensors/333.../thresholds
Cookie: it_session=...
Content-Type: application/json
```

```json
{
  "thresholds": [
    { "minValue": 60, "maxValue": 90, "severity": "warning" },
    { "minValue": 50, "maxValue": 100, "severity": "critical" }
  ]
}
```

## 7. WebSocket API
Текущие фактические маршруты BFF используют `/api` prefix:
Подключение:

POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me

GET  /api/sites
GET  /api/sites/:siteId/overview
GET  /api/sensors
GET  /api/sensors/:id
GET  /api/sensors/:id/history
GET  /api/alerts
PATCH /api/alerts/:id/ack

POST /api/sensors                       admin
PATCH /api/sensors/:id                  admin
PUT /api/sensors/:id/thresholds         admin
{
GET /api/sites/111.../overview
  "siteId": "11111111-1111-1111-1111-111111111111"
PUT /api/sensors/333.../thresholds
```
1. GET /api/sites/:id/overview  - initial state
Ответ:
3. PATCH /api/alerts/:id/ack   - command пользователя через REST
```json
{
  "type": "subscribed",
  "siteId": "11111111-1111-1111-1111-111111111111"
}
```

Новая telemetry:

```json
{
  "type": "telemetry",
  "payload": {
    "sensorId": "333...",
    "siteId": "111...",
    "value": 72.4,
    "unit": "°C",
    "metric": "temperature",
    "ts": "2026-08-23T10:00:00.000Z"
  }
}
```

Новый или изменённый alert:

```json
{
  "type": "alert",
  "payload": {
    "id": "alert-id",
    "sensorId": "333...",
    "siteId": "111...",
    "severity": "warning",
    "status": "open",
    "message": "T-101 above maximum",
    "value": 95
  }
}
```

WebSocket отправляет событие только клиентам, подписанным на соответствующий `siteId`.

## 8. Локальный запуск

Запустить Docker Desktop, затем в backend:

```bash
npm install
npm run infra:up
npm run prisma:deploy
npm run prisma:seed
```

Запустить процессы в отдельных терминалах:

```bash
npm run start:core-api:dev
npm run start:bff:dev
npm run start:telemetry-consumer:dev
npm run start:alert-consumer:dev
npm run start:generator:dev
```

Проверить инфраструктуру:

```bash
npm run infra:ps
```

Полезные адреса:

```text
BFF health:       http://localhost:3000/health
Core API health:  http://localhost:3001/health
Kafka UI:         http://localhost:8088
```

Проверки кода:

```bash
npm run lint:check
npm run build:all
```

## 9. Что завершено и что дальше

Backend MVP:

```text
[x] Docker infrastructure
[x] PostgreSQL schema + seed
[x] telemetry-generator
[x] Kafka topic telemetry.raw
[x] telemetry-consumer
[x] MongoDB history
[x] Tarantool latest state
[x] Redis pub/sub
[x] alert-consumer
[x] Auth через httpOnly cookie
[x] Роли operator/admin
[x] REST monitoring and CRUD
[x] WebSocket telemetry and alerts
```

Дальше идут frontend-репозитории:

```text
apps/operator  Angular monitoring dashboard
apps/admin     React administration UI
```

Для frontend сначала нужно:

1. login с `credentials: 'include'`;
2. запросить initial state через REST;
3. открыть `ws://localhost:3000/ws`;
4. отправить `subscribe`;
5. обновлять карточки и графики по telemetry events;
6. обновлять alert list по alert events;
7. отправлять user commands через REST.

## 10. Ограничения MVP

Текущая реализация учебная и намеренно простая:

- нет retry/dead-letter стратегии для всех межсервисных операций;
- нет полноценной схемной валидации DTO через `class-validator`;
- нет rate limiting;
- нет CSRF-защиты для cookie auth;
- нет горизонтального масштабирования consumers;
- REST error format ещё следует унифицировать;
- `core-api` должен быть защищён от прямого внешнего доступа в production.

Это следующие улучшения, но они не нужны для первого работающего dashboard MVP.
