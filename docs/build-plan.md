# PartyPlay — Build Plan

**Version:** 1.0
**Date:** 13 November 2026
**Status:** Phase 2 complete for the database; this plan covers Phase 3 (backend) and Phase 4 (client)
**Source of requirements:** `PARTYPLAY — Requirements and MVP Scope v1.2`
**Companion docs:** `docs/database-spec.md` (schema, ERD, constraints)

---

## 1. How we work

This is the execution document. Every feature below is built and finished on its own
before the next one starts.

**Rules of engagement**

1. **Backend first.** No client code is written until the endpoint it consumes exists,
   returns real data, and has been exercised with curl. The client is Milestone C.
2. **One feature, one branch, one migration at most.** Branch name
   `feat/f<number>-<slug>`, e.g. `feat/f6b-booking-creation`.
3. **Features are sized to one sitting.** If a feature grows, split it and add the split
   to §8 — do not build half of two features.
4. **No speculative work.** Nothing from §11 (deferred) gets built because it is
   convenient while we are "already in the file".
5. **Schema changes only when a feature needs them**, via `prisma migrate dev` with a
   descriptive name. CHECK constraints (see `database-spec.md` §4) go in the migration
   file by hand.

**Definition of done — a feature is done when all of these hold**

| # | Check |
|---|---|
| 1 | Route, zod schema, service and any migration are committed on the feature branch |
| 2 | The route -> middleware -> controller -> service -> db flow is intact; no controller imports `db` |
| 3 | Every error path returns the standard envelope (§4.2) with the right status code |
| 4 | `npm run typecheck --workspace server` exits 0 |
| 5 | The feature's verification recipe (§10) has been run against the local database and passed |
| 6 | Any new env var is in `server/.env.example` |
| 7 | `docs/database-spec.md` updated if the schema changed |
| 8 | Progress ledger row in §12 ticked |

Manual verification is the baseline. Automated tests are added where the logic is
arithmetic or stateful and a hand-check cannot prove it: the pricing module (F6a),
availability (already built), and the status-transition guard (F8). Those three get a
small `vitest` suite; nothing else does by default.

---

## 2. Current state — what exists today (verified)

| Area | State |
|---|---|
| Workspaces | `client/` (React 19 + Vite + TS + Tailwind 4) and `server/` (Express 5 + TS) |
| Server entry | `server/src/index.ts` — cors, json, `/api/health`, `/api/hello`, mounts `/api/categories`, calls `ensureClient()` before listen |
| Database | PostgreSQL 17 in docker, `docker-compose.yml`, host port 5433 |
| Prisma schema | 17 models, all required entities present (`database-spec.md` §3) |
| Migrations | 4 applied; `prisma migrate status` reports up to date |
| DB hardening | 12 CHECK constraints + `Booking(status, startDate, endDate)` index |
| Inventory service | `server/src/services/availability.ts` — `getAvailability`, `getReservedQuantities`, `findShortages`, `toDateOnly`, `isValidRange` |
| Routes | `/api/categories` (list, get, create, patch, delete — admin guarded by a stub) |
| Auth | `requireAdmin` is a **501 stub** — no login exists |
| Seed | `server/src/seed.ts` — 1 package, 4 package items, 5 equipment, 5 inventory rows |
| Client | Layouts and empty pages (home, equipment, packages, offers, contact, booking, admin) |

**Not built yet:** error middleware, auth, catalogue read/write APIs beyond categories,
availability API, pricing, booking creation, booking lifecycle, holds sweeper, payments,
dashboard, and the entire client UI.

---

## 3. Architecture and layers

Every request follows the same five stages. Nothing skips a stage, and each stage has one
job.

```
request
  └─ routes         match method + URL, attach the middleware chain
       └─ middleware    authentication, permissions, request context
            └─ controllers   HTTP in and out: parse input, call service, send envelope
                 └─ services      business rules, transactions, snapshots
                      └─ config/db     PrismaClient reads and writes records
```

**Layer contract**

1. **Route** — `src/routes/<resource>.ts`. Matches the HTTP method and URL, attaches the
   middleware chain, and does nothing else. No `db` import, no validation logic, no rules.
2. **Middleware** — `src/middleware/*.ts`. Authentication (`requireAdmin`), permissions,
   request context (request id, body limits). It may end a request (401/403) but holds no
   domain rules.
3. **Controller** — `src/controllers/<resource>.ts`. Handles HTTP input and output: parses
   `params`/`query`/`body` with the zod schema, calls the service, picks the status code
   and writes the envelope. Knows HTTP, not rules. **Never imports `db`.**
