# Car Dealership Inventory System

A REST API and single-page app for browsing, buying, and managing dealership inventory. Built
test-first: the failing test is committed before each implementation, then the feature lands green.

> **Status:** complete. Register/login, the filtered catalogue, vehicle detail, atomic purchases,
> the customer garage and the admin inventory console all run against PostgreSQL. API, component
> and Playwright suites are green.

## Stack

| Layer    | Choice                                          |
| -------- | ----------------------------------------------- |
| API      | Node 22+, TypeScript, Express 5, Drizzle ORM    |
| Database | PostgreSQL 16 (local server or Docker Compose)  |
| Frontend | React 19, Vite, Tailwind CSS v4, TanStack Query |
| Tests    | Vitest, Supertest, Testing Library, Playwright  |
| Tooling  | npm workspaces, ESLint 9, Prettier              |

The plan specifies Bun workspaces. This machine does not have Bun, so the repo uses npm
workspaces: same single-install, single-CI-run shape, with no extra runtime to install.

## Architecture

```
React SPA (Vite) ──HTTPS──> Express API ──SQL──> PostgreSQL 16
       │                        │
       │                        ├─ JWT auth + role guard
       │                        ├─ Zod validation at the edge
       │                        └─ routes → services → repositories
       └─ TanStack Query cache, token in localStorage
```

The API is intentionally layered but thin: routes wire paths and middleware, controllers map HTTP
to services, services hold the rules (stock, ownership, pricing) and repositories are the only
modules that import Drizzle. The shared Zod package is the contract both sides compile against, so
the SPA cannot silently drift from the API.

## Project structure

```
car-dealership/
  apps/
    api/          Express app, migrations, seed, API tests
    web/          React SPA, component tests, Playwright E2E
      public/cars Local vehicle photography + attribution
  packages/
    shared/       shared Zod schemas, types, roles, error codes
  scripts/        commit-msg hook, installer and screenshot script
  .github/        CI workflow (PostgreSQL 16 service)
  docker-compose.yml
  render.yaml     Render blueprint for the API and database
  vercel.json     Vercel build for the SPA
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

### Environment

| Variable            | Used by   | Purpose                                                    |
| ------------------- | --------- | ---------------------------------------------------------- |
| `DATABASE_URL`      | API       | PostgreSQL connection string                               |
| `DATABASE_URL_TEST` | API tests | Test database; the name must end in `_test`                |
| `JWT_SECRET`        | API       | 32+ characters; the API refuses to boot without it         |
| `CORS_ORIGIN`       | API       | Comma-separated SPA origins allowed to call the API        |
| `PORT`              | API       | HTTP port, default `3000`                                  |
| `VITE_API_URL`      | Web       | Full API base for a split deployment; unset in development |

Start from [`.env.example`](./.env.example). The web app uses Vite's `/api` proxy locally, so it
needs no environment file until it is deployed separately.

Open `http://localhost:5173` and sign in with one of the demo accounts below.

## Demo accounts

| Role     | Email                | Password    |
| -------- | -------------------- | ----------- |
| Customer | `demo@autoline.dev`  | `demo1234`  |
| Admin    | `admin@autoline.dev` | `admin1234` |

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

| Sign in                                                   | Catalogue                                                     |
| --------------------------------------------------------- | ------------------------------------------------------------- |
| ![Sign-in screen](docs/screenshots/01-login.png)          | ![Vehicle catalogue](docs/screenshots/02-dashboard.png)       |
| **Vehicle detail**                                        | **Sold-out state**                                            |
| ![Vehicle detail](docs/screenshots/03-vehicle-detail.png) | ![Out-of-stock vehicle](docs/screenshots/04-out-of-stock.png) |
| **Purchase confirmation**                                 | **Customer garage**                                           |
| ![Purchase toast](docs/screenshots/05-purchase-toast.png) | ![Customer garage](docs/screenshots/06-garage.png)            |
| **Admin console**                                         | **Admin edit dialog**                                         |
| ![Admin console](docs/screenshots/07-admin.png)           | ![Admin edit dialog](docs/screenshots/08-admin-form.png)      |

