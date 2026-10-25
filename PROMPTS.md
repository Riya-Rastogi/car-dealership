# AI Engineering Log

| Field       | Value                                                                                |
| ----------- | ------------------------------------------------------------------------------------ |
| **Project** | Autoline — car dealership inventory                                                  |
| **Tool**    | OpenCode                                                                             |
| **Model**   | DeepSeek V4.1 Flash Free                                                             |
| **Period**  | 2026-10-23 → 2026-10-25                                                              |
| **Method**  | red → green → refactor, smallest viable diff, verification over HTTP, browser and CI |

This file records the AI-assisted engineering sessions as a technical log. Each entry pairs a
plain-English prompt with the context behind it, the implementation that landed and the check that
proved it. The prompts are written as engineering requests, not copied from a chat transcript. The
full transcript remains in the OpenCode session.

## Session index

| Date       | Session               | Scope                                                             | Evidence                                       |
| ---------- | --------------------- | ----------------------------------------------------------------- | ---------------------------------------------- |
| 2026-10-23 | Foundation            | Monorepo, PostgreSQL schema, JWT auth, catalogue, atomic purchase | API tests, HTTP checks, browser sign-in        |
| 2026-10-24 | Storefront + evidence | Detail/purchase/garage, admin console, photography, CI            | 68 API + 21 web + 3 E2E, coverage, screenshots |
| 2026-10-24 | Deployment readiness  | CORS, configurable API base, Render/Vercel manifests              | Red/green tests, production build              |
| 2026-10-24 | Live deployment       | Render + Vercel rollout, production smoke test                    | Live URLs, Playwright smoke                    |
| 2026-10-25 | Documentation pass    | Technical log, Mermaid design, README readability                 | Prettier, link and syntax checks               |

## 2026-10-23 — Foundation

### 01 · Monorepo scaffold

**Context.** `PLAN.md` defined a two-app monorepo. The host had Node 22 and npm, but neither Bun nor
Docker, so the brief's Bun-workspace setup had to be replaced without giving up the one-install and
one-CI-run properties.

**Prompt.**

> Set up the project as an npm-workspaces monorepo. I don't have Bun or Docker on this machine, so use
> Node 22 and npm. Create `apps/api` with Express 5 and TypeScript, `apps/web` with React 19 and Vite,
> and `packages/shared` for the Zod schemas and types. Add strict TypeScript, ESLint, Prettier,
> Vitest, and a `/api/health` endpoint I can curl.

**Implementation.**

- Root `package.json` declares the `apps/*` and `packages/*` workspaces and requires Node 22+.
- The shared package is built first and consumed by both apps.
- The API exposes an app factory (`createApp`) separate from the listener, so Supertest can drive it
  without opening a port.
- The health route is mounted at `/api/health`; central error middleware returns a stable error
  envelope.
- `scripts/install-hooks.mjs` installs the `commit-msg` hook that enforces the AI co-author trailer.

**Verification.** `npm run typecheck`, `npm run lint` and `npm test` passed; `GET /api/health`
returned `200`.

### 02 · Persistence and test isolation

**Context.** PostgreSQL 16 was already running at `127.0.0.1:5432`. The API suite needed a disposable
database that could not damage development data.

**Prompt.**

> Add the database layer with Drizzle and PostgreSQL 16. Create `users`, `vehicles` and `purchases`
> with UUIDs, foreign keys, non-negative checks for price and quantity, and indexes for the filters.
> I need a separate `dealer_test` database: the tests should migrate it, truncate it before each test,
> and refuse to run if the database name doesn't end in `_test`.

**Implementation.**

- `users`: unique email, Argon2id hash, `role` (`customer` | `admin`), timestamps.
- `vehicles`: make, model, category, `price_cents`, `quantity`, year, description, `image_url`,
  timestamps.
- `purchases`: vehicle and user foreign keys, quantity, `unit_price_cents`, `total_cents`, timestamp.
- Vitest global setup runs migrations against `DATABASE_URL_TEST`; `setup-db.ts` truncates public
  tables and throws unless `NODE_ENV=test` and the database name ends in `_test`.