4. **Service** — `src/services/<resource>.ts`. Applies business rules, coordinates
   transactions and snapshots. The only layer that opens a transaction or writes more than
   one table. Takes plain objects, returns plain objects, throws `ApiError` — **never
   touches `req` or `res`.**
5. **Prisma / database** — `src/config/db.ts`. Reads and changes persistent records. No
   rules live here; DB constraints are the backstop, not the primary check.

**Schemas** live in `src/schemas/<x>.ts` and are imported by controllers only; nothing else
parses requests. **Zod is the input boundary** — anything the database must never see as
invalid is rejected at the controller before the service runs.

**Why the split is worth the extra file:** rules tested without HTTP, controllers that stay
one screen long, and a route file that is a table of contents. Tests (F6a onward) target
services and need no supertest.

**Existing exception:** `routes/categories.ts` predates this split and does validation,
rules and `db` access in the handler. F1 moves it to `controllers/categories.ts` +
`services/categories.ts`, so the codebase has exactly one shape from F1 onward.

**Planned server layout**

```
server/src/
  config/db.ts            existing
  lib/api-error.ts        ApiError + factories (F1)
  lib/async.ts            asyncHandler wrapper (F1)
  lib/dates.ts            Nairobi <-> UTC calendar-date helpers (F1)
  lib/booking-code.ts     PP-XXXXXX generation (F6b)
  middleware/auth.ts      existing stub -> real (F2)
  middleware/error.ts     central error handler (F1)
  middleware/validate.ts  optional shared zod runner (F1)
  schemas/*.ts            one file per resource
  controllers/*.ts        HTTP in and out per resource; no db access
  services/availability.ts  existing
  services/pricing.ts     pure pricing math (F6a)
  services/bookings.ts    create/transition/reads (F6, F8)
  services/payments.ts    payment records + totals (F9)
  routes/*.ts             method + URL -> middleware -> controller, nothing else
  jobs/expire-holds.ts    sweeper (F7)
```

---

## 4. Cross-cutting conventions (built in F1, used by everything after)

### 4.1 Response envelope

```jsonc
// success
{ "data": { ... } }                       // object
{ "data": [ ... ], "meta": { "total": 42, "page": 1, "pageSize": 20 } }
// failure
{ "error": "Human-readable message", "code": "BOOKING_DATE_CONFLICT", "details": { } }
```

`details` carries zod `flatten()` output on validation failures. `code` is a stable
machine string for the client and for logs; `error` may change wording.

### 4.2 Status codes

| Situation | Code |
|---|---|
| Validation failure (zod) | 400 |
| Not authenticated | 401 |
| Authenticated but not allowed | 403 |
| Resource missing | 404 |
| State conflict (hold expired, transition not allowed, insufficient stock) | 409 |
| Duplicate unique value (`P2002`) | 409 |
| Bad request shape Prisma cannot express | 422 |
| Unexpected | 500 — logged with a request id, message never leaked |

Prisma error mapping lives in `middleware/error.ts`: `P2002` → 409, `P2025` → 404,
`P2003` → 409 ("record is still referenced").

### 4.3 Dates and time

- **API contract uses calendar dates** as `YYYY-MM-DD` strings for `startDate`/`endDate`.
  No time component is ever accepted for rental dates.
- Internally converted with `toDateOnly()` and stored in `@db.Date` columns (UTC midnight).
- Rental days are **inclusive**: `days = (endDate - startDate) / 86400000 + 1`. 20–22 Oct
  is 3 days.
- Timestamps (`createdAt`, `holdExpiresAt`, `approvedAt`) are ISO-8601 UTC in responses.
- Africa/Nairobi is UTC+3 with no DST, so "today in Nairobi" = UTC date after adding
  nothing but using `Africa/Nairobi` for *display*. The server never does local-time math.
- The public booking form must reject dates before today in Nairobi.

### 4.4 Env and config

All env reads go through `process.env` in one place per concern; new keys are added to
`server/.env.example` with a comment. Current keys: `DATABASE_URL`, `PORT`, `CLIENT_URL`,
`NODE_ENV`. Added by these features: `JWT_SECRET`, `ADMIN_SESSION_HOURS` (F2),
`HOLD_SWEEP_INTERVAL_MINUTES` (F7).

---

## 5. Decisions to lock before coding

These are open questions where the schema and the requirements document disagree. Each
has a **recommended default**; building starts with the default unless the owner says
otherwise. D1–D3 change the schema and must be settled before F6.

