# Car Dealership Inventory System - Build Plan

Kata: TDD full-stack build. Backend REST API + SPA + tests + git narrative + transparent AI usage.

This plan is written to be executed top to bottom. Each phase ends with working code, green tests, and commits that show Red-Green-Refactor.

---

## 1. What is actually being graded

| Requirement | Where it is checked | Weight (estimate) |
| --- | --- | --- |
| REST API with the exact endpoints | Interview + repo | High |
| Postgres/Mongo/SQLite, not in-memory | Config + migrations | High |
| JWT auth, protected routes, admin-only routes | Code + tests | High |
| SPA in React + Tailwind + HTML5/CSS3 | UI screenshot | High |
| TDD with visible red-green-refactor commits | `git log` | High |
| README with setup, screenshots, "My AI Usage" | README.md | High |
| `PROMPTS.md` with raw AI logs | Root file | Medium |
| Covered test report | CI output or artifact | Medium |
| Design quality / UX | Live demo | Medium |
| Deployed live URL | Vercel/Netlify link | Bonus |
| No plagiarism, AI disclosed per commit | Commit trailers | Hard fail if missed |

Non-negotiables that people lose points on:

1. Every AI-assisted commit needs a co-author trailer, in the exact format.
2. `PROMPTS.md` must be raw logs, not a summary written by an AI.
3. Commit history must show the test failing before the implementation. Do not squash.
4. Purchase must decrease stock atomically and never go negative.

---

## 2. Stack decision

### Backend
- **Node 22 + TypeScript + Express 5** - smallest surface that still satisfies "RESTful, robust". NestJS costs a day in module boilerplate and makes Red-Green commits noisy. Next.js API routes do not read as a "backend API" to a reviewer.
- **PostgreSQL 16** in Docker Compose locally, Neon or Railway in prod. Matches the "real DB, not in-memory" requirement and gives clean row-level locking for purchases.
- **Drizzle ORM + drizzle-kit** for schema and migrations. SQL-first, typed, no client generation step in CI. Prisma is the fallback if you prefer it, but do not mix.
- **Zod** for request validation, and the same schemas feed the frontend through a shared package.
- **argon2id** (or bcrypt with cost 12) for passwords, **jsonwebtoken** for access tokens.
- **Vitest + Supertest** for API tests, one throwaway Postgres schema per test run.

### Frontend
- **React 19 + Vite + TypeScript**
- **Tailwind CSS v4**
- **TanStack Query** for server state (caching, optimistic updates after purchase)
- **react-router** for routes
- **react-hook-form + zod resolver** for auth and vehicle forms
- **shadcn/ui** as the base primitives (Table, Dialog, Toast, Select) - do not hand-roll accessible dialogs
- **Vitest + Testing Library** for component tests, **Playwright** for the purchase and admin e2e flows

### Repo shape
- Bun workspaces monorepo. One install, one CI run, shared types.

```
car-dealership/
  apps/
    api/        Express app, db, tests
    web/        React SPA, tests
  packages/
    shared/     zod schemas, DTO types, role enum, error codes
  docker-compose.yml
  .github/workflows/ci.yml
  PROMPTS.md
  README.md
  PLAN.md
```

Why a monorepo: the API contract is the single source of truth, and the frontend cannot silently drift from it. If you want to keep it simpler, two folders (`api/`, `web/`) also pass - just keep the schema copy honest.

---

## 3. Architecture

```
React SPA ──HTTPS──> Express API ──SQL──> Postgres
   │                    │
   │                    ├─ auth middleware (JWT -> req.user)
   │                    ├─ requireAdmin middleware
   │                    ├─ zod validate middleware
   │                    └─ routes -> controllers -> services -> repository
   └─ TanStack Query cache, token in memory
```

Layering, kept thin:

- **routes**: path + middleware wiring only
- **controllers**: parse request, call service, map to HTTP response. No business rules.
- **services**: all rules (stock checks, ownership, admin checks, price math). Pure-ish, easy to unit test.
- **repository**: Drizzle queries. The only place `db` is imported.

This matters for TDD: service tests are fast and cover the logic; route tests cover status codes and auth.

---

## 4. Data model

