# Onix

Internal B2B CRM for S. D. Melas Trading Business, managing company records, employee communications, follow-ups, and business development activities.

## Stack

| Layer    | Technology                                       |
| -------- | ------------------------------------------------ |
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| Backend  | Node.js 22, Express 5, TypeScript                 |
| Database | PostgreSQL 14+, `pg`, node-pg-migrate             |

Building UI? Follow the [UI style guide](apps/web/STYLEGUIDE.md) — design
tokens, components, navigation model, and the Greek-first language rules.

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
npm run db:seed
npm run dev
```

That is the whole setup.

- `npm install` fetches the small root launcher.
- `npm run setup` creates the env files, installs both apps, creates the
  `onix_dev` and `onix_test` databases, and applies all migrations.
- `npm run db:seed` creates the development sign-in below.
- `npm run dev` starts both apps together with hot reload.

| Service | URL                                 |
| ------- | ----------------------------------- |
| Web     | http://localhost:3000               |
| API     | http://localhost:4000/api/v1        |
| Health  | http://localhost:4000/api/v1/health |

Open http://localhost:3000. The app requires a sign-in, so you land on
http://localhost:3000/login.

`npm run setup` is safe to re-run at any time. It never overwrites an existing
`.env` and never drops a database.

---

## 2a. Accounts and sign-in

The CRM is sign-in only — there is no registration page. Accounts are created
from the command line.

**For development**, seed the throwaway administrator:

```bash
npm run db:seed
```

| Field    | Value            |
| -------- | ---------------- |
| Email    | `admin@test.com` |
| Password | `123456`         |

Re-running updates that account rather than duplicating it. The script refuses
to run with `NODE_ENV=production` — those credentials are for a laptop and
nowhere else.

**For a real account**, use the interactive script. It prompts for the password
(never taken from a flag, so it stays out of your shell history) and requires
at least 12 characters:

```bash
npm run user:create
```

Everything it does not get as a flag it asks for:

```bash
npm run user:create -- --email anna@melas.gr --name "Άννα Μελά" --role admin
```

Roles are `employee`, `manager`, `technical`, `admin`. Running it against an
existing email sets a new password for that account and reactivates it.

Sessions are rows in the `sessions` table, referenced by an httpOnly cookie, so
signing out or deactivating a user takes effect on the next request. They last
`SESSION_TTL_DAYS` (14 by default).

### What an unauthenticated visitor can reach

Nothing but the login screen. Signing in is the gate for the application code
itself, not only for its data:

| Request                          | Without a session                |
| -------------------------------- | -------------------------------- |
| `/`, `/companies/*`, any page    | redirect to `/login`             |
| RSC payloads for those pages     | redirect, no content             |
| `/_next/static/**` JavaScript    | `404`                            |
| `/api/v1/*` (including unknown paths) | `404`                       |
| `/login`, its form, the icon     | served                           |
| Stylesheets                      | served — no endpoints in them     |

The client bundles name every endpoint the app calls, so they are withheld from
anyone who has not signed in. Two design consequences follow, and both matter
if you change this area:

- **The login page ships no JavaScript.** Its form is plain HTML and its CSS is
  inlined into the document. Adding a client component to it would leave the
  page rendering but not working.
- **The browser never addresses the API.** It calls this app's own `/api/v1/*`
  route, which forwards to Express; the API's address is server-side only.
  There is no `NEXT_PUBLIC_API_URL` to set, and `docker-compose.prod.yml` does
  not publish the API's port at all.

In development the login page does not hot-reload while you are signed out —
its scripts are blocked like everything else. Sign in and it behaves normally.

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
stop it, or change `PORT` in `apps/api/.env` and `API_URL` in
`apps/web/.env.local` to match.

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
| `apps/web/.env.local`          | restart `npm run dev`  |
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
npm run db:seed        # create the admin@test.com development sign-in
npm run user:create    # create a real account, or reset someone's password
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
pgm.createTrigger("follow_ups", "set_updated_at", {
  when: "BEFORE",
  operation: "UPDATE",
  level: "ROW",
  function: "set_updated_at",
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
- `apps/web/.env.local` — `API_URL`, and nothing else. It is read server-side
  only; browser code calls the web app's own `/api/v1` route, so the API's
  address is never inlined into the client bundle.

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