| # | Question | Recommended default | Cost if deferred |
|---|---|---|---|
| **D1** | Requirements list statuses *Pending, Confirmed, Rejected, Expired, Cancelled, Completed*. The schema has `APPROVED` (not `CONFIRMED`), no `EXPIRED`, and an unused `NO_SHOW`. | Rename `APPROVED` → `CONFIRMED`, add `EXPIRED`, drop `NO_SHOW`. Migration 5. Update `CONFIRMED_BOOKING_STATUSES`. Zero rows in `Booking`, so the rename is free now and painful later. | Every feature after F6 encodes the wrong status names |
| **D2** | Requirements want a *payment status* on the booking (Unpaid / Partially Paid / Paid); the schema has per-payment `Payment.status` and a `Booking.paidAmount`, but no booking-level payment status. | **Derive it**: `paidAmount == 0` → `UNPAID`; `0 < paidAmount < totalAmount` → `PARTIALLY_PAID`; `paidAmount >= totalAmount` → `PAID`. Computed in `services/payments.ts`, never stored, no drift possible. | A stored column needs manual sync on every payment and refund |
| **D3** | `Equipment` has `pricePerDay`, `pricePerWeek` and `flatPrice` with no rule for which applies. | Add `pricingMode` enum `PER_DAY \| FLAT` in migration 5; `PER_DAY` uses `pricePerDay × days × qty`, `FLAT` uses `flatPrice × qty` once. `pricePerWeek` stays unused in the MVP. | Ambiguous totals in the first booking we create |
| **D4** | Requirements require a *delivery or collection* choice per booking; the schema only has address fields. | Add `FulfilmentMethod` enum `DELIVERY \| COLLECTION` + `fulfilmentMethod` on `Booking` (migration 5, default `COLLECTION`). `DELIVERY` requires `dropoffAddress`; `COLLECTION` requires `pickupAddress` (app-enforced, zod conditional). | Booking form has nowhere to store the choice |
| **D5** | Package `minQuantity`/`maxQuantity` are guest counts, but `Booking` has no guest count. | Leave the columns informational in the MVP; do not validate them. Add `guestCount Int?` when the owner asks for a real guest limit. | None — no wrong behaviour, just unenforced metadata |
| **D6** | `Offer` has no FK on `appliesToId` and no discount engine. | Offers are **display-only** in the MVP. `discountAmount` is entered by the owner when confirming, and is an explicit recorded adjustment (requirement §7). No automatic discount logic until after launch. | A discount engine is a feature of its own; skipping it keeps pricing honest |
| **D7** | Requirements make customer phone mandatory; `Customer.phone` is nullable. | Enforce in zod (`phone` required, 7–20 chars, digits/+/-/space). Leave the column nullable so admin-created walk-in customers are still possible. | Weak |

**Shipping alongside D1/D3/D4 as migration 5 (`booking_domain_fixes`)**: status enum
rename, `pricingMode`, `fulfilmentMethod`, `Booking.guestCount` omitted per D5.

---

## 6. Backend feature sequence

Milestone **B1 — Platform**, **B2 — Catalogue**, **B3 — Booking core**,
**B4 — Operations**. Client is **Milestone C** (§7). No feature may start before its
dependencies in the list are done.

### F1 — Platform foundation

**Goal:** every later feature inherits error handling, validation, and date helpers.

- `ApiError` with `status`, `code`, `details`; factories `badRequest`, `notFound`,
  `conflict`, `forbidden`, `unauthorized`.
- `asyncHandler` so async route throws reach Express 5's error path.
- `middleware/error.ts`: maps `ApiError`, `ZodError`, Prisma known errors; logs 500s with
  a generated request id (`req.id`).
- `middleware/error.ts` also handles 404 for unknown `/api/*` paths.
- `lib/dates.ts`: `parseCalendarDate`, `formatCalendarDate`, `rentalDays`,
  `todayInNairobi`, `isPastDate`.
- `GET /api/health` keeps its current contract (it is used by the compose check).
- Refactor `/api/hello` to the envelope, or delete it — it is scaffolding.
- Move `routes/categories.ts` into `controllers/categories.ts` +
  `services/categories.ts` and put it on the envelope — the one existing exception to §3.

**Verify:** `curl /api/nope` → 404 envelope; malformed JSON body → 400 envelope;
`SELECT 1` failure path still returns 503; typecheck clean.

**Depends on:** nothing.

---

### F2 — Admin authentication

**Goal:** one owner account can log in, everything admin-only is genuinely protected.

**Schema:** none. `Admin` already has `email`, `password`, `role`; `UserSession` was
dropped in migration 2, so this is stateless.

**New dependencies:** `cookie-parser` and `jsonwebtoken` (+ `@types/cookie-parser`,
`@types/jsonwebtoken`). Neither is installed today — add them in this feature and
nothing earlier.

**Endpoints**