**Mobile catalogue**

<img src="docs/screenshots/09-mobile.png" alt="Mobile catalogue at 375 by 812" width="375">

## Scripts

| Command                 | What it does                                              |
| ----------------------- | --------------------------------------------------------- |
| `npm run dev:api`       | API with watch mode on port 3000                          |
| `npm run dev:web`       | Vite dev server on port 5173, proxies `/api`              |
| `npm run db:create`     | Creates the `dealer` and `dealer_test` databases          |
| `npm run db:migrate`    | Applies committed migrations to `DATABASE_URL`            |
| `npm run db:seed`       | Seeds inventory and demo accounts (idempotent)            |
| `npm test`              | Builds shared types, then runs every workspace test suite |
| `npm run test:e2e`      | Playwright journeys; starts any missing dev server        |
| `npm run test:coverage` | Same as `npm test`, with coverage reports                 |
| `npm run screenshots`   | Regenerates the README images against the running app     |
| `npm run typecheck`     | `tsc --noEmit` in every workspace                         |
| `npm run lint`          | ESLint over the repo                                      |
| `npm run build`         | Builds shared, API, then web                              |

The E2E suite is configured in `apps/web/playwright.config.ts` and uses the installed Chrome
channel. It covers registration → search → purchase → garage, the full admin create/restock/
edit/delete flow, and the disabled purchase action for an out-of-stock vehicle.

## Testing

| Suite | Tool                          | Tests      | Coverage                            |
| ----- | ----------------------------- | ---------- | ----------------------------------- |
| API   | Vitest + Supertest            | 68         | 80.83% statements · 90.07% branches |
| Web   | Vitest + Testing Library      | 21         | 46.97% statements · 64.45% branches |
| E2E   | Playwright + installed Chrome | 3 journeys | —                                   |

The API suite runs against PostgreSQL and exercises the HTTP surface end to end; the web suite
covers auth guards, the listing card, login, purchase states, the configurable API base and the
admin console. The
[test report](docs/test-report.html) collects the counts. Run `npm run test:coverage` to generate
the HTML coverage reports locally under `apps/api/coverage` and `apps/web/coverage`. GitHub Actions
runs typecheck, lint, coverage and build on every push.

## API

| Method | Path                         | Access | Notes                                          |
| ------ | ---------------------------- | ------ | ---------------------------------------------- |
| GET    | `/api/health`                | public | process health                                 |
| POST   | `/api/auth/register`         | public | 201 `{ user, token }`, 409 on duplicate        |
| POST   | `/api/auth/login`            | public | 200 `{ user, token }`, 401 on bad login        |
| GET    | `/api/auth/me`               | user   | 200 `{ user }` for a valid Bearer token        |
| GET    | `/api/vehicles`              | user   | filtered, sorted, paginated list               |
| GET    | `/api/vehicles/search`       | user   | same contract as `/vehicles`                   |
| GET    | `/api/vehicles/:id`          | user   | 404 for an unknown or malformed id             |
| POST   | `/api/vehicles`              | user   | 201 `{ vehicle }`                              |
| PUT    | `/api/vehicles/:id`          | user   | partial update; quantity is not accepted       |
| DELETE | `/api/vehicles/:id`          | admin  | 204, or 403 for a customer                     |
| POST   | `/api/vehicles/:id/purchase` | user   | 200 `{ vehicle, purchase }`, 409 when sold out |
| POST   | `/api/vehicles/:id/restock`  | admin  | 200 `{ vehicle }`, positive integer only       |
| GET    | `/api/purchases`             | user   | caller's history, newest first                 |

