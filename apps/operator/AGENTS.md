# AI Context — apps/operator

Angular SPA — **Operator dashboard** для realtime-мониторинга промышленной телеметрии.

Говорит **только с BFF** (`apps/backend`). Прямых запросов к Kafka/БД нет.

## Команды

- `npm start` / `ng serve` — dev server (`http://localhost:4200`).
- `npm run build` — production build; запускать после frontend-изменений.
- `npm run lint` — ESLint (если настроен в проекте).
- `npm test` — unit-тесты (Karma/Jest), когда появятся.

Backend локально: `npm run start:bff:dev` в `apps/backend` (`:3000`).

## Обязательный стек (MVP)

- **Angular** (standalone components, без NgModules)
- **Angular Router** — маршруты + functional guards
- **HttpClient** — REST к BFF (`/api/*`, `withCredentials: true` для cookie)
- **RxJS** — потоки API и WebSocket (Subject / BehaviorSubject в services)
- **Angular Signals** — локальный UI-state в компонентах (`signal`, `computed`)
- **Angular Material** — UI-компоненты (form fields, buttons, select, table, snackbar)
- **Design tokens** — `src/styles/_tokens.scss` (CSS-переменные `--it-*`)
- **WebSocket** — `ws://localhost:3000/ws` (cookie auth, subscribe по `siteId`)

**Не добавляем на MVP:** NgRx, Module Federation, SSR.

## Карта проекта (целевая)

```
src/app/
  core/                 — singleton services, guards, interceptors
    api/                — ApiClient, typed endpoints
    auth/               — AuthService, authGuard, authInterceptor
    realtime/           — RealtimeService (WebSocket → RxJS stream)
    config/             — environment, API base URL
  features/
    auth/login/         — страница логина
    overview/           — KPI + текущие значения по site/line
    charts/             — живой график 1–N датчиков
    alerts/             — журнал алертов + ack
  shared/               — переиспользуемые UI-компоненты, pipes, types
  app.config.ts
  app.routes.ts
```

## Маршруты (MVP)

| Path | Guard | Описание |
|------|-------|----------|
| `/login` | guest | форма логина |
| `/` | auth | overview (redirect с `/`) |
| `/overview` | auth | дашборд объекта |
| `/charts` | auth | живой график; query `sensorId` выбирает датчик |
| `/alerts` | auth | журнал алертов |
| `/**` | — | redirect на `/overview` или `/login` |

## API (источник правды)

Backend docs:

- [api-sketch](../backend/docs/api-sketch.md)
- [mvp](../backend/docs/mvp.md)

Используемые эндпоинты Operator:

| Method | Path | Назначение |
|--------|------|------------|
| POST | `/api/auth/login` | логин → cookie `it_session` |
| POST | `/api/auth/logout` | выход |
| GET | `/api/auth/me` | текущий user |
| GET | `/api/sites` | список объектов |
| GET | `/api/sites/:siteId/overview` | KPI + latest sensors |
| GET | `/api/sensors/:id/history` | история: `from`, `to`, `limit` (max 5000). Bucket выбирает бэкенд по длительности; `interval` опционален, Operator его не шлёт |
| GET | `/api/sensors/:id` | карточка датчика + `thresholds` (полосы на графике) |
| GET | `/api/alerts` | журнал: `siteId`, `status`, `severity`, `from`/`to` (`openedAt`), `limit`/`offset` |
| PATCH | `/api/alerts/:id/ack` | подтвердить алерт |
| WS | `/ws` | `{ type: subscribe, siteId }` → telemetry / alert |

Seed siteId (demo): `11111111-1111-1111-1111-111111111111` (`PLANT-1`).

Dev proxy (`proxy.conf.json`): `/api` и `/ws` → `http://localhost:3000`.

## State management (без NgRx)

| Что | Где |
|-----|-----|
| Auth user / session | `AuthService` + `BehaviorSubject<User \| null>` |
| Overview snapshot | `OverviewService` или feature service + `signal` |
| Live telemetry | `RealtimeService` → `Observable<TelemetryEvent>` |
| Alerts journal | REST snapshot по фильтрам; WS не вставляет строки, только badge «новые события» и in-place update уже показанных |
| UI (selected site, line, sensors for chart) | `signal` в компоненте или маленький feature store |