```sql
users
  id            uuid pk
  email         citext unique not null
  password_hash text not null
  name          text not null
  role          text not null default 'customer'   -- 'customer' | 'admin'
  created_at    timestamptz not null default now()

vehicles
  id            uuid pk
  make          text not null
  model         text not null
  category      text not null          -- sedan | suv | truck | coupe | ev | hatchback
  price_cents   integer not null check (price_cents >= 0)
  quantity      integer not null check (quantity >= 0)
  year          smallint
  description   text
  image_url     text
  created_at    timestamptz not null default now()
  updated_at    timestamptz not null default now()

purchases                          -- required by /purchase semantics, also powers the dashboard
  id            uuid pk
  vehicle_id    uuid references vehicles(id)
  user_id       uuid references users(id)
  quantity      integer not null check (quantity > 0)
  unit_price_cents integer not null
  total_cents   integer not null
  created_at    timestamptz not null default now()

indexes
  vehicles (make, model), (category), (price_cents), (quantity)
  purchases (user_id), (vehicle_id)
```

Decisions:
- **Money as integer cents.** No floats anywhere. Format at the edge only.
- **UUID primary keys** so IDs are not guessable and the API reads as production-grade.
- **`purchases` table** is not in the brief, but a purchase that leaves no record is indefensible in an interview and gives you the "my purchases" screen for free. Cost: one table, one insert inside the same transaction.
- **Categories as text + check constraint**, not a Postgres enum, so adding one does not need a migration dance.

Migration strategy: `drizzle-kit generate` produces versioned SQL in `apps/api/drizzle/`. Committed. `db:migrate` runs on boot in prod, on test setup in CI.

---

## 5. API contract

Base path `/api`. All responses JSON. All errors use one envelope.

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "price must be a positive number", "details": [...] } }
```

### Endpoints

| Method | Path | Auth | Success | Notes |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/register` | public | 201 `{ user, token }` | 409 on duplicate email |
| POST | `/api/auth/login` | public | 200 `{ user, token }` | 401 invalid credentials, same message for unknown email |
| GET | `/api/auth/me` | user | 200 `{ user }` | SPA bootstrap |
| POST | `/api/auth/refresh` | cookie | 200 `{ token }` | optional, phase 9 |
| GET | `/api/vehicles` | user | 200 `{ data, meta }` | pagination + filters |
| GET | `/api/vehicles/search` | user | 200 `{ data, meta }` | same handler as list |
| GET | `/api/vehicles/:id` | user | 200 `{ vehicle }` | 404 |
| POST | `/api/vehicles` | user | 201 `{ vehicle }` | brief says protected; keep it user-level |
| PUT | `/api/vehicles/:id` | user | 200 `{ vehicle }` | 404 / 403 if ownership policy enforced |
| DELETE | `/api/vehicles/:id` | **admin** | 204 | 403 for customer |
| POST | `/api/vehicles/:id/purchase` | user | 200 `{ vehicle, purchase }` | 409 when quantity is 0 |
| POST | `/api/vehicles/:id/restock` | **admin** | 200 `{ vehicle }` | body `{ quantity }` > 0 |
| GET | `/api/purchases` | user | 200 `{ data }` | own history; SPA "My Garage" |
| GET | `/api/health` | public | 200 | for deploy checks |

`GET /api/vehicles` query params, all optional:

- `make`, `model` - case-insensitive partial match
- `category` - exact
- `minPrice`, `maxPrice` - in major units, converted to cents server-side
- `q` - free text across make + model
- `sort` - `price_asc | price_desc | newest`
- `page` (default 1), `limit` (default 12, max 100)

`GET /api/vehicles/search` calls the identical code path. Keeping a separate path only serves the brief; do not duplicate logic.

### Status codes you must get right

- 400 malformed body, 401 missing/expired token, 403 wrong role, 404 unknown id, 409 business conflict (duplicate email, out of stock), 422 optional for semantic validation.
- 401 responses carry `WWW-Authenticate` and the SPA triggers a logout.

### Auth model