Money is stored and returned as integer cents (`priceCents`, `unitPriceCents`, `totalCents`).
List filters accept whole dollars (`minPrice`, `maxPrice`) and are converted server-side.

### Examples

```bash
# Sign in and keep the token (jq required)
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@autoline.dev","password":"demo1234"}' | jq -r .token)

# List electric vehicles under $60,000, cheapest first
curl -s "http://localhost:3000/api/vehicles?category=ev&maxPrice=60000&sort=price_asc" \
  -H "Authorization: Bearer $TOKEN"

# Buy one unit
curl -s -X POST "http://localhost:3000/api/vehicles/<vehicle-id>/purchase" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{}'

# Restock as an admin (sign in with the admin account to get ADMIN_TOKEN)
curl -s -X POST "http://localhost:3000/api/vehicles/<vehicle-id>/restock" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' -d '{"quantity":3}'
```

## Design decisions

- **Integer cents.** Prices and totals are integers; formatting happens only in the UI. Filters
  accept whole dollars and convert once at the API edge.
- **Atomic purchase.** The service runs one conditional
  `UPDATE ... SET quantity = quantity - 1 WHERE id = $1 AND quantity > 0` inside a transaction with
  the purchase insert. A read-then-write would oversell under concurrency; the loser here gets
  `409` and stock never goes negative.
- **Stock has one path.** `PUT /vehicles/:id` rejects `quantity`; purchase and restock are the only
  ways stock changes. That keeps the invariant enforceable and the purchase history honest.
- **Shared inventory, role-based writes.** Any authenticated user can create and edit listings;
  only admins can delete or restock. The API enforces `403` even when the UI hides the controls.
- **Filters live in the URL.** Page, search, category, price and sort are query parameters, so
  refresh, back/forward and shared links restore the view. The search box debounces for 300 ms
  before it writes the URL.
- **Optimistic purchase with rollback.** The mutation decrements the cached vehicle immediately,
  shows a toast, then reconciles with the response. A `409` rolls the cache back and refetches.
- **Token in `localStorage`.** Simple for a demo, with a global `401` event that clears the session.
  The production hardening step would be an httpOnly refresh cookie with an in-memory access token.
- **Local photography.** Seed images are local Wikimedia Commons files with attribution in
  [`apps/web/public/cars/ATTRIBUTION.md`](./apps/web/public/cars/ATTRIBUTION.md), so the app has no
  runtime image dependency and the demo works offline.

## Deployment

[`render.yaml`](./render.yaml) and [`vercel.json`](./vercel.json) are ready for a split deployment:
API and PostgreSQL on Render, SPA on Vercel. Both need a GitHub remote; this checkout is currently
local-only, so the hosted URL is the one item from the plan that is not live yet.

### API and database (Render)

1. Push the repository to GitHub.
2. In Render, choose **New → Blueprint** and select the repo. The blueprint creates a free
   PostgreSQL 16 database and the `autoline-api` web service.
3. When Render asks for `CORS_ORIGIN`, enter the Vercel URL from the next section. The value is a
   comma-separated allowlist, so preview URLs can be added later.
4. The first deploy applies the migrations and seeds the 24 vehicles plus the demo accounts. Check
   `https://<service>.onrender.com/api/health` before opening the SPA.

### SPA (Vercel)

1. Import the same repository. Keep the root directory at the repo root; `vercel.json` builds the
   shared package and `apps/web`, then publishes `apps/web/dist`.
2. Add `VITE_API_URL=https://<service>.onrender.com/api` to the Vercel project environment.
3. Deploy, then copy the Vercel domain into Render's `CORS_ORIGIN` and redeploy the API.
4. Smoke test: sign in as the demo customer, filter the catalogue, buy a car and open the garage.

Free Render services sleep after inactivity, so the first request after a quiet period can take a
few seconds. The API reads `PORT` from Render and binds to all interfaces automatically.

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

## License

MIT — see [LICENSE](./LICENSE).
