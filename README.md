# Onix

Internal B2B CRM for S. D. Melas Trading Business, managing company records, employee communications, follow-ups, and business development activities.

## Stack

| Layer    | Technology                                       |
| -------- | ------------------------------------------------ |
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| Backend  | Node.js 22, Express 5, TypeScript                 |
| Database | PostgreSQL 17, `pg`, node-pg-migrate              |
| Runtime  | Docker / Docker Compose                           |

## Requirements

Docker Desktop (or any Docker engine) with Compose v2. **Nothing else** — Node, npm
and PostgreSQL all run inside containers, and no local install of any of them is
used or needed.

`make` is optional. Every target in the `Makefile` is a one-line `docker compose`
command, shown alongside each shortcut below.

## Getting started

```bash
cp .env.example .env && docker compose up --build
```

That is the whole setup. Verified from a clean clone on a machine with only Docker:
it builds both images, waits for PostgreSQL, applies all migrations, and serves
the app.

If a port is already taken — a local PostgreSQL on 5432 is the usual culprit —
change `POSTGRES_PORT`, `API_PORT` or `WEB_PORT` in `.env` and start again. Only
the host side moves; nothing inside the compose network changes.

That builds three services, waits for PostgreSQL to become healthy, applies pending
migrations, and starts both apps with hot reload:

| Service    | URL                            |
| ---------- | ------------------------------ |
| Web        | http://localhost:3000          |
| API        | http://localhost:4000/api/v1   |
| Health     | http://localhost:4000/api/v1/health |
| PostgreSQL | `localhost:5432`               |

The home page shows a live API/database status indicator — green means the whole
chain is wired up correctly.

A `Makefile` wraps the common Compose invocations. Run `make help` for the full
list. Each is a plain Compose command if you would rather not use `make`:

```bash
make up      # docker compose up --build
make down    # docker compose down
make logs    # docker compose logs -f
make psql    # docker compose exec postgres psql -U onix -d onix_dev
make clean   # docker compose down -v          (deletes the database volume)
```

## Daily workflow

**You do not restart anything to see code changes.** Source is bind-mounted into
both containers; `tsx watch` restarts the API and Next's dev server refreshes the
web app. Save a file — a new route, a new page — and it is live in about a second.

Rebuilds are only needed when something *outside* the bind mount changes:

| Changed                              | Run                                          |
| ------------------------------------ | -------------------------------------------- |
| Any file under `src/`                | nothing — auto-reloads                       |
| Dependencies in `package.json`       | `make install-api pkg=x` then `docker compose build api` |
| A `Dockerfile`                       | `docker compose build <service>`             |
| Environment values in `.env`         | `docker compose up -d` (recreates containers) |
| `NEXT_PUBLIC_*`                      | `docker compose build web` — inlined at build time |
| Added a migration                    | `make migrate-up`                            |

## Layout

Frontend and backend are **fully independent packages**. Each owns its
`package.json`, lockfile, `tsconfig.json`, lint config and `Dockerfile`, and neither
imports from the other — they communicate only over HTTP. There is no root
`package.json` and no workspace linking, so either service can be built, tested or
deployed on its own. Compose is what composes them.

```
onix/
├── docker-compose.yml           # dev stack: postgres + api + web, hot reload
├── docker-compose.prod.yml      # built images, migrations as a gated pre-step
├── Makefile
├── .env.example
└── apps/
    ├── api/
    │   ├── Dockerfile           # base → deps → dev | build → prod-deps → runner
    │   ├── migration-template.ts
    │   ├── migrations/          # node-pg-migrate, TypeScript
    │   └── src/
    │       ├── index.ts         # entrypoint, graceful shutdown
    │       ├── app.ts           # express app assembly
    │       ├── config/          # env validation (zod), logger (pino)
    │       ├── db/              # pool, query/queryOne/transaction helpers
    │       ├── lib/             # HttpError
    │       ├── middleware/      # error handler, zod validation
    │       └── routes/          # /api/v1 router
    └── web/
        ├── Dockerfile           # base → deps → dev | build → runner (standalone)
        └── src/
            ├── app/             # App Router pages
            ├── components/
            └── lib/api.ts       # typed fetch wrapper
```

### Where to add things

- **A new table** → `make migrate-create name=companies`, then edit the generated
  file in `apps/api/migrations/`.
- **A new endpoint** → create `apps/api/src/modules/<feature>/` with its router,
  service and queries, then mount it in `apps/api/src/routes/index.ts`.
- **A new page** → add a route folder under `apps/web/src/app/`.

## Migrations

Migrations are TypeScript and run through `tsx`, which is a runtime dependency of
the API so migrations work in production images too.

```bash
make migrate-create name=companies   # scaffold a migration
make migrate-up                      # apply pending
make migrate-down                    # roll back the last one
```

The dev `api` service runs `migrate:up` automatically on start. In
`docker-compose.prod.yml` migrations run as a separate `migrate` service that must
exit successfully before the API container starts.

The baseline migration installs `pgcrypto` (for `gen_random_uuid()`) and a shared
`set_updated_at()` trigger function. Attach it to any table with a timestamp:

```ts
pgm.createTrigger('companies', 'set_updated_at', {
  when: 'BEFORE',
  operation: 'UPDATE',
  level: 'ROW',
  function: 'set_updated_at',
});
```

## Configuration

All configuration lives in the root `.env`, read by Compose (see `.env.example`).
The API assembles `DATABASE_URL` from the `POSTGRES_*` values, and validates its
whole environment at boot via zod — a bad value fails the container immediately
with a readable message rather than at the first request.

Two variables point at the API because they are resolved in different places:

- `API_URL` — used by server components, set to the internal address
  `http://api:4000/api/v1`.
- `NEXT_PUBLIC_API_URL` — used by browser code, so it must be an address the
  browser can reach. It is **inlined at build time**; changing it requires
  rebuilding the web image.

## Commands

Everything runs inside containers:

```bash
make test-db     # one-off: create the test database and migrate it
make test        # API tests (vitest)
make lint        # eslint, both services
make typecheck   # tsc --noEmit, both services
make format      # prettier, both services
```

Tests run against a separate `onix_test` database, never `onix_dev` — a fixture
that truncates tables must not be able to wipe your working data. Run `make test-db`
once after first starting the stack, and again whenever you add migrations that
tests depend on.

Adding a dependency changes the lockfile, so run it in the container and rebuild:

```bash
make install-api pkg=dayjs
docker compose build api
```

## Production

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Requires `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `CORS_ORIGIN` and
`NEXT_PUBLIC_API_URL` to be set — Compose refuses to start without them. Both
images build to slim runtime layers (compiled `dist/` for the API, Next.js
standalone output for the web app) and run as the non-root `node` user.

## A note on editor support

Type checking and linting run in containers, but editors need local type
definitions to offer IntelliSense. If yours does, install dependencies on the host
once — they are gitignored and not used by any container build:

```bash
cd apps/api && npm ci && cd ../web && npm ci
```