| Method | Path | Auth | Body / notes |
|---|---|---|---|
| POST | `/api/auth/login` | public | `{ email, password }` → sets `pp_session` httpOnly, `sameSite=lax`, `secure` in prod, `maxAge` from `ADMIN_SESSION_HOURS` (default 12) |
| POST | `/api/auth/logout` | admin | clears cookie |
| GET | `/api/auth/me` | admin | `{ id, email, name, role }` |
| POST | `/api/auth/password` | admin | `{ currentPassword, newPassword }`, min 10 chars, bcrypt cost 12 |

**Rules**

- Login failure is always `401 { error: "Invalid email or password" }` — same message for
  unknown email and wrong password, and the bcrypt compare runs even for unknown emails
  (constant-time, no user enumeration).
- Simple in-memory rate limit: 10 attempts per IP per 15 minutes → `429`. In-memory is
  acceptable for a single-instance MVP; note it in code.
- `requireAdmin` verifies the JWT, loads the `Admin` row, attaches `req.admin`, and
  returns `401` (not `501`, not `403`) when absent. JWT payload holds only `sub`.
- `scripts/create-admin.ts` (or extend `seed.ts`) creates the owner from
  `ADMIN_EMAIL` / `ADMIN_PASSWORD`, hashing with bcrypt, and is idempotent.

**Verify:** login → cookie set → `/api/auth/me` 200; no cookie → 401; login with wrong
password → 401; `/api/categories` POST without cookie → 401; with cookie → works
(remove the 501 stub behaviour).

**Depends on:** F1.

---

### F3 — Public catalogue reads

**Goal:** everything the public site needs to render, in one round trip where sensible.

**Endpoints**

| Method | Path | Notes |
|---|---|---|
| GET | `/api/equipment` | filters `category`, `q`, pagination; only `isActive`; includes `total` from inventory and `available` only when dates are supplied |
| GET | `/api/equipment/:slug` | detail, includes category path |
| GET | `/api/packages` | only `isActive`; includes item list with equipment name and included quantity |
| GET | `/api/packages/:slug` | detail incl. items and price |
| GET | `/api/offers` | active + inside `startsAt`/`endsAt` window |
| GET | `/api/site` | `SiteSetting` public fields + active `TransportProvider` list (name, phone, serviceArea) |
| GET | `/api/categories` | exists; ensure it matches §4.1 envelope |

**Rules**

- Never expose `imagePublicId`, `password`, or `adminId`.
- `total` is `EquipmentInventory.total`; equipment without an inventory row reports 0 —
  do not create rows on read.
- Prices serialise as strings (`Decimal` cannot cross JSON as a number safely). Fix this
  contract now: `"pricePerDay": "1500.00"`.

**Verify:** curl each endpoint against seed data; confirm no `password`/`imagePublicId`
leaks; confirm inactive equipment is absent.

**Depends on:** F1.

---

### F4 — Admin catalogue management

**Goal:** the owner can run the catalogue without touching SQL.

| Method | Path | Notes |
|---|---|---|
| POST / PATCH / DELETE | `/api/admin/equipment[/:id]` | create, edit, deactivate (`isActive=false`, never hard-delete while bookings reference it) |
| PUT | `/api/admin/equipment/:id/inventory` | `{ total }` — upsert `EquipmentInventory` |
| POST / PATCH / DELETE | `/api/admin/packages[/:id]` | plus `PUT /api/admin/packages/:id/items` replacing the item set in one transaction |
| POST / PATCH / DELETE | `/api/admin/offers[/:id]` | validate `discountType`/`discountValue` conditional bounds here (D6: display only) |
| POST / PATCH / DELETE | `/api/admin/transport-providers[/:id]` | phone unique |
| PUT | `/api/admin/settings` | `SiteSetting` singleton for the logged-in admin |
| POST / PATCH / DELETE | `/api/admin/categories[/:id]` | move `categories.ts` under `/api/admin`, keep public `GET` in F3 |

**Rules**

- Every mutation is admin-only.
- Slug is immutable after creation (existing category rule); PATCH ignores `slug`.
- Deactivating equipment does not delete it, and must not be blocked by past bookings.
- Deleting a package with bookings → `409`.
- `PackageItem` replacement runs in a transaction: delete-then-create, rejecting any
  equipment id that does not exist.
- Image handling: accept an `imageUrl` string only. Upload/Cloudinary is deferred (§11).

**Verify:** create → patch → deactivate an equipment row and confirm it disappears from
`/api/equipment` but still resolves via admin; replace package items and confirm the old
rows are gone; delete a referenced package → 409.

**Depends on:** F1, F2.

---

### F5 — Availability API