- API test files run serially (`fileParallelism: false`) because they share one test database.

**Verification.** `npm run db:migrate` applied the schema; the suite created and truncated only
`dealer_test`; a deliberately non-`_test` URL failed the guard.

### 03 · Authentication and role enforcement

**Prompt.**

> Add registration, login and a `/me` endpoint. Hash passwords with Argon2id, return a JWT, and use
> 409 for a duplicate email and 401 for bad credentials. Also add `requireAuth` and `requireAdmin`
> middleware so a customer gets 403 on admin routes. Validate the bodies with the shared Zod schemas.

**Implementation.**

- Argon2id hashing is isolated in `lib/passwords.ts`.
- The JWT carries `sub` (user id) and `role` and expires after 60 minutes.
- Registration checks for an existing email first, then catches PostgreSQL unique violations so a race
  still returns `409 EMAIL_TAKEN`.
- Login returns the same `401` for an unknown email and a wrong password.
- `requireAuth` attaches `{ id, role }` to the request; `requireAdmin` runs after it and is enforced
  server-side even when the UI hides the control.
- Validation failures return `400 VALIDATION_ERROR` with field details.

**Verification.** API tests covered registration, duplicate email, login, bad credentials, `/me`,
missing tokens and a customer calling an admin route; manual `curl` requests confirmed the same
behaviour against the running API.

### 04 · Vehicle catalogue and inventory rules

**Prompt.**

> Build the vehicle API: list with search, filter, sort and pagination, get one, create, partial update
> and delete. Prices are integer cents. Don't allow `quantity` through the normal update. Only admins
> can delete or restock. For purchase, decrement stock and write the receipt in one transaction so two
> people can't buy the last car; the loser gets 409.

**Implementation.**

- `vehicleListQuerySchema` defaults to `sort=newest`, `page=1`, `limit=12`; `minPrice` and `maxPrice`
  are whole dollars converted at the repository edge.
- `PUT /vehicles/:id` uses strict schemas, so `quantity` is rejected rather than silently ignored.
- `DELETE /vehicles/:id` and `POST /vehicles/:id/restock` require `admin`.
- Purchase runs
  `UPDATE vehicles SET quantity = quantity - 1 WHERE id = $1 AND quantity > 0 RETURNING *` inside
  `db.transaction`, then inserts the purchase row. Under `READ COMMITTED`, a concurrent transaction
  waits for the row lock and re-evaluates the predicate, so only one buyer can take the last unit.
- A malformed UUID is mapped to `404` before it reaches PostgreSQL's `22P02`.
- Purchase history is scoped to the caller.

**Verification.** API tests covered filters, sorting, pagination, validation, role rules, restock
quantity, purchase history and concurrent purchase. One request succeeded, the other returned `409`,
and stock stayed at zero.

### 05 · Local runtime verification

**Context.** The API passed tests but had not yet run as a real process against the native database.

**Prompt.**

> Run the app for real now, not just in tests. Start the API on 3000 and Vite on 5173 against local
> PostgreSQL, apply the migration, seed the two demo accounts and 24 cars, then check register, login
> and `/me` over HTTP.

**Implementation.**

- Root `.env` loading in the API config, with fail-fast validation of `DATABASE_URL` and a 32+
  character `JWT_SECRET`.
- `db:create`, `db:migrate` and `db:seed` scripts; the seed is idempotent and creates
  `demo@autoline.dev` and `admin@autoline.dev`.
- Vite proxies `/api` to `http://localhost:3000`.
- Separate `dev:api` and `dev:web` scripts so both processes run and restart independently.

**Verification.** The API was healthy on `3000`, Vite served on `5173`, register/login/me returned the
expected payloads, and the browser app loaded the seeded catalogue.

## 2026-10-24 — Storefront, admin and test evidence

### 06 · Storefront purchase flow

