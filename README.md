# Car Dealership Inventory System

A REST API and single-page app for browsing, buying, and managing dealership inventory. Built
test-first: the failing test is committed before each implementation, then the feature lands green.

> **Status:** complete. Register/login, the filtered catalogue, vehicle detail, atomic purchases,
> the customer garage and the admin inventory console all run against PostgreSQL. API, component
> and Playwright suites are green.

## Stack

| Layer    | Choice                                               |
| -------- | ---------------------------------------------------- |
| API      | Node 22+, TypeScript, Express 5, Drizzle ORM         |
| Database | PostgreSQL 16 (local server or Docker Compose)       |
| Frontend | React 19, Vite, Tailwind CSS v4, TanStack Query      |
| Tests    | Vitest, Supertest, Testing Library, Playwright       |
| Tooling  | npm workspaces, ESLint 9, Prettier                   |

The plan specifies Bun workspaces. This machine does not have Bun, so the repo uses npm
workspaces: same single-install, single-CI-run shape, with no extra runtime to install.

## Project structure

```
car-dealership/
  apps/
    api/          Express app, migrations, seed, API tests
    web/          React SPA, component tests, Playwright E2E
      public/cars Local vehicle photography + attribution
  packages/
    shared/       shared Zod schemas, types, roles, error codes
  scripts/        commit-msg hook and installer
  docker-compose.yml
  PLAN.md
  PROMPTS.md
```

## Getting started

Prerequisites: Node 22 or newer (npm 10+), Git, and a PostgreSQL 16 server.

```bash
npm install
cp .env.example .env
docker compose up -d db     # or start a local PostgreSQL 16 on port 5432
npm run db:create           # creates dealer and dealer_test
npm run db:migrate          # applies committed migrations to dealer
npm run db:seed             # 24 vehicles plus the demo customer/admin accounts
npm run dev:api             # http://localhost:3000/api/health
npm run dev:web             # http://localhost:5173
```

On this Windows machine PostgreSQL 16 runs from the untracked `.pgbin` directory:

```powershell
.\.pgbin\bin\pg_ctl.exe -D .pgdata -l .pgdata\server.log `
  -o "-p 5432 -c listen_addresses=127.0.0.1" start
```

Stop it with `.\.pgbin\bin\pg_ctl.exe -D .pgdata stop`. The app reads `DATABASE_URL` from the
root `.env` and listens on `127.0.0.1:5432`. The test suite uses `dealer_test` and refuses to
truncate any database whose name does not end in `_test`.

Open `http://localhost:5173` and sign in with one of the demo accounts below.

## Demo accounts

| Role     | Email                | Password   |
| -------- | -------------------- | ---------- |
| Customer | `demo@autoline.dev`  | `demo1234` |
| Admin    | `admin@autoline.dev` | `admin1234`|

## What you can do

- **Browse** the catalogue with a 300 ms debounced search, category, price and sort filters. Every
  filter lives in the URL, so back/forward and shared links restore the view.
- **Inspect** a vehicle, its live stock count, pricing and description.
- **Purchase** with a confirmation dialog and an optimistic stock decrement. Concurrent buyers
  cannot oversell the last unit: the API uses one conditional `UPDATE ... WHERE quantity > 0`.
- **Review** purchases in the garage, including totals and the price paid at the time of sale.
- **Manage inventory** as an admin: create and edit listings, restock units, and delete vehicles.
  Stock changes only through purchase and restock, never through a raw vehicle update.

## Screenshots

Captured from the running app at 1440×1000 by `npm run screenshots`; the mobile view is 375×812.

| Sign in | Catalogue |
| --- | --- |
| ![Sign-in screen](docs/screenshots/01-login.png) | ![Vehicle catalogue](docs/screenshots/02-dashboard.png) |
| **Vehicle detail** | **Sold-out state** |
| ![Vehicle detail](docs/screenshots/03-vehicle-detail.png) | ![Out-of-stock vehicle](docs/screenshots/04-out-of-stock.png) |
| **Purchase confirmation** | **Customer garage** |
| ![Purchase toast](docs/screenshots/05-purchase-toast.png) | ![Customer garage](docs/screenshots/06-garage.png) |
| **Admin console** | **Admin edit dialog** |
| ![Admin console](docs/screenshots/07-admin.png) | ![Admin edit dialog](docs/screenshots/08-admin-form.png) |

**Mobile catalogue**

<img src="docs/screenshots/09-mobile.png" alt="Mobile catalogue at 375 by 812" width="375">

## Scripts