- JWT `HS256`, payload `{ sub, role, iat, exp }`, TTL 60 min, secret from `JWT_SECRET` (fail fast at boot if missing).
- Role is read from the token but **re-fetched from DB on privileged routes** is optional; for this scope trust the token, note the tradeoff in code.
- Password rules: 8+ chars, one letter one digit. Validated by the same zod schema on both sides.
- Rate limit `/api/auth/*` to 10 req/min/IP (`express-rate-limit`).
- Token storage in the SPA: memory + `localStorage` fallback is acceptable; the stronger pattern is httpOnly refresh cookie + in-memory access token, which is phase 9.

### Purchase concurrency - the detail that separates this from a toy

A naive `read quantity, if > 0 then quantity - 1` oversells under load. Use one conditional update inside a transaction:

```ts
// services/inventory.ts
return db.transaction(async (tx) => {
  const [vehicle] = await tx.execute(sql`
    update vehicles
       set quantity = quantity - 1, updated_at = now()
     where id = ${id} and quantity > 0
    returning *
  `);
  if (!vehicle) throw new ConflictError("VEHICLE_OUT_OF_STOCK");
  await tx.insert(purchases).values({...});
  return vehicle;
});
```

Test it: two concurrent purchases on a vehicle with quantity 1 → one 200, one 409, final quantity 0. That test is worth more than fifty happy-path tests in the interview.

---

## 6. Frontend design

### Routes
| Path | Access | Purpose |
| --- | --- | --- |
| `/login`, `/register` | public | split-screen form, brand panel on the left |
| `/` | user | dashboard: filter bar + vehicle grid |
| `/vehicles/:id` | user | detail, specs, purchase panel |
| `/garage` | user | purchase history |
| `/admin` | admin | inventory table, create/edit dialogs, restock |
| `*` | - | 404 |

`/` redirects to `/login` when unauthenticated. Route guards: `<Protected>` and `<AdminOnly>`.

### Component tree
```
App
├─ AuthProvider (token, user, login/logout, 401 interceptor)
├─ QueryClientProvider
├─ Layout (topbar, user menu, theme toggle)
└─ pages
   ├─ Dashboard
   │   ├─ FilterBar (search input, make/model/category selects, price range, sort)
   │   ├─ VehicleGrid -> VehicleCard (image, specs, price, quantity badge, Purchase)
   │   └─ Pagination
   ├─ VehicleDetail -> PurchasePanel
   ├─ Garage -> PurchaseList
   └─ AdminInventory -> VehicleTable, VehicleFormDialog, DeleteConfirm, RestockDialog
```

### Behaviour rules that reviewers check
- Purchase button **disabled when `quantity === 0`** and labelled "Out of stock" (explicit requirement).
- Purchase shows a confirm dialog, then optimistic decrement, then a toast, then reconcile from the response. On 409, roll back and refresh.
- Skeleton loaders, empty states ("No vehicles match these filters" + clear-filters button), and error states with retry.
- Forms show field-level errors from the zod schema, not a generic alert.
- Admin controls are hidden for customers, and the API still enforces 403. UI hiding is not security.
- Debounce the search input (300 ms), and mirror filters in the URL so the view is shareable and the back button works.
- Responsive: 1 column under 640 px, 2 at 768, 3 at 1024, 4 at 1280. Cards, not a data table, on mobile.
- Accessibility: labelled inputs, `aria-live` for toasts, focus trap in dialogs (comes with shadcn), visible focus rings, contrast checked.

### Visual direction
Pick one and hold it. Suggestion: near-black canvas, one accent (electric lime or amber), large card imagery, tight typographic scale with a display face for headings, subtle grid texture. Avoid the generic indigo-on-white Tailwind look; design is an explicit scoring criterion.

Seed data: 24 vehicles with real makes/models, categories spread, 2 prices in each range bucket, 3 with quantity 0 to demo the disabled state. Seed script `bun run db:seed`, idempotent.

---

## 7. Test strategy

### Layers

| Layer | Tool | What it proves | Target |
| --- | --- | --- | --- |
| Unit | Vitest | pricing, filters, stock rules, validation | 90%+ on `services/` and `lib/` |
| Integration | Vitest + Supertest + real Postgres | status codes, auth, RBAC, purchase atomicity | every endpoint, happy + 401/403/404/409 |
| Component | Vitest + Testing Library | disabled purchase at 0 stock, form errors, admin gating | key components |
| E2E | Playwright | register → login → filter → purchase → see garage; admin CRUD | 2-3 flows |
| Type/quality | `tsc --noEmit`, eslint | no `any` leaks, no unused | clean |