**Context.** The catalogue rendered, but vehicle detail, purchase and garage routes did not exist.

**Prompt.**

> Add the vehicle detail page, a confirmation dialog before buying, an optimistic stock update that
> rolls back if the request fails, the sold-out state, and a garage page. Make sure the vehicle links
> have proper accessible names and the tests don't break when a stock label appears twice.

**Implementation.**

- React Router routes: `/`, `/vehicles/:id`, `/garage`, `/admin`, `/login`, `/register`.
- `Protected`, `PublicOnly` and `AdminOnly` guards wrap the layout and routes.
- TanStack Query owns server state. The purchase mutation decrements the cached vehicle immediately,
  shows a toast, reconciles with the response, and rolls back plus refetches on `409`.
- The purchase button is disabled and labelled **Out of stock** at zero quantity.
- Garage reads `GET /api/purchases` and shows date, unit price and total.

**Verification.** Component tests covered purchase states and the vehicle card; a manual Chrome run
confirmed the flow; the later Playwright journey covered registration → search → purchase → garage.

### 07 · Admin console

**Prompt.**

> Build the admin inventory screen. Admins should be able to create, edit, restock and delete cars.
> Use the shared validation, keep quantity out of the edit form, and hide the admin controls from
> customers. The API still has to enforce the role, not just the UI.

**Implementation.**

- `VehicleFormDialog` handles create and edit; edit omits `quantity`.
- `RestockDialog` sends a positive integer to `/restock`.
- `DeleteDialog` confirms before `DELETE`.
- The admin page queries the catalogue and invalidates it after each mutation.
- The UI gates on `user.role`; the API still enforces `requireAdmin`.

**Verification.** Component tests covered the admin gate and form validation; the Playwright journey
covered admin create → restock → edit → delete.

### 08 · Local, model-accurate photography

**Prompt.**

> Replace the remote stock photos with local Wikimedia Commons images that actually match each make
> and model. Add an attribution file with the author, licence and source, so the demo doesn't depend
> on remote images.

**Implementation.** 24 local images under `apps/web/public/cars/`, plus `ATTRIBUTION.md`; seed rows
point at the local paths. The seed upgrades only rows that still reference the old Unsplash URLs, so
admin-added photos are left untouched.

**Verification.** The seeded catalogue rendered every image offline; screenshots were captured from
the running app.

### 09 · Test evidence and CI

**Prompt.**

> I need evidence I can rerun: HTML coverage for both workspaces, a test report, nine README
> screenshots with a script that regenerates them, and a GitHub Actions workflow that starts
> PostgreSQL 16 and runs typecheck, lint, coverage and build on every push.

**Implementation.**

- `npm run test:coverage` writes `apps/api/coverage` and `apps/web/coverage`; `scripts/screenshots.ts`
  captures the nine images.
- `docs/test-report.html` collects the counts and links.
- CI starts a `postgres:16-alpine` service, creates `dealer` and `dealer_test`, migrates, then runs
  typecheck, lint, coverage and build; coverage directories are uploaded as artifacts.

**Verification.** 68 API + 21 web tests and 3 Playwright journeys passed; CI was green; screenshots
were regenerated from the running app.

### 10 · AI-usage documentation

**Context.** The first drafts of the AI-usage section were narrative and focused on image prompting
rather than engineering decisions.

**Prompt.**

> Rewrite the AI usage section in the first person. Focus on the tool and the actual engineering work,
> not on images. Use short problem → instruction → fix → verification entries and link to the session
> log.

**Implementation.** The README section was shortened twice, then restructured around six concrete
problems: frontend/backend wiring, atomic purchase, local Windows run, URL-synced filters, split
deployment and documentation.

**Verification.** Re-read the section as a reviewer; every claim maps to a test, an HTTP check or a
running-app check.

## 2026-10-24 — Deployment readiness

### 11 · CORS and configurable API base