**Goal:** expose the existing inventory logic over HTTP; this is what the calendar calls.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/availability` | `?equipmentIds=a,b,c&startDate=2026-11-20&endDate=2026-11-22` → rows of `{ equipmentId, name, total, reserved, available }` |
| GET | `/api/packages/:slug/availability` | expands package items × requested package quantity and returns the **minimum** feasible quantity plus per-item detail |
| GET | `/api/calendar` | optional: compact per-day `{ date, available }` for one equipment over a month, for the date picker |

**Rules**

- Dates are required and validated (`startDate <= endDate`, not in the past).
- A package booking demands `packageQuantity × packageItem.quantity` units of each item
  (Rule A). The package is bookable while every item has enough; `minAvailable` is
  `floor(min over items(available / packageItem.quantity))`.
- Expired holds are excluded by the `expiresAt > now` filter already in the service —
  expiry is correct here without the sweeper.
- Response is informational: **availability is re-checked inside the booking transaction
  (F6b); this endpoint can never be used as a guarantee.**

**Verify:** seed has 5 equipment; request 999 units → `available` below requested;
create a PENDING booking manually with holds and confirm `reserved` includes it; set a
hold's `expiresAt` into the past and confirm it stops counting.

**Depends on:** F1, F3 (equipment ids/slugs).

---

### F6 — Booking requests (the core)

Split into three features so each is reviewable.

#### F6a — Pricing module (pure, no database)

`services/pricing.ts` — pure functions, no Prisma import, unit-tested.

- `rentalDays(start, end)` → inclusive, ≥ 1.
- `priceEquipmentLine({ equipment, quantity, days })` → `{ unitPrice, priceForPeriod }`
  using D3 (`PER_DAY`: `pricePerDay × days × qty`; `FLAT`: `flatPrice × qty`).
- `expandPackages(selections, packages)` → `BookingPackageItem`-shaped snapshot lines with
  `quantity` already multiplied by package quantity, plus the package rows' snapshots
  (`packageName`, `packagePrice`).
- `netChargeableUnits(requested, includedPerEquipment)` →
  `max(0, requested − included)`. **This is Rule B of the requirements** ("equipment
  already included in the package is not charged twice"): units inside the package are
  free, units beyond it are charged at individual price.
- `priceBooking(input)` → `{ items[], packages[], subtotal, discountAmount, transportCharge, totalAmount }`.
  `totalAmount = subtotal − discountAmount + transportCharge` (transport is 0 until the
  owner confirms it in F8).

**Invariants to test:** 20–22 Oct = 3 days; two packages of a package that includes 1
castle = 2 castles demanded; requesting 1 castle alongside that package = 0 chargeable but
2 units of demand; `discountAmount` never exceeds subtotal.

**Verify:** vitest suite green; no DB access in the module (no `db` import).

#### F6b — Create booking request

`POST /api/bookings` (public, guest booking).

Body: `{ customer: { name, phone, email? }, startDate, endDate, fulfilmentMethod,
dropoffAddress?, pickupAddress?, packages: [{ packageId, quantity }], equipment:
[{ equipmentId, quantity }], notes?, specialRequests? }`.

**Schema work:** migration 5 (D1, D3, D4) is applied before this feature starts.

**Flow, all inside one transaction**

1. Validate: dates present and valid, `startDate` not in the past, at least one line,
   `fulfilmentMethod` conditions, quantities `1..equipment.maxQuantity`, package
   `isActive`, equipment `isActive`.
2. Compute demand: standalone units + expanded package units per equipment.
3. Acquire a lock so two concurrent requests cannot both pass:
   `db.$transaction(async (tx) => { ... }, { isolationLevel: 'Serializable', timeout: 10000 })`
   plus `SELECT pg_advisory_xact_lock(hashtext(equipmentIds sorted))` to serialise
   overlapping requests cheaply. Retry once on `40001`/`40P01`.
4. `findShortages()` inside the transaction (must read through `tx`, so a `tx`-accepting
   variant of the availability service is added — keep the existing signature by
   defaulting the client argument).
5. Resolve customer: find by `phone` (primary key for guests) or `email`, else create.
   `Customer.email` is unique, so a shared family email must not 500 — match on phone
   first, then email.
6. Generate `Booking.code` = `PP-` + 6 uppercase base32 chars, retry on `P2002`
   (collision), never the `cuid()` default.
7. Create `Booking` (`PENDING`, `holdExpiresAt = now + siteSetting.holdMinutes`,
   `transportCharge = 0`), `BookingItem` rows with snapshots, `PackageBooking` +
   `BookingPackageItem` snapshots, and `StockHold` rows (`ACTIVE`, same `expiresAt`).
8. Write `BookingStatusHistory` (`null → PENDING`).
9. Return `{ code, status, holdExpiresAt, totalAmount, ... }` — **no admin data**.

**Rules**

- Overbooking must be impossible under concurrency; the transaction is the only defence.
- A request that cannot be met returns `409` with per-equipment shortfalls in `details`.
- Prices come from the database, never from the request body.
- The response states explicitly that the request is pending and not confirmed
  (requirement §3.10) — the client renders that copy, the API just must not imply
  confirmation.

**Verify (must be done honestly):** create a valid booking, confirm `Booking`,
`BookingItem`, `BookingPackageItem`, `StockHold` counts; run two concurrent requests for
the last available unit and confirm exactly one succeeds (script both with `Promise.all`
and assert one 201 and one 409); repeat with the transaction isolation removed to prove
the guard is what stops it.

**Depends on:** F1, F5 (service), F6a.

#### F6c — Public booking lookup

`GET /api/bookings/:code` (public) → status, dates, line items, totals, hold expiry,
whether payment is due. Code is the capability — no customer PII beyond what was
submitted (mask the phone as `07•• ••• 123`). `404` for unknown code; no enumeration
(`code` is 6 random base32 chars).

**Verify:** lookup by code returns the right booking; wrong code 404; response contains no
admin id, no other customer.

---

### F7 — Hold expiry

**Goal:** abandoned pending requests stop consuming stock and stop looking alive.

- `POST /api/bookings` already sets `holdExpiresAt`; availability already ignores expired
  holds. This feature adds the state change and the sweeper.
- `services/bookings.ts#expireOverdueBookings()`: in one transaction, find `PENDING`
  bookings with `holdExpiresAt < now` **or** whose `StockHold`s are expired, set
  `status = EXPIRED`, mark holds `EXPIRED` with `releasedAt`, write history rows. Returns
  a count.