Test DB: `DATABASE_URL_TEST` pointing at a `dealer_test` database. `beforeEach` truncates tables. Migrations run once in `globalSetup`. Never mock the DB; atomicity bugs only appear against real Postgres.

### Test matrix per endpoint (write these before the code)
- register: 201 happy, 400 weak password, 400 bad email, 409 duplicate, hash is argon2 and not the plaintext
- login: 200 happy, 401 wrong password, 401 unknown email, token verifies with secret and carries role
- list: 401 without token, 200 paginated shape, each filter individually, combined filters, price boundaries inclusive, sort orders, invalid `limit` falls back or 400
- create: 201, 401, 400 missing fields, 400 negative price, quantity defaults to 0, 201 with explicit quantity
- update: 200, 404, 400 invalid body, does not clobber untouched fields
- delete: 204 admin, 403 customer, 404 admin on missing
- purchase: 200 decrements by 1, 409 at zero (and quantity stays 0), 404 bad id, concurrent test, 401
- restock: 200 increases by n, 400 n <= 0, 403 customer, 404
- search: same as list plus free-text `q`

Each test name is a sentence: `"returns 409 and leaves quantity at 0 when purchasing an out-of-stock vehicle"`.

---

## 8. TDD workflow per feature

Loop, one small step at a time:

```
1. Write one failing test (red)         -> commit: "test(vehicle): expect 409 when purchasing out-of-stock vehicle"
2. Minimal code to pass (green)         -> commit: "feat(vehicle): reject purchase when stock is zero"
3. Clean up, no behaviour change (refactor) -> commit: "refactor(vehicle): extract stock guard into inventory service"
```

Rules that make the history read as genuine TDD:
- The red commit and the green commit are **separate commits**, and the red commit's test file really does fail. You can prove it later by running it at that SHA.
- Never amend or squash. No force-push after the review link exists.
- Commit bodies explain *why*, one or two lines. Not "what".
- Conventional prefixes: `feat`, `fix`, `test`, `refactor`, `chore`, `docs`, `ci`.

### AI co-author trailer - required on every AI-assisted commit

Exactly two blank lines, then the trailer:

```
feat(vehicle): reject purchase when stock is zero

Stock must never reach zero; a conditional update keeps concurrent
purchases from overselling.

Co-authored-by: Claude <noreply@anthropic.com>
```

Pattern to use: a `commit-msg` hook or `git commit -t` template so it is never forgotten. Also note: the exact co-author identity must match the tool you actually used. If more than one tool was involved, list each on its own trailer line.

---

## 9. Execution phases

Time estimates assume one focused person. Naive estimates on this kata are 2-3x too low; these already include test-writing.

### Phase 0 - Setup (1 to 2 h)
1. `git init`, `.gitignore`, `README.md` stub, `PLAN.md` (this file), `PROMPTS.md` with session 1.
2. Bun workspaces, `tsconfig` base, eslint + prettier.
3. `docker-compose.yml` with Postgres 16, port 5432.
4. Express skeleton, `/api/health`, vitest + supertest wired, one passing smoke test.
5. `commit-msg` hook that rejects a commit without a co-author trailer.
   Commits: `chore: scaffold monorepo`, `test(api): health endpoint responds 200`.

### Phase 1 - Auth (4 to 6 h)
1. Migrations for `users`.
2. Red: register test → green: route + service + hash.
3. Red: duplicate email → green.
4. Red: login success and two failure cases → green.
5. Red: `GET /me` with and without token → green. Auth middleware.
6. Role guard middleware, tested with a customer token against a probe admin route.
   Commits: one pair per bullet, roughly 12 commits.

### Phase 2 - Vehicles CRUD (5 to 7 h)
1. Migrations + seed for `vehicles`.
2. List with pagination (red/green), then one filter per pair.
3. Create (validation cases first).
4. Get by id, update, delete with role check.
5. Search endpoint delegating to the list handler, one test proving the delegate.

### Phase 3 - Inventory (3 to 4 h)
1. Purchase happy path, then out-of-stock 409, then the concurrency test (this one may take 45 min alone; it is worth it).
2. Restock with negative/zero guard and admin guard.
3. `purchases` table and `GET /api/purchases`.

