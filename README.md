# Onix

Internal B2B CRM for S. D. Melas Trading Business, managing company records, employee communications, follow-ups, and business development activities.

## Stack

| Layer    | Technology                                       |
| -------- | ------------------------------------------------ |
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| Backend  | Node.js 22, Express 5, TypeScript                 |
| Database | PostgreSQL 14+, `pg`, node-pg-migrate             |

---

## 1. Install the prerequisites

You need two things: **Node.js 22+** and **PostgreSQL 14+**. Jump to your platform.

Node 22 is a hard minimum — the API uses Node's built-in `--env-file` support,
which does not exist in Node 20.

<details open>
<summary><strong>macOS</strong></summary>

Using [Homebrew](https://brew.sh):

```bash
brew install node@22 postgresql@17
brew services start postgresql@17
```

If `node --version` does not show v22+ afterwards, link it:

```bash
brew link --overwrite --force node@22
```

Homebrew creates a PostgreSQL role matching your macOS username with no password,
so the default connection settings in this project work as-is.

</details>

<details>
<summary><strong>Linux — Debian / Ubuntu</strong></summary>

Node 22 from NodeSource (Ubuntu's own `nodejs` package is usually too old):

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

PostgreSQL:

```bash
sudo apt-get install -y postgresql
sudo systemctl enable --now postgresql
```

**Important — one extra step on Linux.** Debian and Ubuntu install PostgreSQL with
`peer` authentication, and only the `postgres` system user has a database role.
Give your own user one, otherwise every command below fails with
`role "yourname" does not exist`:

```bash
sudo -u postgres createuser --superuser "$USER"
```

</details>

<details>
<summary><strong>Linux — Fedora / RHEL</strong></summary>

```bash
sudo dnf install -y nodejs22 postgresql-server
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql
sudo -u postgres createuser --superuser "$USER"
```

</details>

<details>
<summary><strong>Windows</strong></summary>

Using [winget](https://learn.microsoft.com/windows/package-manager/winget/) in
PowerShell:

```powershell
winget install OpenJS.NodeJS.LTS
winget install PostgreSQL.PostgreSQL.17
```

Or download the installers from [nodejs.org](https://nodejs.org) and
[postgresql.org/download/windows](https://www.postgresql.org/download/windows/).

**Important — one extra step on Windows.** The installer asks you to set a
password for the `postgres` superuser, and Windows has no socket authentication,
so you must supply that password to the project. After running `npm run setup`
below, open `apps/api\.env` and set:

```
DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/onix_dev
```

Then re-run `npm run setup`. Close and reopen your terminal after installing so
`node` and `npm` are on your `PATH`.

Use PowerShell or Git Bash rather than the legacy `cmd.exe`.

</details>

Verify both are ready:

```bash
node --version    # must be v22 or higher
psql --version    # must be 14 or higher
```

---

## 2. Run the project

From a fresh clone:

```bash
npm install
npm run setup
npm run dev
```

That is the whole setup.

- `npm install` fetches the small root launcher.
- `npm run setup` creates the env files, installs both apps, creates the
  `onix_dev` and `onix_test` databases, and applies all migrations.
- `npm run dev` starts both apps together with hot reload.

| Service | URL                                 |
| ------- | ----------------------------------- |
| Web     | http://localhost:3000               |
| API     | http://localhost:4000/api/v1        |
| Health  | http://localhost:4000/api/v1/health |

Open http://localhost:3000. The home page shows a live API/database status
indicator — **green means the whole chain works**. If it is red, see
troubleshooting below.

`npm run setup` is safe to re-run at any time. It never overwrites an existing
`.env` and never drops a database.

---

## 3. Troubleshooting

**The status indicator is red, or `npm run setup` cannot connect.**

Check PostgreSQL is actually running:

```bash
pg_isready
```

If it is running but the connection is refused or the role is missing, set the
connection string explicitly in `apps/api/.env`:

```
DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/onix_dev
```

Then `npm run setup` again. This is the normal case on Windows, and on Linux if
you skipped the `createuser` step above.

**`role "yourname" does not exist`** — you skipped the Linux `createuser` step.

**`Port 3000 is already in use`** (or 4000) — something else is running. Find and
stop it, or change `PORT` in `apps/api/.env` and `API_URL` / `NEXT_PUBLIC_API_URL`
in `apps/web/.env.local` to match.

**`Unsupported engine` or syntax errors on startup** — your Node is older than 22.
Check with `node --version`.

**Changes to `.env` are not picked up** — env files are read at startup only.
Stop `npm run dev` and start it again.

---

## Daily workflow

**You do not restart anything to see code changes.** `tsx watch` restarts the API
and Next's dev server refreshes the web app. Save a file — a new route, a new
page — and it is live in about a second.

| Changed                        | Run                    |
| ------------------------------ | ---------------------- |
| Any file under `src/`          | nothing — auto-reloads |
| Dependencies in a package.json | `npm run install:all`  |
| `apps/api/.env`                | restart `npm run dev`  |
| `NEXT_PUBLIC_*`                | restart `npm run dev`  |
| Added a migration              | `npm run migrate:up`   |

## Commands

Run these from the repository root; each delegates to the right app.

```bash
npm run dev            # start both apps with hot reload
npm run dev:api        # start only the API      (port 4000)
npm run dev:web        # start only the web app  (port 3000)

npm run build          # production build of both
npm start              # run both from the production build

npm test               # API tests (vitest)
npm run lint           # eslint, both apps
npm run typecheck      # tsc --noEmit, both apps
npm run format         # prettier, both apps

npm run install:all    # reinstall both apps' dependencies
npm run db:setup       # create the dev and test databases
```

You can also work inside a single app — `cd apps/api && npm run dev` behaves
identically, since each app is a fully self-contained package.

## Migrations

Migrations are TypeScript and run through `tsx`.

```bash
npm run migrate:create -- follow-ups   # scaffold a migration
npm run migrate:up                     # apply pending
npm run migrate:down                   # roll back the last one
```

The baseline migration installs `pgcrypto` (for `gen_random_uuid()`) and a shared
`set_updated_at()` trigger function. Attach it to any table with a timestamp:

```ts
pgm.createTrigger('follow_ups', 'set_updated_at', {
  when: 'BEFORE',
  operation: 'UPDATE',
  level: 'ROW',
  function: 'set_updated_at',
});
```

`apps/api/migrations/*_create-users.ts` is the worked example to copy from —
it shows the uuid, timestamp, enum, index and constraint conventions this project
uses.

Tests run against a separate `onix_test` database, never `onix_dev`, so a fixture
that truncates tables cannot wipe your working data. `npm run setup` creates both.

## Layout

Frontend and backend are **fully independent packages**. Each owns its
`package.json`, lockfile, `tsconfig.json` and lint config, and neither imports
from the other — they communicate only over HTTP. The root `package.json` is a
convenience launcher that shells into each app; it deliberately does **not** use
npm workspaces, so each app keeps its own lockfile and can be built or deployed
on its own.

```
onix/
├── package.json                 # convenience launcher (no workspaces)
├── scripts/init-env.mjs         # creates .env files on first setup
└── apps/
    ├── api/
    │   ├── .env.example
    │   ├── migrations/          # node-pg-migrate, TypeScript
    │   ├── scripts/             # setup-local-db.ts
    │   └── src/
    │       ├── index.ts         # entrypoint, graceful shutdown
    │       ├── app.ts           # express app assembly
    │       ├── config/          # env validation (zod), logger (pino)
    │       ├── db/              # pool, query/queryOne/transaction helpers
    │       ├── lib/             # HttpError
    │       ├── middleware/      # error handler, zod validation
    │       └── routes/          # /api/v1 router
    └── web/
        ├── .env.local.example
        └── src/
            ├── app/             # App Router pages
            ├── components/
            └── lib/api.ts       # typed fetch wrapper
```

### Where to add things

- **A new table** → `npm run migrate:create -- follow-ups`, then edit the generated
  file in `apps/api/migrations/`.
- **A new endpoint** → create `apps/api/src/modules/<feature>/` with its router,
  service and queries, then mount it in `apps/api/src/routes/index.ts`.
- **A new page** → add a route folder under `apps/web/src/app/`.

## Configuration

Two files, both gitignored, both created by `npm run setup` from a committed
`.example`:

- `apps/api/.env` — `DATABASE_URL`, `PORT`, `LOG_LEVEL`, `CORS_ORIGIN`. Validated
  at boot with zod, so a bad value fails immediately with a readable message
  rather than at the first request.
- `apps/web/.env.local` — `API_URL` for server components and
  `NEXT_PUBLIC_API_URL` for browser code. The latter is inlined at build time.

## Editor setup

Install the **ESLint** and **Prettier** extensions for your editor. Both apps ship
their own config, and running `npm run install:all` gives your editor the local
type definitions it needs for IntelliSense.

## A note on the Docker files

`docker-compose.yml` and the `Dockerfile`s are still in the repository; they are
used by the `main` branch and for production deployment. **You do not need Docker
for anything in this guide.** The npm scripts above run against your local Node
and PostgreSQL, and the two paths do not interfere — env files are excluded from
Docker images precisely so the same scripts work in both.