- Call it **inline** at the start of: availability queries (cheap: only for the equipment
  in question is not possible, so call a bounded version), `GET /api/bookings/:code`
  (lazy expiry for that booking), and every admin booking operation. The requirement says
  expiry must be checked during booking operations — do that before reading status.
- `jobs/expire-holds.ts`: `setInterval` every `HOLD_SWEEP_INTERVAL_MINUTES` (default 5),
  plus `npm run job:expire-holds` for a one-shot run. Log the count each pass; never
  throw out of the interval.
- An expired booking's approval `409`s (§8 transition table).

**Verify:** create a booking, force `holdExpiresAt` into the past via psql, run the job,
confirm `EXPIRED` + holds released + availability restored; confirm approving it now
returns 409 with a re-check message.

**Depends on:** F6b.

---

### F8 — Admin booking operations

| Method | Path | Notes |
|---|---|---|
| GET | `/api/admin/bookings` | filters `status`, `from`, `to`, `q` (code/name/phone), paginated |
| GET | `/api/admin/bookings/:id` | full detail incl. snapshots, holds, payments, history |
| PATCH | `/api/admin/bookings/:id/status` | `{ status, reason?, note? }` — the only status writer |
| PATCH | `/api/admin/bookings/:id/transport` | `{ transportCharge }` — recalculates `totalAmount`, sets `DELIVERY` requirement |
| POST | `/api/admin/bookings/:id/availability` | re-check before approving an expired hold |

**Transition table (the single source of truth, `services/bookings.ts`)**

| From → To | Allowed by | Effect on stock |
|---|---|---|
| `PENDING → CONFIRMED` | owner | re-check availability if the hold expired; create items if missing; holds → `CONSUMED`; set `approvedAt` |
| `PENDING → REJECTED` | owner | holds → `RELEASED` |
| `PENDING → CANCELLED` | owner | holds → `RELEASED` |
| `PENDING → EXPIRED` | system only | holds → `EXPIRED`; **not permitted via the endpoint** |
| `CONFIRMED → CANCELLED` | owner | item rows stop counting (status change is enough); mark holds released if any linger |
| `CONFIRMED → COMPLETED` | owner | none; sets `fulfilmentDate` if empty |
| `CONFIRMED → REJECTED`, `COMPLETED → *`, `REJECTED → *`, `EXPIRED → CONFIRMED` direct | — | `409 INVALID_TRANSITION` (an expired request must be re-booked or explicitly re-checked) |

**Rules**

- Every transition writes `BookingStatusHistory` (from, to, admin, reason).
- Approving when `holdExpiresAt < now` and stock is no longer sufficient → `409
  HOLD_EXPIRED` with the shortfall; the owner must reject or ask the customer to rebook.
- Approving sets `CONFIRMED_BOOKING_STATUSES` counting, so the stock reserved is held by
  the item rows from then on.
- `transportCharge` change is allowed while `PENDING`/`CONFIRMED`; the customer must be
  told the new total (requirement §5) — out of scope to send it, note it in the response
  as `totalChanged: true`.