| Command                 | What it does                                             |
| ----------------------- | -------------------------------------------------------- |
| `npm run dev:api`       | API with watch mode on port 3000                         |
| `npm run dev:web`       | Vite dev server on port 5173, proxies `/api`             |
| `npm run db:create`     | Creates the `dealer` and `dealer_test` databases         |
| `npm run db:migrate`    | Applies committed migrations to `DATABASE_URL`           |
| `npm run db:seed`       | Seeds inventory and demo accounts (idempotent)           |
| `npm test`              | Builds shared types, then runs every workspace test suite|
| `npm run test:e2e`      | Playwright journeys; starts any missing dev server       |
| `npm run test:coverage` | Same as `npm test`, with coverage reports                |
| `npm run screenshots`   | Regenerates the README images against the running app    |
| `npm run typecheck`     | `tsc --noEmit` in every workspace                        |
| `npm run lint`          | ESLint over the repo                                     |
| `npm run build`         | Builds shared, API, then web                             |

The E2E suite is configured in `apps/web/playwright.config.ts` and uses the installed Chrome
channel. It covers registration → search → purchase → garage, the full admin create/restock/
edit/delete flow, and the disabled purchase action for an out-of-stock vehicle.

## Testing

| Suite | Tool                        | Tests      | Coverage                              |
| ----- | --------------------------- | ---------- | ------------------------------------- |
| API   | Vitest + Supertest          | 65         | 80.69% statements · 90.00% branches   |
| Web   | Vitest + Testing Library    | 19         | 46.89% statements · 64.17% branches   |
| E2E   | Playwright + installed Chrome | 3 journeys | —                                     |

The API suite runs against PostgreSQL and exercises the HTTP surface end to end; the web suite
covers auth guards, the listing card, login, purchase states and the admin console. The
[test report](docs/test-report.html) collects the counts. Run `npm run test:coverage` to generate
the HTML coverage reports locally under `apps/api/coverage` and `apps/web/coverage`. GitHub Actions
runs typecheck, lint, coverage and build on every push.

## API

| Method | Path                        | Access | Notes                                          |
| ------ | --------------------------- | ------ | ---------------------------------------------- |
| GET    | `/api/health`               | public | process health                                 |
| POST   | `/api/auth/register`        | public | 201 `{ user, token }`, 409 on duplicate        |
| POST   | `/api/auth/login`           | public | 200 `{ user, token }`, 401 on bad login        |
| GET    | `/api/auth/me`              | user   | 200 `{ user }` for a valid Bearer token        |
| GET    | `/api/vehicles`             | user   | filtered, sorted, paginated list               |
| GET    | `/api/vehicles/search`      | user   | same contract as `/vehicles`                   |
| GET    | `/api/vehicles/:id`         | user   | 404 for an unknown or malformed id             |
| POST   | `/api/vehicles`             | user   | 201 `{ vehicle }`                              |
| PUT    | `/api/vehicles/:id`         | user   | partial update; quantity is not accepted       |
| DELETE | `/api/vehicles/:id`         | admin  | 204, or 403 for a customer                     |
| POST   | `/api/vehicles/:id/purchase`| user   | 200 `{ vehicle, purchase }`, 409 when sold out |
| POST   | `/api/vehicles/:id/restock` | admin  | 200 `{ vehicle }`, positive integer only       |
| GET    | `/api/purchases`            | user   | caller's history, newest first                 |

Money is stored and returned as integer cents (`priceCents`, `unitPriceCents`, `totalCents`).
List filters accept whole dollars (`minPrice`, `maxPrice`) and are converted server-side.

## Photo credits

Vehicle photos are local copies of Wikimedia Commons files chosen to match each make and model.
The authors, licences and source links are listed in
[`apps/web/public/cars/ATTRIBUTION.md`](./apps/web/public/cars/ATTRIBUTION.md).

## AI disclosure

Every AI-assisted commit carries a `Co-authored-by` trailer, and the raw prompt log lives in
[PROMPTS.md](./PROMPTS.md). A `commit-msg` hook enforces the trailer; run `npm run prepare` to
install it after cloning.

## My AI Usage

**Tool:** OpenCode with DeepSeek V4.1 Flash Free.

I used the model as an implementation partner, not as the decision-maker. My prompts were few and
short, and most of the detail came from the plan and from reviewing each result.

### Commands I gave it

1. `D:\PLAN.md` — read the brief and work through it.
2. "Start building it" — scaffold the repo and begin.
3. "run the code in my system" — run it locally, not just in tests.
4. "continue with the next steps" — finish the remaining features.
5. "write the AI usage section" — draft this text.

### What stayed human

I kept the decisions that matter: money in integer cents, stock changing only through purchase and
restock, no overselling, and the Autoline design direction. I required a failing test before each
implementation commit and read the diff before accepting it.

The model was strongest on boilerplate and test scaffolding. It missed accessible names on the
vehicle links, wrote duplicate-text assertions that failed when a stock label appeared twice, and
needed the atomic-purchase rule stated explicitly. Short prompts plus tests first kept those
mistakes visible and cheap to fix.