**Context.** A deployment audit found two blockers: the API had no CORS middleware, and the SPA
hardcoded `/api`, which would target Vercel in a split deployment.

**Prompt.**

> The deployment audit found two problems: the API has no CORS and the SPA hardcodes `/api`, so it
> would call Vercel instead of Render. Write failing tests first, then add a comma-separated
> `CORS_ORIGIN` allowlist and a `VITE_API_URL`-based `apiUrl()` helper, keeping `/api` as the local
> default.

**Implementation.**

- `cors({ origin: allowedOrigins })` with trimmed, non-empty entries.
- `apiUrl()` strips trailing slashes from `VITE_API_URL` and otherwise returns `/api`.
- The Vite proxy remains the local path; production sets `VITE_API_URL=https://<api>/api`.
- A global `401` event clears the stored token and session.

**Verification.** The red tests failed before the change and passed after it; `curl -X OPTIONS`
returned the expected `Access-Control-Allow-Origin`; a production build embedded the configured API
URL.

### 12 · Deployment manifests and operating docs

**Prompt.**

> Add the deployment files: a Render blueprint for PostgreSQL 16 and the API, a Vercel build for the
> SPA, the environment variable table, the deployment steps and an MIT licence. Call out the
> free-plan limits.

**Implementation.** `render.yaml` provisions the database and `autoline-api`; `vercel.json` builds
shared + web and rewrites client routes; the README documents `CORS_ORIGIN`, `VITE_API_URL`,
migrations and seeding.

**Verification.** The configuration was reviewed against both platforms; coverage was regenerated for
the new tests (68 API + 21 web); the deployment steps were followed end to end.

## 2026-10-24 — Live deployment

### 13 · Render + Vercel rollout

**Context.** The SPA and API run on different domains, and the Render free plan cannot run pre-deploy
commands or open a shell.

**Prompt.**

> Deploy it: API and PostgreSQL on Render, SPA on Vercel. Wire `CORS_ORIGIN` and `VITE_API_URL`, run
> migrations on API boot because the free plan has no pre-deploy command, seed the hosted database
> from my machine, and then smoke test the live app.

**Implementation.**

- Render: PostgreSQL 16 + `autoline-api`; `DATABASE_URL` uses the internal host with
  `sslmode=no-verify`; the start command is
  `npm run db:migrate --workspace @dealer/api && npm run start --workspace @dealer/api`.
- Vercel: root-directory build, `VITE_API_URL` set for Production and Preview, Vercel Authentication
  disabled for the public demo.
- The hosted seed ran against the external database URL after a temporary IP allow-list entry.
- `CORS_ORIGIN` was set to the Vercel domain.

**Verification.** `/api/health` returned `200`; a live Playwright smoke test signed in, exercised
URL-synced search, bought a car, opened the garage and confirmed the disabled sold-out button.

## 2026-10-25 — Documentation pass

### 14 · Technical log, Mermaid design and README readability

**Context.** `PROMPTS.md` read as a conversational transcript, and the README explained the
architecture with a static image but no renderable diagram. Several sections repeated context that a
first-time reader did not need.

**Prompt.**

> Rewrite `PROMPTS.md` as a technical engineering log instead of a chat transcript. Keep the context,
> prompt, implementation and verification for each entry. Then add an intermediate Mermaid system
> diagram and a purchase sequence to the README, and tighten the README so it's easier to scan without
> losing the setup, API, testing or deployment details.

**Implementation.**

- `PROMPTS.md` restated as 14 technical entries with plain-English prompts and concrete evidence.
- The README gains a layered Mermaid flowchart and a collapsible purchase sequence diagram.
- The README is reorganized into scannable sections: at-a-glance table, split customer/admin
  capabilities, system design, linear setup, troubleshooting, commands, API, testing, decisions and
  deployment.
- The AI-usage summary is compressed into a compact problem / prompt / fix / verification list.

**Verification.** Prettier check on both files, Markdown link check, Mermaid syntax review, and a
read-through against the source for endpoint, script and path accuracy.