### Phase 4 - Frontend foundation (4 to 6 h)
1. Vite + Tailwind + shadcn init, design tokens (colors, radius, type scale) in `index.css`.
2. API client (typed fetch wrapper reading the error envelope), auth context, 401 interceptor.
3. Login + register pages with shared zod schema, component tests for field errors.
4. Protected and admin route guards with tests.

### Phase 5 - Dashboard and purchase (6 to 8 h)
1. Vehicle card and grid against MSW or a live seed DB.
2. Filter bar with URL-synced state and debounce.
3. Detail page.
4. Purchase flow: dialog → optimistic update → toast → 409 handling.
5. Garage page.
6. Playwright flow: register → filter → purchase → garage. One scripted run, screenshots captured from it.

### Phase 6 - Admin UI (4 to 6 h)
1. Inventory table with quantity badges and sorting.
2. Create/edit dialog reused for both, zod resolver.
3. Delete confirm, restock dialog.
4. Playwright admin flow: create → restock → delete.
5. Verify customer cannot see or reach admin routes (manual test with a customer token in localStorage).

### Phase 7 - Polish and evidence (3 to 5 h)
1. Empty, loading, error states everywhere.
2. Responsive pass at 375, 768, 1440. Check the disabled purchase button at 0 stock.
3. a11y pass: keyboard-only run, contrast, labels.
4. Screenshots: login, dashboard with filters, detail, out-of-stock card, purchase toast, garage, admin table, admin edit dialog, mobile view.
5. `bun run test -- --coverage` → save `docs/test-report.html` and paste the summary table into README.
6. Screenshot regeneration script `scripts/screenshots.ts` (Playwright) so the images are reproducible.

### Phase 8 - Docs, CI, deploy (4 to 6 h)
1. README: see section 10.
2. `.github/workflows/ci.yml`: Postgres service, migrate, typecheck, lint, unit + integration tests, coverage upload. Green badge in README.
3. Deploy API to Railway/Render + Neon Postgres; SPA to Vercel with `VITE_API_URL`. CORS allowlist the Vercel domain. Set `JWT_SECRET`.
4. Seed prod with a demo admin (`admin@example.com` / documented password) and a note that it is a demo.
5. Smoke test the live URL: register, login, purchase.

### Phase 9 - Optional upgrades (only if time is left)
- Refresh token rotation with httpOnly cookie.
- Purchase quantity > 1 with a stepper.
- Vehicle images upload to storage; otherwise use curated URLs.
- Sales analytics for admin (revenue, units sold, low-stock alert).

Total: roughly 34 to 50 focused hours. A working, fully compliant submission is realistic at the low end if phases 0 to 3 are not gold-plated.

---

## 10. README structure

```markdown
# Car Dealership Inventory System

One-paragraph pitch. Badges: CI, coverage, license. Live demo link. Screenshot.

## Features
## Tech stack
## Architecture          (diagram + short layering note)
## Getting started
  ### Prerequisites     (Node 22, Bun, Docker)
  ### Backend            env vars table, migrate, seed, dev
  ### Frontend           env vars, dev, build
  ### Running both       one command
  ### Tests              unit, integration, e2e, coverage
## API reference         table + one curl example per auth/vehicle/inventory group
## Demo credentials      admin and customer
## Screenshots
## Design decisions      money in cents, atomic purchase, roles, why Express
## My AI Usage           REQUIRED section, see below
## Test report           summary table + link to docs/test-report.html
## Project structure
## License
```

### "My AI Usage" section - required content

Write it yourself, in your own voice. Three parts:

1. **Tools used**: name each one exactly (e.g., Claude Code with Opus/Sonnet, ChatGPT, Copilot).
2. **How each was used**: concrete, per area. "Used Claude to draft the Drizzle schema from my data model, then corrected the index choices." "Asked it to generate the concurrent-purchase test; I rewrote the assertion after it initially tested sequential calls." "Used it to explain why a conditional UPDATE beats a read-then-write."
3. **Reflection**: what it sped up (boilerplate, test scaffolding, CSS iteration), where it was wrong or shallow (it missed the overselling race, it invented a status code, it produced tests that asserted implementation rather than behaviour), and what that changed about how you work (tests first so the AI has something to satisfy; read every diff; keep the domain decisions human).