Правило: **server-state через HttpClient + RxJS**, не дублировать в глобальный store без нужды.

## WebSocket flow

1. После login cookie уже есть — WS connect на `/ws`.
2. Дождаться `{ type: "connected" }`.
3. Отправить `{ type: "subscribe", siteId }`.
4. Слушать `{ type: "telemetry" | "alert", payload }`.
5. На logout — disconnect WS, clear local state.

## Charts: диапазон истории и пороги

Preset по умолчанию: **`1h`**. Operator запрашивает history с `from`/`to`/`limit=4000`. Query `interval` **не** отправляем: core-api сам выбирает шаг по `(to - from)`.

| Окно | Что отдаёт API | Ось Chart.js |
|------|----------------|--------------|
| ≤ 2ч (`1h`, короткий custom) | raw точки | `scales.x.min/max` = выбранное окно |
| 2–12ч (`6h`) | bucket ~1 мин (`value` = avg) | то же окно, не extent данных |
| 12–48ч (`24h`) | bucket ~5 мин | то же |
| шире | 15 мин / 1ч | то же |

При смене preset график делает `resetZoom`, чтобы старый pan/zoom не маскировал шкалу.

| Режим | `from` / `to` | Live WS append |
|-------|---------------|----------------|
| `1h` / `6h` / `24h` | `now - duration` … `now` (пересчёт при загрузке) | да, скользящее окно |
| `custom`, `to` ≈ now (не старше 2 мин) | из UI | да |
| `custom`, `to` в прошлом | из UI | **нет** — иначе график «прыгает» вперёд |

Live-правило: для raw-окна (≤ 2ч) append как есть; для bucket-окна точка округляется в текущий бакет (повтор в том же бакете **обновляет** `value`, не плодит 1 Гц на минутной сетке). Смешивать сырой WS с чужим шагом без округления нельзя.

Пороги warning/critical (`minValue`/`maxValue`) загружаются через `GET /api/sensors/:id` только для **primary** датчика (`selectedIds[0]`). Отдельного `GET /sensors/:id/thresholds` в core-api нет (есть только PUT).

### Зоны порогов на графике

Рисует `TimeSeriesChartComponent` (и обычный вид, и fullscreen — тот же компонент, тот же `primaryThresholds`).

- **Когда показывать:** зоны и threshold-линии только при **ровно одном** выбранном датчике (`series.length === 1`). При 2–4 датчиках пороги primary не рисуем — они вводят в заблуждение. Подпись под графиком: `Зоны порогов: {code}` + мини-легенда warning/critical.
- **Заливка:** custom plugin `thresholdZones` (`src/app/features/charts/threshold-zones.ts`), хук `beforeDatasetsDraw`. Прямоугольники по `chartArea` (вся ширина окна 1ч/24ч) и Y-scale. Warning — тёплый tint (~0.12), critical — более насыщенный error tint (~0.22) + лёгкая штриховка. Коридор нормы без заливки. Если в видимом Y нет outside-сегментов — зон нет (это ок, не «простыня»).
- **Семантика** (`resolveThresholdZones`): выше critical max / ниже critical min — critical tint; между warning и critical — warning tint; коридор между warning min/max не заливаем. Одна граница (только min или только max) — зона «наружу» до края шкалы. Пустой `thresholds` — без зон, без ошибок.
- **Линии:** отдельные datasets поверх зон (critical сплошная, warning пунктир, тоньше). Флаг `isThreshold` + `pointHitRadius: 0` + `tooltip.filter`, чтобы не перехватывать tooltip серии. Filler для зон **не** используем: fill-between не закрывает «до края шкалы» без фиктивных datasets и ломает hit-test.
- **Тема Chart.js:** цвета осей/сетки/tooltip и threshold-линий читаются из `--it-color-*` через `readChartThemeColors` / `applyChartTheme`. При toggle light↔dark без reload `effect` по `ThemeService.theme` заново применяет цвета и вызывает `chart.update('none')` — F5 не нужен.