- Manual list of what is deliberately not automated: no WhatsApp/email notifications
  (§11).

**Verify:** walk one booking through every allowed edge and two disallowed ones; assert
`BookingStatusHistory` row per transition; assert a `CANCELLED` confirmed booking frees
inventory on a subsequent availability query.

**Depends on:** F6b, F7.

---

### F9 — Payments

| Method | Path | Notes |
|---|---|---|
| POST | `/api/admin/bookings/:id/payments` | `{ amount, method, providerRef?, paidAt?, description? }` |
| GET | `/api/admin/bookings/:id/payments` | list with running total |
| DELETE | `/api/admin/payments/:id` | only while `status = PENDING`; not a refund (§11) |
| PATCH | `/api/admin/payments/:id` | mark `PAID`/`FAILED`, set `providerRef` |

**Rules**

- Recording a payment runs in a transaction: create `Payment` (`PAID` immediately when
  `method` is `CASH`/`MPESA`/`BANK_TRANSFER` and `paidAt` is given, else `PENDING`),
  then recompute `Booking.paidAmount` = sum of `PAID` payments — **recompute, never
  increment** (increments drift).
- Derived payment status per D2 lives in `services/payments.ts` and is included in the
  booking response as `paymentStatus: "UNPAID" | "PARTIALLY_PAID" | "PAID"`.
- Overpayment is allowed but flagged (`overpaidBy`), because transfer fees and rounding
  happen; no CHECK constraint blocks it.
- `paidAmount <= totalAmount` is app-enforced and deliberately not a DB check
  (`database-spec.md` §8.2).

**Verify:** record 500 of a 2000 total → `PARTIALLY_PAID`, 1500 more → `PAID`, delete the
first → recomputed back to 1500; confirm `paidAmount` always equals the sum.

**Depends on:** F8 (booking detail), F2.

---

### F10 — Dashboard summaries

`GET /api/admin/dashboard` → `{ bookings: { pending, confirmedThisMonth, completed },
revenue: { collected, outstanding, thisMonth }, inventory: { lowStock: [...] },
upcoming: [...] }`.

- `lowStock`: equipment where available units for "today" (or the next 7 days) is 0 while
  there are PENDING/CONFIRMED bookings — computed with the availability service, not a
  stored counter.
- Read-only; no new tables.

**Verify:** numbers reconcile with direct psql `COUNT`/`SUM` on the same day's data.

**Depends on:** F8, F9.

---

## 7. Milestone C — Client (only after B1–B4 are done)

Built feature-parallel to the backend slices above, in this order. Each consumes a
finished endpoint; no mock data survives a slice.

| # | Slice | Backend it consumes |
|---|---|---|
| C1 | API client + envelope/error handling + TanStack Query setup | F1 |
| C2 | Public shell: header/footer/social links from `/api/site`, contact page | F3 |
| C3 | Equipment catalogue + detail | F3 |
| C4 | Packages + offers pages | F3 |
| C5 | Availability calendar wired to `/api/availability` | F5 |
| C6 | **Booking form**: package + additional equipment selection, live price preview (same rules as F6a, server is authoritative), delivery/collection, submit → reference + pending notice | F6b, F6c |
| C7 | Booking status page by code | F6c |
| C8 | Admin login + route guard | F2 |
| C9 | Admin catalogue CRUD screens | F4 |
| C10 | Admin booking board (filters, detail, approve/reject, transport charge) | F8 |
| C11 | Admin payments screen + dashboard | F9, F10 |

**Client conventions written once in C1:** one `api.ts` wrapper that unwraps `{ data }`
and throws a typed `ApiError` carrying `code`; server is the source of truth for prices;
every form validates with the same zod schemas shape as the server (duplicated
deliberately, server wins).

**Libraries the client does not have yet** (installed in C1, not before): `zod` and
`@tanstack/react-query` for data/error handling, plus the shadcn/ui prerequisites the
requirements stack calls for — `class-variance-authority`, `clsx`, `tailwind-merge`,
`lucide-react`, and the Radix primitives each component needs. Tailwind 4 is already
wired through `@tailwindcss/vite`.

---

## 8. Sequencing summary

```
F1  platform ──┬── F2 auth ──┬── F4 admin catalogue
               │             └── F8 (needs F6b,F7)
               ├── F3 reads ── F5 availability ── F6a pricing ── F6b create ──┬── F6c lookup
               │                                                           ├── F7 sweeper
               │                                                           ├── F8 admin ops ── F9 payments ── F10 dashboard
               └── (migration 5: D1, D3, D4) before F6b
```

Engine order: **F1 → F2 → F3 → F4 → F5 → F6a → F6b → F6c → F7 → F8 → F9 → F10 → C1…C11.**