Honesty scores points here. "It wrote everything and I reviewed it" is a weak answer; "it wrote the boilerplate, I caught three of its mistakes, here they are" is a strong one.

### PROMPTS.md - required content

- Raw, unedited transcript text or public share links (ChatGPT/Claude share URLs).
- Group by session with a date heading and the tool name.
- No summaries, no cleaned-up rewrites, no AI-generated preamble. Append as you go, not at the end from memory.
- Start it in phase 0, because you cannot reconstruct raw logs later.

---

## 11. Commit narrative (target shape)

```
chore: scaffold monorepo with api, web and shared packages
test(api): health endpoint responds 200
feat(api): add health endpoint
test(auth): reject registration with weak password
test(auth): hash passphrase with argon2 on registration
feat(auth): implement registration with argon2 hashing
refactor(auth): extract user repository from controller
test(auth): return 409 for duplicate email
feat(auth): enforce unique email at the service layer
...
test(inventory): allow exactly one of two concurrent purchases
feat(inventory): use conditional update to prevent overselling
...
test(web): disable purchase button for zero-stock vehicle
feat(web): render out-of-stock state on vehicle card
docs: add README with setup, screenshots and AI usage
ci: run tests against postgres service container
```

~55 to 75 commits total. If you have fewer than 40, the history will look generated in one sitting.

---

## 12. Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Missing co-author trailer on some commits | Requirement violation, visible in `git log` | `commit-msg` hook; audit with `git log --format='%h %(trailers:key=Co-authored-by)'` before submitting |
| `PROMPTS.md` written from memory at the end | Reads as fabricated, which is worse than short | Append raw text after every session |
| Overselling under concurrency | Interview question you cannot answer | Conditional UPDATE + concurrent test in phase 3 |
| Test DB sharing prod DB by accident | Data loss | Separate `dealer_test` DB, guard that refuses to truncate when `NODE_ENV=production` |
| Secrets committed | Repo is public | `.env` in `.gitignore`, `.env.example` committed, redeploy on any leak |
| JWT secret default in code | Trivial forgery | Boot fails when `JWT_SECRET` is unset |
| Frontend/API type drift | Runtime breakage near the demo | Shared zod package, one API client, CI typecheck |
| Scope creep (images, refresh tokens, analytics) | Nothing finished | Phase 9 only after phase 8 is green |
| Deploy CORS misconfig | Blank live page | Explicit origins list, and test the live URL from a logged-out browser |

---

## 13. Definition of done

- [ ] All 11 required endpoints exist with correct auth and status codes
- [ ] Postgres with committed migrations; seed script reproduces the demo dataset
- [ ] Purchase is atomic, never oversells, covered by a concurrency test
- [ ] Every service and route has tests; `bun run test` green from a clean clone
- [ ] CI green on `main`
- [ ] SPA: register, login, list, filter, search, purchase (disabled at 0), admin CRUD
- [ ] Responsive at 375/768/1440, keyboard navigable, no console errors
- [ ] README complete with setup, API reference, screenshots, "My AI Usage", test report
- [ ] `PROMPTS.md` present and raw
- [ ] Every AI-assisted commit carries the co-author trailer
- [ ] Live URL works, seeded with a documented demo admin
- [ ] Repo public

---

## 14. Open decisions to lock before phase 1

1. **Express vs NestJS** - plan assumes Express. Pick one now; switching mid-build costs a day.
2. **Drizzle vs Prisma** - plan assumes Drizzle.
3. **Update/delete policy** - does a customer see only their own vehicles, or one shared inventory? Brief implies a shared inventory, with delete admin-only. Update left user-level. Simplest defensible choice: shared inventory, any authenticated user may add and edit, only admins delete and restock. State this in the README.
4. **Co-author identity** - use the tool you actually use, e.g. `Claude <noreply@anthropic.com>`. Local policy forbids an agent adding this trailer on your behalf, so either add it yourself at commit time or explicitly instruct the agent per commit. Never fake a tool you did not use.
5. **Deploy target** - Railway + Vercel is the lowest-friction pair that keeps this inside a free tier.
