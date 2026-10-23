# Car Dealership Inventory System

A REST API and single-page app for browsing, buying, and managing dealership inventory. Built
test-first, with the failing test committed before each implementation.

> **Status:** Phases 0–2 in progress. Auth, the vehicle list/detail/create API, and the signed-in
> catalogue dashboard run against Postgres. Purchase, admin CRUD, the garage and the remaining
> test layers are next in [PLAN.md](./PLAN.md).

## Stack

| Layer    | Choice                                                       |
| -------- | ------------------------------------------------------------ |
| API      | Node 22+, TypeScript, Express 5                              |
| Database | PostgreSQL 16 (Docker Compose locally)                       |
| Frontend | React 19, Vite, Tailwind CSS v4, TanStack Query              |
| Tests    | Vitest, Supertest, Testing Library, Playwright (from Phase 5) |
| Tooling  | npm workspaces, ESLint 9, Prettier                           |

The plan specifies Bun workspaces. This machine does not have Bun, so the repo uses npm
workspaces: same single-install, single-CI-run shape, no extra runtime to install.

## Project structure

```
car-dealership/
  apps/
    api/        Express app, database, API tests
    web/        React SPA
  packages/
    shared/     shared types, roles, error codes
  scripts/      commit-msg hook and installer
  docker-compose.yml
  PLAN.md
  PROMPTS.md
```

## Getting started

Prerequisites: Node 22 or newer (npm 10+), Git, and either Docker or a local PostgreSQL 16.

```bash
npm install
cp .env.example .env
docker compose up -d db
npm run db:create      # creates dealer and dealer_test
npm run db:migrate     # applies committed migrations to dealer
npm run db:seed        # 24 vehicles plus demo customer/admin accounts
npm run dev:api        # http://localhost:3000/api/health
npm run dev:web        # http://localhost:5173
```

Without Docker, create a `dealer` database on any local PostgreSQL 16 and point `DATABASE_URL` in
`.env` at it.

## Scripts

| Command                 | What it does                                            |
| ----------------------- | ------------------------------------------------------- |
| `npm run dev:api`       | API with watch mode                                     |
| `npm run dev:web`       | Vite dev server, proxies `/api` to port 3000            |
| `npm run db:create`     | Creates the `dealer` and `dealer_test` databases        |
| `npm run db:migrate`    | Applies committed migrations to `DATABASE_URL`          |
| `npm run db:seed`       | Seeds inventory and demo accounts (idempotent)          |
| `npm test`              | Build shared types, then run every workspace test suite |
| `npm run test:coverage` | Same, with coverage reports                             |
| `npm run typecheck`     | `tsc --noEmit` in every workspace                       |
| `npm run lint`          | ESLint over the repo                                    |
| `npm run build`         | Build shared, API, then web                             |

## AI disclosure

Every AI-assisted commit carries a `Co-authored-by` trailer, and the raw prompt log lives in
[PROMPTS.md](./PROMPTS.md). A `commit-msg` hook enforces the trailer; run `npm run prepare` to
install it after cloning.

## API

| Method | Path                 | Access | Notes                                      |
| ------ | -------------------- | ------ | ------------------------------------------ |
| GET    | `/api/health`        | public | process health                             |
| POST   | `/api/auth/register` | public | 201 `{ user, token }`, 409 on duplicate    |
| POST   | `/api/auth/login`    | public | 200 `{ user, token }`, 401 on bad login    |
| GET    | `/api/auth/me`       | user   | 200 `{ user }` for a valid Bearer token    |
| GET    | `/api/vehicles`      | user   | filtered, sorted, paginated list           |
| GET    | `/api/vehicles/search` | user | same contract as `/vehicles`               |
| GET    | `/api/vehicles/:id`  | user   | 404 for an unknown id                      |
| POST   | `/api/vehicles`      | user   | 201 created vehicle                        |

## Demo accounts

`npm run db:seed` creates two local accounts:

| Role     | Email               | Password  |
| -------- | ------------------- | --------- |
| Customer | `demo@autoline.dev` | `demo1234` |
| Admin    | `admin@autoline.dev`| `admin1234` |

## My AI Usage

<!-- The author writes this section in Phase 8. Do not have an AI draft it. -->

_To be completed before submission._