## Project-Specific правила

- Ходить в API **только** через `core/api` services; не `fetch`/`axios` в компонентах.
- Все HTTP-запросы с `withCredentials: true` (httpOnly cookie).
- `401` → redirect на `/login` (interceptor).
- `403` → показать сообщение, не падать silently.
- Operator **не** вызывает admin CRUD (`POST/PATCH/PUT /sensors`).
- Loading / empty / error states обязательны на каждом экране.
- Компоненты небольшие: page = orchestration, логика в services.

## Frontend Baseline

- Сначала читать существующий feature, service, routes. Новый паттерн — только если совпадает с локальным.
- Standalone components; **именованные export** (не default).
- Стрелочные функции для methods. Фигурные скобки для `if/for/while/switch/try`.
- Шаблоны: `@if` / `@for` (control flow Angular 17+), не `*ngIf`/`*ngFor` в новом коде.
- Типы API — в `shared/types` или рядом с api service; контракт BFF в camelCase.
- После изменений: `npm run build`. При правках routes/guards/styling — `npm run lint`.

## Design system (Alarta-style)

Стиль как в **alarta.workforce.pl**: Inter, синий primary `#1890ff`, canvas `#f3f4f6`, header 56px.

| Слой | Путь |
|------|------|
| Raw palette | `src/styles/tokens/_colors.scss` |
| Semantic light/dark | `_semantic.scss`, `_semantic-dark.scss` |
| Typography | `_typography.scss` → `.typo.typo--h2`, `.typo--body` |
| Material overrides | `_material-theme.scss`, `_buttons.scss` |
| Theme toggle | `shared/ui/theme-toggle` — `light_mode` / `dark_mode` icons |

**Кнопки:** `btn btn--primary` (mat-flat-button), `btn btn--text` (header actions).  
**Карточки:** `.surface-card` (radius 4px, border divider).  
**Login:** centered card 420px на blur backdrop (как AuthModal).  
**Shell:** sticky header paper + border-bottom.

## Site picker

- `SelectedSiteService` (`core/site`) — single source of truth для `siteId`.
- Список: `GET /api/sites` (`SitesApiService`).
- Default: `DEMO_SITE_ID`, если есть в каталоге; иначе первый site.
- Persist: `localStorage` ключ `it-operator-site-id` (валидация при старте).
- Shell header: `mat-select` (code — name). Смена site → overview/charts/alerts reload + `RealtimeService.connect(newSiteId)`.
- Константа `DEMO_SITE_ID` — только fallback, не «текущий site» в фичах.

## Порядок реализации (Operator MVP)

1. `ng new` + proxy + `core/auth` + login page
2. authGuard + shell layout
3. overview page (REST `/overview`)
4. RealtimeService + live values на overview
5. chart (history + WS append)
6. alerts journal + ack

## Журнал алертов

Экран `/alerts` — история, не live-лента.

- Таблица: `openedAt`, sensor code, severity, message, value, status, Ack.
- Фильтры уходят в BFF: status (`all`/`open`/`acked`/`resolved`), severity, период (`all`/`1h`/`6h`/`24h` → `from`/`to`).
- Ack на `open` обновляет строку; при фильтре «Открытые» строка уходит из списка.
- Клик по строке → `/charts?sensorId=`.
- Overview: KPI «Открытые алерты» ведёт в журнал. Карточки датчиков не мигают от alert WS.

### Smoke

1. Login `operator@telemetry.local` / `password123`.
2. Header: объект Demo Plant / PLANT-1 (или сохранённый site).
3. Overview: KPI «Открытые алерты» читается, карточки без пульсации каждую секунду; имя объекта, не голый UUID.
4. `/alerts`: таблица, фильтры status / severity / period перезагружают список.
5. Ack на open → статус строки `acked` (или строка исчезает на фильтре «Открытые»).
6. Клик по строке → график с этим `sensorId`.
7. Смена объекта в header → overview/charts/alerts без «хвостов» предыдущего site; F5 сохраняет выбор.

## Связанные apps

- [backend](../backend) — BFF, docs, seed
- [admin](../admin) — React admin
