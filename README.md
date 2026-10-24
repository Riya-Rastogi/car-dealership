# Autoline — Car Dealership Inventory

Autoline is a complete car dealership application with two sides: a storefront where customers
search the lot and buy a car, and an admin console where staff add, edit, restock and remove
listings. It is a real full-stack app, not a mock: React runs in the browser, an Express API holds
the rules, and PostgreSQL stores the cars, accounts and purchases.

The project was built test-first. Each feature started with a failing test, then the smallest
implementation that made it pass.

> **Status:** the app runs locally against PostgreSQL. 68 API tests, 21 web tests and 3 Playwright
> journeys pass. Deployment files for Render and Vercel are included; see
> [Deployment](#deployment).

## Contents

- [What you can do](#what-you-can-do)
- [Demo accounts](#demo-accounts)
- [Screenshots](#screenshots)
- [How it works](#how-it-works)
- [Run it on your computer](#run-it-on-your-computer)
- [Troubleshooting](#troubleshooting)
- [Everyday commands](#everyday-commands)
- [Project layout](#project-layout)
- [API](#api)
- [Testing](#testing)
- [Design decisions](#design-decisions)
- [Deployment](#deployment)
- [Credits, AI use and license](#credits-ai-use-and-license)

## What you can do

- **Browse the lot.** Search by make or model, filter by body style and price, and sort the results.
  Every filter is kept in the URL, so refreshing the page or using the back button does not lose
  your place. Search waits 300 ms after you stop typing before it runs.
- **Inspect a car.** Open any vehicle to see its photos, description, year, price and live stock
  count.
- **Buy a car.** Confirm the purchase in a dialog. The stock count drops immediately, and the car
  appears in your garage with the price you paid. When the last car is gone the button is disabled
  and reads **Out of stock**.
- **See your garage.** Every purchase is listed with its date, unit price and total.
- **Manage the lot as an admin.** Create and edit listings, restock units and delete cars. Stock can
  only change through a purchase or a restock, never through a normal edit.
- **Register and sign in.** Accounts are protected with JWTs. Customers can browse, buy and create
  listings; only admins can delete or restock.

## Demo accounts

The seed creates one customer and one admin account:

| Role     | Email                | Password    |
| -------- | -------------------- | ----------- |
| Customer | `demo@autoline.dev`  | `demo1234`  |
| Admin    | `admin@autoline.dev` | `admin1234` |

## Screenshots

These were captured from the running app at 1440×1000 by `npm run screenshots`. The mobile view is
375×812.

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

## How it works

[![How Autoline works: the browser talks to the server, the server reads and writes the database, and a four-step purchase flow prevents overselling](docs/architecture.png)](docs/architecture.svg)

The image links to the editable [SVG source](docs/architecture.svg).

There are only three parts:

- **Your browser** runs the website. It shows the catalogue, forms and your garage, and sends your
  actions to the server.
- **The server** is the rulebook. It checks who you are, applies the stock and price rules, and
  refuses actions you are not allowed to take.
- **The database** is the memory. It keeps every car, account and purchase, even after the server
  restarts.

The bottom half of the picture follows one purchase. When you press **Buy**, the browser sends one
request. The server takes a car off the shelf in a single, unbreakable database step and saves the
receipt in the same transaction. If two people reach for the last car at the same moment, only one
succeeds; the other gets a `409` and sees **Out of stock**. Stock can never go below zero.

### Under the hood

The API is layered but thin: routes wire paths and middleware, controllers map HTTP to services,
services hold the rules (stock, ownership, pricing), and repositories are the only modules that
import Drizzle. The shared Zod package is the contract both sides compile against, so the SPA cannot
silently drift from the API.

| Layer    | Choice                                          |
| -------- | ----------------------------------------------- |
| API      | Node 22+, TypeScript, Express 5, Drizzle ORM    |
| Database | PostgreSQL 16 (local server or Docker Compose)  |
| Frontend | React 19, Vite, Tailwind CSS v4, TanStack Query |
| Tests    | Vitest, Supertest, Testing Library, Playwright  |
| Tooling  | npm workspaces, ESLint 9, Prettier              |

The brief suggested Bun workspaces. This implementation uses npm workspaces instead, so it runs with
the Node/npm toolchain most machines already have. It is still one install and one CI run.

## Run it on your computer

You do not need to know the code to run this. You need a terminal and about 15 minutes.

Commands are shown for macOS/Linux. Where Windows PowerShell is different, both versions are shown.

### What you need

| Tool            | Version     | Why                                                 |
| --------------- | ----------- | --------------------------------------------------- |
| Node.js         | 22 or newer | Runs the API, the build tools and the tests         |
| npm             | 10 or newer | Comes with Node.js                                  |
| Git             | any recent  | Downloads the project                               |
| Docker Desktop  | any recent  | Runs PostgreSQL 16 for you (Docker Engine on Linux) |
| _or_ PostgreSQL | 16 or newer | If you prefer a normal database installation        |
| Google Chrome   | any recent  | Only needed for the optional Playwright journeys    |

Check what you already have:

```bash
node --version
npm --version
git --version
docker --version
```

### Step 1 — Get the project

```bash
git clone https://github.com/Riya-Rastogi/car-dealership.git
cd car-dealership
```

If you do not have Git, download the ZIP from the repository page, unzip it, and open a terminal in
that folder.

### Step 2 — Install the dependencies

```bash
npm install
```

This downloads everything the API and website need. It also installs a small Git hook that requires
the AI co-author trailer on future commits.

### Step 3 — Start PostgreSQL

Choose **one** of the two options below.

#### Option A — Docker (recommended)

Start Docker (Docker Desktop on Windows/macOS, Docker Engine on Linux), then run:

```bash
docker compose up -d db
```

This starts PostgreSQL 16 in the background with the user `dealer`, password `dealer` and database
`dealer`. Check that it is running:

```bash
docker compose ps
```

Wait until the `db` service says `healthy` (usually a few seconds). If your machine only has the
older `docker-compose` command, use `docker-compose` in place of `docker compose`.

#### Option B — PostgreSQL installed on your computer

Install PostgreSQL 16 (or newer) from [postgresql.org/download](https://www.postgresql.org/download/),
then make sure the server is running:

- **Windows:** open **Services**, find the PostgreSQL service and start it. The installer also puts
  `psql` in the PostgreSQL `bin` folder; add that folder to your `PATH` if `psql` is not recognised.
- **macOS (Homebrew):** `brew install postgresql@16` then `brew services start postgresql@16`.
- **Linux:** `sudo apt install postgresql` then `sudo systemctl start postgresql`.

Create a local development role named `dealer` with the password `dealer`:

**Windows (PowerShell):** enter the password you chose for the `postgres` user when prompted.

```powershell
psql -U postgres -c "CREATE ROLE dealer LOGIN PASSWORD 'dealer' CREATEDB;"
```

**macOS (Homebrew):** the first superuser is your own macOS account.

```bash
createuser --createdb --pwprompt dealer
```

If `createuser` is not found, run `brew link postgresql@16` first or use the full path printed by
`brew --prefix postgresql@16`.

**Linux:**

```bash
sudo -u postgres psql -c "CREATE ROLE dealer LOGIN PASSWORD 'dealer' CREATEDB;"
```

The `CREATEDB` permission lets the setup command create the `dealer` and `dealer_test` databases.
These are local demo credentials; do not reuse them in production.

### Step 4 — Create your settings file

Copy the example file:

```bash
# macOS / Linux
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

Open `.env` in any text editor. Generate a secret and replace the placeholder value:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

```dotenv
JWT_SECRET=paste-the-generated-value-here
```

The database settings already match both options above:

```dotenv
DATABASE_URL=postgres://dealer:dealer@localhost:5432/dealer
DATABASE_URL_TEST=postgres://dealer:dealer@localhost:5432/dealer_test
```

If you used different database credentials, edit those two lines. Do not commit `.env`; it is
already ignored by Git.

#### Environment variables

| Variable            | Used by   | Purpose                                                    |
| ------------------- | --------- | ---------------------------------------------------------- |
| `DATABASE_URL`      | API       | PostgreSQL connection string                               |
| `DATABASE_URL_TEST` | API tests | Test database; the name must end in `_test`                |
| `JWT_SECRET`        | API       | 32+ characters; the API refuses to boot without it         |
| `CORS_ORIGIN`       | API       | Comma-separated SPA origins allowed to call the API        |
| `PORT`              | API       | HTTP port, default `3000`                                  |
| `VITE_API_URL`      | Web       | Full API base for a split deployment; unset in development |

The API reads `.env` from the repository root. The web app needs no environment file locally because
Vite proxies `/api` to `http://localhost:3000`; a separate deployment sets `VITE_API_URL` to the API
base, including the `/api` prefix.

### Step 5 — Prepare the database

From the project folder:

```bash
npm run db:create    # creates the dealer and dealer_test databases
npm run db:migrate   # creates the tables
npm run db:seed      # adds 24 cars and the two demo accounts
```

`db:create` is safe to run again: it reports that the databases already exist and changes nothing.
`db:seed` is also safe to repeat; it will not duplicate the catalogue.

### Step 6 — Start the API

Open a terminal in the project folder and run:

```bash
npm run dev:api
```

Wait for:

```text
API listening on http://localhost:3000
```

Leave this terminal open.

### Step 7 — Start the website

Open a **second** terminal in the same folder and run:

```bash
npm run dev:web
```

Wait for the Vite banner, then open **http://localhost:5173** in your browser.

> **Do not run `npm run dev` on its own.** That starts only the API. Use the two commands above so
> the website and the API run together.

### Step 8 — Sign in

Use either account from [Demo accounts](#demo-accounts). The customer account can buy a car and see
the garage. The admin account can also open **Admin** and manage the lot.

To stop the app, press `Ctrl+C` in both terminals. To stop the database container:

```bash
docker compose stop db
```

Your data stays in the Docker volume; `docker compose down` removes the container but keeps the
volume.

### The next time you run it

```bash
docker compose up -d db   # if you use Docker
npm run dev:api           # terminal 1
npm run dev:web           # terminal 2
```

## Troubleshooting

| What you see                                       | What it means                                   | What to do                                                                                |
| -------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `'npm' is not recognized`                          | Node.js is missing or not on your `PATH`        | Install Node.js 22+, reopen the terminal and check `node --version`                       |
| `JWT_SECRET must be at least 32 characters`        | The placeholder in `.env` was not replaced      | Generate a secret in Step 4 and paste it into `.env`                                      |
| `ECONNREFUSED 127.0.0.1:5432`                      | PostgreSQL is not running                       | Start Docker Desktop and run `docker compose up -d db`, or start your local service       |
| `password authentication failed for user "dealer"` | The database user or password does not match    | Recreate the role in Step 3, or update `DATABASE_URL` in `.env`                           |
| `database "dealer_test" does not exist`            | The test database was never created             | Run `npm run db:create`                                                                   |
| `Port 3000 is already in use`                      | Another API process is running                  | Stop the other process, then start the API again                                          |
| Vite opens on port 5174 instead of 5173            | Another website is using 5173                   | Stop the other app, or add the printed URL to `CORS_ORIGIN` in `.env` and restart the API |
| `docker: command not found`                        | Docker Desktop is not installed or not running  | Install/start Docker Desktop, or use the native PostgreSQL option                         |
| `psql: command not found`                          | PostgreSQL's `bin` folder is not on your `PATH` | Add it to `PATH`, reopen the terminal, or use the Docker option                           |
| Playwright says Chrome is not installed            | The E2E suite uses your installed Google Chrome | Install Google Chrome, or change `channel` in `apps/web/playwright.config.ts`             |

To find what is using a port:

```powershell
# Windows PowerShell
Get-NetTCPConnection -LocalPort 3000 | Select-Object OwningProcess
Stop-Process -Id <the-process-id>
```

```bash
# macOS / Linux
lsof -i :3000
kill <the-process-id>
```

## Everyday commands

| Command                 | What it does                                               |
| ----------------------- | ---------------------------------------------------------- |
| `npm run dev:api`       | API with watch mode on port 3000                           |
| `npm run dev:web`       | Vite dev server on port 5173, proxies `/api` to the API    |
| `npm run db:create`     | Creates the `dealer` and `dealer_test` databases           |
| `npm run db:migrate`    | Applies committed migrations to `DATABASE_URL`             |
| `npm run db:seed`       | Seeds 24 cars and the demo accounts (idempotent)           |
| `npm test`              | Builds shared types, then runs every workspace test suite  |
| `npm run test:e2e`      | Playwright journeys; starts any missing dev server         |
| `npm run test:coverage` | Same as `npm test`, with HTML coverage reports             |
| `npm run screenshots`   | Regenerates the README screenshots against the running app |
| `npm run typecheck`     | `tsc --noEmit` in every workspace                          |
| `npm run lint`          | ESLint over the repo                                       |
| `npm run build`         | Builds shared, API, then web                               |

## Project layout

```text
car-dealership/
├─ apps/
│  ├─ api/          Express app, database schema, migrations, seed, API tests
│  └─ web/          React SPA, component tests, Playwright journeys
│     └─ public/cars/  Local vehicle photos and attribution
├─ packages/
│  └─ shared/       Zod schemas, types, roles and error codes used by both sides
├─ docs/            Architecture, screenshots and test evidence
├─ scripts/         Commit hook, installer and screenshot script
├─ .github/         CI workflow with a PostgreSQL 16 service
├─ docker-compose.yml
├─ render.yaml      Render blueprint for the API and database
├─ vercel.json      Vercel build for the SPA
├─ PLAN.md
└─ PROMPTS.md
```

## API

You do not need this section to use the app in the browser. It is for developers who want to call
the API directly.

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

These examples use bash/zsh and `jq`. On Windows, run them in Git Bash or WSL.

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

## Testing

| Suite | Tool                          | Tests      | Coverage                            |
| ----- | ----------------------------- | ---------- | ----------------------------------- |
| API   | Vitest + Supertest            | 68         | 80.83% statements · 90.07% branches |
| Web   | Vitest + Testing Library      | 21         | 46.97% statements · 64.45% branches |
| E2E   | Playwright + installed Chrome | 3 journeys | —                                   |

The API suite runs against PostgreSQL and exercises the HTTP surface end to end. The web suite
covers the auth guards, the vehicle card, login, purchase states, the configurable API base and the
admin console.

```bash
npm test              # API + component suites
npm run test:coverage # the same, with HTML coverage reports
npm run test:e2e      # three browser journeys
```

The coverage reports are written to `apps/api/coverage` and `apps/web/coverage`. The
[test report](docs/test-report.html) collects the current counts and the evidence. The API suite uses
the `dealer_test` database and refuses to run against a database whose name does not end in `_test`.
Make sure PostgreSQL is running and the database is seeded before `npm run test:e2e`.

The E2E suite is configured in `apps/web/playwright.config.ts`; it uses your installed Google Chrome
and starts any missing dev server. It covers registration → search → purchase → garage, the full
admin create/restock/edit/delete flow, and the disabled purchase action for an out-of-stock vehicle.

GitHub Actions runs typecheck, lint, coverage and build on every push.

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
- **npm workspaces.** The brief suggested Bun; npm keeps the setup to Node and npm, which are
  already required, and still gives one install and one CI run.

## Deployment

The repository includes a [Render blueprint](./render.yaml) for the API and PostgreSQL, and a
[Vercel configuration](./vercel.json) for the SPA. The split keeps the database private and lets the
website be served from a CDN.

### API and database (Render)

1. Push the repository to GitHub.
2. In Render, choose **New → Blueprint** and select the repo. The blueprint creates a free
   PostgreSQL 16 database and the `autoline-api` web service.
3. When Render asks for `CORS_ORIGIN`, enter the Vercel URL from the next section. The value is a
   comma-separated allowlist, so preview URLs can be added later.
4. The first deploy applies the migrations and seeds the 24 cars plus the demo accounts. Check
   `https://<service>.onrender.com/api/health` before opening the SPA.

### SPA (Vercel)

1. Import the same repository. Keep the root directory at the repo root; `vercel.json` builds the
   shared package and `apps/web`, then publishes `apps/web/dist`.
2. Add `VITE_API_URL=https://<service>.onrender.com/api` to the Vercel project environment.
3. Deploy, then copy the Vercel domain into Render's `CORS_ORIGIN` and redeploy the API.
4. Smoke test: sign in as the demo customer, filter the catalogue, buy a car and open the garage.

Free Render services sleep after inactivity, so the first request after a quiet period can take a
few seconds. The API reads `PORT` from Render and binds to all interfaces automatically.

## Credits, AI use and license

### Photo credits

Vehicle photos are local copies of Wikimedia Commons files chosen to match each make and model. The
authors, licences and source links are listed in
[`apps/web/public/cars/ATTRIBUTION.md`](./apps/web/public/cars/ATTRIBUTION.md).

### AI disclosure

Every AI-assisted commit carries a `Co-authored-by` trailer, and the raw prompt log lives in
[PROMPTS.md](./PROMPTS.md). A `commit-msg` hook enforces the trailer; `npm install` installs it, and
`npm run prepare` reinstalls it.

### My AI Usage

**Tool:** OpenCode with DeepSeek V4.1 Flash Free.

I used the model as a pair programmer for the wiring, not as the person who decided what to build.
Most sessions followed the same loop: I hit a concrete problem, gave it the error and the files or
endpoints involved, asked for the smallest fix, and then checked the result myself with a test, a
request or the running app. The instructions below summarise the work; the raw session log is in
[PROMPTS.md](./PROMPTS.md).

#### 1. The frontend and backend were not connected

The page loaded, but login and vehicle requests failed. I gave it the failing request and this
instruction:

> `backend is not connected with frontend — connect the React app to the Express API, fix the API base URL, and add CORS for local and deployed origins`

It added the Vite `/api` proxy for development, a `CORS_ORIGIN` allowlist on the API, a single
`apiUrl()` helper for every request, and `VITE_API_URL` for a split deployment. I checked it by
signing in through the browser and sending a CORS preflight with `curl -X OPTIONS`.

#### 2. Two people could buy the last car

A read-then-write purchase would let two requests both see the last car. I asked:

> `make the purchase atomic — stock must never go negative, and the losing request should get 409`

The fix was one conditional `UPDATE ... WHERE quantity > 0` and the purchase insert in the same
transaction. I checked it with concurrent purchase requests in the API suite: one succeeded, one got
`409`, and the stock stayed at zero.

#### 3. The app passed tests but would not run on Windows

The tests were green, but the app still needed a real database, environment variables and two dev
servers. I asked:

> `run the app on my machine, not only in tests; PostgreSQL is local on 127.0.0.1:5432`

It added root `.env` loading, the `db:create` / `db:migrate` / `db:seed` scripts, separate API and
web dev servers, and a documented local-PostgreSQL path. I checked it by opening `localhost:5173`,
signing in, buying a car and reading the purchase back from the garage.

#### 4. Filters reset on refresh and search fired on every keystroke

I asked:

> `keep page, search, category, price and sort in the URL; debounce the search by 300 ms`

It made `useSearchParams` the source of truth and added a 300 ms debounce before writing the URL. I
checked refresh, back/forward and a copied link in the browser.

#### 5. The deployment would call its own `/api`

The SPA and API would live on different domains in production, so a relative `/api` request would
hit Vercel instead of Render. I asked:

> `prepare a split deployment: API and PostgreSQL on Render, SPA on Vercel; wire CORS_ORIGIN and VITE_API_URL`

It added `render.yaml`, `vercel.json`, the environment documentation and the configurable API base.
I checked it by building the SPA with `VITE_API_URL` set, confirming the deployed URL was embedded
in the bundle, and repeating the CORS preflight against the local API.

#### 6. The README assumed too much

I asked:

> `rewrite the README for someone who has never run a Node app; give steps for Windows, macOS and Linux, and explain the architecture without assuming context`

That became this README. I checked the commands against this checkout and re-read the steps as a
first-time user, removing the assumptions about Bun and my own machine's paths.

#### What I kept human

I decided the product rules: money in integer cents, stock changing only through purchase and
restock, no overselling, and the Autoline design direction. I required a failing test before each
implementation commit and read the diff before accepting it.

#### Where it helped, and where it slipped

The model was strongest on boilerplate, test scaffolding and wiring. It missed accessible names on
the vehicle links, wrote duplicate-text assertions that failed when a stock label appeared twice,
and needed the atomic-purchase rule stated explicitly. Short instructions plus tests first kept
those mistakes visible and cheap to fix.

### License

MIT — see [LICENSE](./LICENSE).
