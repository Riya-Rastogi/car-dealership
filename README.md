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
| `npm run typecheck`     | `tsc --noEmit` in every workspace                        |
| `npm run lint`          | ESLint over the repo                                     |
| `npm run build`         | Builds shared, API, then web                             |

The E2E suite is configured in `apps/web/playwright.config.ts` and uses the installed Chrome
channel. It covers registration → search → purchase → garage, the full admin create/restock/
edit/delete flow, and the disabled purchase action for an out-of-stock vehicle.

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

### Tools used

I used **OpenCode** with **DeepSeek V4.1 Flash Free** as the coding agent for this project. I set
the scope, stack and acceptance criteria; the model did most of the implementation and test
scaffolding, and I reviewed every commit.

### How I used it

- **Scaffolding and plumbing.** I chose npm workspaces instead of Bun and a local PostgreSQL 16
  instead of Docker because of the machine I was working on. I had the model set up the
  Express/Drizzle API, shared Zod schemas, and the Vite/React/Tailwind client, then trimmed the
  structure where it added more layers than the project needed.
- **Test-first delivery.** I asked for a failing test commit before each implementation commit and a
  `Co-authored-by` trailer on every AI-assisted commit. The model wrote the Vitest/Supertest suites,
  the React Testing Library tests and the Playwright journeys. I checked that each test described
  behaviour rather than implementation.
- **The purchase rule.** The important domain rule was mine: never oversell and never let stock go
  negative. I directed the model to use a single conditional `UPDATE ... WHERE quantity > 0` inside
  a transaction rather than a read-then-write, and to return `409` for the loser of a race. That
  decision came before the code; the model implemented and tested it.
- **Admin and UI work.** The model built the inventory table, dialogs, URL-synced filters, the
  300 ms debounce, and the optimistic purchase update with rollback. I set the "Autoline" visual
  direction and reviewed the result at desktop and mobile widths.
- **Debugging.** When the Playwright run failed, I asked for the failing trace rather than a guess.
  That exposed empty accessible names on the vehicle links and a race with the debounced search.
  The fixes were test changes plus `aria-label`s, not cosmetic patches.

### Reflection

The model was fastest at boilerplate: workspace wiring, CRUD routes, migration files, form markup
and the first draft of every test. It was less reliable on the things that need judgement. It
initially missed the accessible-name failure, produced duplicate-text assertions that broke when
the same stock label appeared twice, and needed the atomic purchase rule stated explicitly instead
of inferring it. It also could not judge whether the mobile layout looked right; that check stayed
with me.

What changed in how I work is that I now give the model a tighter specification and better
evidence: the failing test, the exact domain invariant, the response shape I expect. Tests first
are not just for coverage — they give the model something concrete to satisfy and give me a diff I
can judge. I read every commit and keep the product decisions — roles, money in cents, stock rules
and the visual direction — human.