F2 before F4 because admin CRUD is meaningless without a login to test it through. F6a
before F6b because creation without trustworthy pricing produces garbage snapshots. F7
before F8 because the expiry rules are part of the approval contract.

---

## 9. Concurrency and inventory strategy (summary of `database-spec.md` Rules A/B/C)

| Concern | Mechanism |
|---|---|
| Overbooking | `Serializable` transaction + `pg_advisory_xact_lock` on the sorted equipment-id set + retry once on `40001` |
| Double counting a package and its items | Demand = standalone `BookingItem`s + expanded `BookingPackageItem`s; a package contributes the equipment it contains |
| Pending vs confirmed reservation | `PENDING` counts via unexpired `ACTIVE` `StockHold`; `CONFIRMED` counts via item rows. Different sources, never both |
| Price changes after submission | Every price and package content is snapshotted into the booking rows |
| Payments | Separate rows; `paidAmount` recomputed from `PAID` rows |

The only defence against overselling is the transaction. The API availability endpoint
and the client preview are advisory.

---

## 10. Verification recipes

Run from the repo root unless stated. All assume the dev DB (`docker compose up -d`)
and `npm run dev:server`.

```bash
# typecheck (every feature)
cd server && npx tsc --noEmit

# migrations
cd server && npx prisma migrate status

# schema sanity straight from the database
docker exec -i partyplay-db-1 psql -U partyplay -d partyplay \
  -c "select * from \"Booking\" order by \"createdAt\" desc limit 5;"

# PSQL counts used by most feature checks
docker exec -i partyplay-db-1 psql -U partyplay -d partyplay -c \
  "select (select count(*) from \"Booking\") as bookings,
          (select count(*) from \"BookingItem\") as items,
          (select count(*) from \"StockHold\") as holds;"
```

Concurrency check (F6b) must be a script, not a claim: fire two parallel `fetch` calls for
the last unit and assert `[201, 409]`.

---

## 11. Deferred — explicitly out of scope

| Item | Why |
|---|---|
| Image uploads / Cloudinary | Accept `imageUrl` strings until the owner has real photos |
| WhatsApp / email notifications | Requirements: owner follows up manually |
| M-Pesa Daraja integration, automated refunds | MVP records payments by hand |
| Customer accounts, multiple staff accounts | Guest booking + one owner account |
| Discount engine for offers | D6 — offers are display-only |
| Guest-count enforcement (package min/max) | D5 |
| `pricePerWeek` | D3 — no weekly pricing in MVP |
| Driver dispatch/tracking, live chat, loyalty, analytics | Requirements §8 |
| Automated test suite beyond pricing/availability/transitions | Added when those rules need regression cover |

---

## 12. Progress ledger

| # | Feature | Backend | Client | Branch |
|---|---|---|---|---|
| — | Phase 2.2 database design + hardening | ✅ | n/a | `feat/phase-2.2-database-design` |
| F1 | Platform foundation | ☐ | — | `feat/f1-platform-foundation` |
| F2 | Admin auth | ☐ | — | `feat/f2-admin-auth` |
| F3 | Public catalogue reads | ☐ | — | `feat/f3-catalogue-reads` |
| F4 | Admin catalogue management | ☐ | — | `feat/f4-admin-catalogue` |
| F5 | Availability API | ☐ | — | `feat/f5-availability-api` |
| F6a | Pricing module | ☐ | — | `feat/f6a-pricing` |
| F6b | Booking creation | ☐ | — | `feat/f6b-booking-creation` |
| F6c | Booking lookup | ☐ | — | `feat/f6c-booking-lookup` |
| F7 | Hold expiry + sweeper | ☐ | — | `feat/f7-hold-expiry` |
| F8 | Admin booking operations | ☐ | — | `feat/f8-booking-operations` |
| F9 | Payments | ☐ | — | `feat/f9-payments` |
| F10 | Dashboard summaries | ☐ | — | `feat/f10-dashboard` |
| C1–C11 | Client slices | — | ☐ | `feat/c<n>-<slug>` |

---

## 13. Mapping to the Phase 2 exit criteria

| Requirement (v1.2 §9) | Where |
|---|---|
| System architecture and component boundaries | §3 |
| Database entity relationship design | `database-spec.md` §3–§4 |
| PostgreSQL schema and Prisma models | `server/prisma/schema.prisma`, migrations 1–4 |
| API endpoint specification | §6 per feature, plus §7 for client consumers |
| Validation and error-handling conventions | §4.1–§4.3, F1 |
| Authentication and authorization design | F2 |
| Transaction and inventory concurrency strategy | §9 |
| Project setup and initial migration plan | §2, §10; migrations 1–4 applied, migration 5 planned in §5 |
