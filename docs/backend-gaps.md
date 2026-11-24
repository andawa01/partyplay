# Backend gaps — what is not covered yet

**Prepared:** 15 November 2026
**Scope:** backend only (`server/`), as merged to `main` at `d269e90`
**Purpose:** a plain list of what the backend does *not* do yet, so the owner can decide
what is worth paying for next. Nothing here is a bug report against finished work — it is
the boundary of the current build.

Read the **risk** column as "what goes wrong in real use if this stays missing", not as
implementation difficulty. **Effort** is a rough size: S ≈ hours, M ≈ a day or two,
L ≈ a week or more.

---

## 1. What already works

For context, the backend today covers:

- Catalogue: categories, equipment, packages, offers, inventory levels, site settings.
- Availability: per-equipment and per-package checks, plus a monthly calendar.
- Booking requests: guest submission with live server-side pricing, stock holds,
  hold expiry, lookup by reference.
- Admin operations: approve, reject, cancel, complete, transport charge, payment
  records, dashboard summary.
- Admin auth: one owner account, session cookie, password change, rate-limited login.
- Guard rails recently added: throttled public booking routes, committed HTTP smoke
  tests, idempotent seed.

Everything below is what sits outside that boundary.

---

## 2. Operations and deployment — **highest risk**

The backend is complete as an application but is not yet *operable* as a service. There is
no production deployment definition in the repo at all — no Dockerfile, no app service in
`docker-compose.yml` (it starts only Postgres), no Caddy/proxy config, no staging
environment.

| Gap | Why it matters | Risk | Effort |
|---|---|---|---|
| No production deploy definition | Nothing to run on a server. The app has to be started by hand with a remembered command. | **High** | M |
| No graceful shutdown | `index.ts` has no `SIGTERM`/`SIGINT` handling, so a restart or deploy kills in-flight bookings mid-transaction and never closes the Prisma pool cleanly. | **High** | S |
| Hold sweeper is never scheduled | `npm run job:expire-holds:watch` exists, but nothing runs it. Expiry only happens when someone views availability or a booking; an idle site keeps stale pending bookings and their stock holds. | **High** | S |
| No backups | Postgres runs with a Docker volume and no dump schedule. A lost volume is a lost business: bookings, payments, customer contacts. | **High** | S |
| No logging or monitoring | `console.log` to stdout, no request log with status/latency, no error tracker, no uptime check beyond `/api/health`. A failed payment write at 2am is invisible. | **High** | M |
| No staging environment | Every future change is tested against the same database the owner uses. | Medium | M |
| No migration runbook | `prisma migrate deploy` works, but there is no documented, rehearsed release step (backup → migrate → restart → verify). | Medium | S |

**Suggested first package:** deploy definition + graceful shutdown + scheduled sweeper +
nightly `pg_dump`. That turns a working codebase into a working service.

---

## 3. Money handling

Payments are recorded correctly (rows are the source of truth, `paidAmount` is recomputed),
but the surrounding money workflows are absent.

| Gap | Why it matters | Risk | Effort |
|---|---|---|---|
| No refund workflow | `PaymentStatus.REFUNDED` exists in the schema but no endpoint sets it. Today a refund is handled outside the system, so the booking still shows the money as collected. | **High** | M |
| No overpayment rule | A payment larger than the balance is accepted and merely reported as `surplus`. The dashboard counts it as collected revenue. Policy needs deciding: reject, or allow as a deposit/credit. | Medium | S |
| No receipts or invoices | The owner has no document to send a customer. The payment list is admin-only. | Medium | M |
| Payments have no edit history | Booking status changes are logged, payment edits/deletions are not. If a figure is questioned there is no trail of who changed what. | Medium | S |
| Offers are display-only | `discountAmount` exists on a booking but nothing ever sets it; `FIRST10` cannot actually be redeemed. | Medium | M |
| No daily takings / reconciliation report | The dashboard shows a month total; there is no per-day cash-up or method breakdown (cash vs M-Pesa) for closing the day. | Medium | S |

---

## 4. Booking lifecycle

The booking is deliberately immutable after submission: the admin can change status and
transport charge, but not dates, items or quantities.

| Gap | Why it matters | Risk | Effort |
|---|---|---|---|
| No booking edit | A customer who wants to add a chair must be cancelled and re-booked, losing the original reference and history. | **High** | M |
| No customer self-service cancellation | Only the admin can cancel. Customers must phone; the status page is read-only. | Medium | M |
| No guest-count enforcement | Package `minQuantity`/`maxQuantity` are stored but no guest count is captured, so package suitability is unchecked (agreed deferral D5, but it now affects pricing decisions). | Medium | M |
| No blackout / maintenance dates | There is no way to take a damaged castle out of stock for a weekend without deactivating it entirely, which also hides it from the catalogue. | **High** | M |
| No delivery scheduling or capacity | Transport is a manual charge per booking. Nothing warns that two deliveries are promised for the same hour, or that the same driver is double-booked. | Medium | L |
| No booking code rotation / customer identity | The reference code is the only credential. Anyone who learns a code sees the customer's name, phone and addresses (throttled, but not authenticated). Acceptable for an MVP; worth revisiting if codes are shared widely. | Low | M |

---

## 5. Notifications and integrations (deliberately deferred)

These were agreed out of scope for the MVP; they are listed so the owner can price them
in later without re-discovering them.

| Gap | Consequence today | Effort |
|---|---|---|
| No email / WhatsApp / SMS | The owner must remember to follow up every request manually. A pending booking can expire without the customer ever being told. | M |
| No M-Pesa / Daraja integration | Payments are typed in by hand; a customer's M-Pesa message has to be matched manually to a booking. | L |
| No automated refunds | Tied to the refund workflow above. | M |
| No image uploads | Equipment images are URL strings; someone must host the photos elsewhere. | S |
| No discount engine | Offers cannot be applied. | M |
| No weekly pricing | `pricePerWeek` is stored but unused (agreed deferral D3). | S |

---

## 6. Accounts and access

The system assumes exactly one owner. The schema already has `OWNER`/`ADMIN`/`STAFF`
roles, but nothing creates or manages additional accounts.

| Gap | Why it matters | Risk | Effort |
|---|---|---|---|
| No staff accounts | The owner cannot give a helper limited access; they would have to share the owner password. | **High** | M |
| Reset email depends on Resend | Self-service reset works once `RESEND_API_KEY` and `MAIL_FROM` are configured. Without them the request endpoint returns `503`; the server CLI still works as a fallback. | Low | S |
| Partial session revocation | Logout clears only the current cookie. Password reset bumps `Admin.sessionVersion` and revokes every existing session, but there is no per-session list or remote sign-out. | Low | M |
| No two-factor authentication | One password protects all customer and payment data. | Medium | M |
| Admin routes are unthrottled | Only login and public booking routes are limited. A stolen session can be used at full speed. | Low | S |
| No security headers | No Helmet/CSP; HTTPS and header hardening are assumed to be the proxy's job but nothing in the repo states or enforces it. | Medium | S |
| No audit log for catalogue or settings changes | Prices can be changed with no record of who changed them or when. | Medium | S |

---

## 7. Testing and code quality

The recent hardening added a committed HTTP smoke suite and a test-only environment. Two
gaps remain in how it is used.

| Gap | Why it matters | Risk | Effort |
|---|---|---|---|
| Smoke tests never run in CI | CI has no database in the test job, so the suite skips. The `Migrations` job already starts Postgres; the suite could run there against an empty migrated database. | **High** — regressions in booking/payment logic are not caught by CI | S |
| No concurrency regression test | The double-booking protection was verified once by a throwaway script. There is no committed test firing two requests for the last unit and asserting one succeeds and one conflicts. | **High** — this is the single most expensive failure mode | S |
| No lint or format configuration | No ESLint/Prettier config, so style and obvious mistakes rely on review. | Low | S |
| No coverage threshold | Nothing prevents a future change from dropping test coverage. | Low | S |

---

## 8. Data, reporting and search

| Gap | Why it matters | Risk | Effort |
|---|---|---|---|
| No operational reports or CSV export | No per-equipment utilisation, no monthly revenue trend, no export for an accountant. Data is in Postgres only. | Medium | M |
| Payments list is unpaginated | Fine at today's volume; grows unbounded per booking (bounded in practice by payments per booking). | Low | S |
| Customers are matched by phone/email but duplicates accumulate | A customer who books with a new number becomes a new row; there is no merge or CRM view. | Low | M |
| No retention or purge policy | EXPIRED/CANCELLED bookings stay forever with customer contact data. Needs a documented retention period eventually (also a privacy question). | Low | S |
| Timezone is fixed to Africa/Nairobi | Correct for the business today, hardcoded in date handling; a second location would need configuration. | Low | S |
| Public availability/calendar are unthrottled | Cheap reads, but each hits the database; a crawler can add load. | Low | S |
| In-memory rate limiter | Resets on restart and does not coordinate across instances. Adequate for a single instance; must move to a shared store before scaling out. | Low | M (only when scaling) |

---

## 9. Already agreed as out of scope

From `build-plan.md` §11, kept here so they are not mistaken for oversights:

- Image uploads / Cloudinary — accepting `imageUrl` strings for now.
- WhatsApp / email notifications — the owner follows up manually.
- M-Pesa Daraja and automated refunds — payments are recorded by hand.
- Customer accounts and multiple staff accounts — guest booking, one owner.
- Discount engine for offers — offers are display-only.
- Guest-count enforcement for packages (D5).
- `pricePerWeek` weekly pricing (D3).
- Driver dispatch/tracking, live chat, loyalty, analytics.
- A broader automated test suite beyond pricing, availability and transitions.

Several of these now appear in the tables above because their absence has become visible in
real workflows; the owner can decide which ones to promote.

---

## 10. Recommended order

If the goal is "safe to run the business on", this order gives the most risk reduction per
unit of work:

1. **Operations package** — deploy definition, graceful shutdown, scheduled sweeper,
   nightly backups, basic request logging. *(§2)*
2. **Concurrency test in CI** — commit the last-unit test and run the smoke suite in the
   CI job that has Postgres. *(§7)*
3. **Maintenance blackout dates** — protects against renting out a broken item. *(§4)*
4. **Refunds and overpayment policy** — closes the gap between the books and reality. *(§3)*
5. **Booking edit** — removes the cancel-and-rebook workaround. *(§4)*
6. **Staff accounts** — stops password sharing. *(§6)*
7. **Notifications** — the biggest labour saving for the owner. *(§5)*
8. **Reports and CSV export** — needed at month end. *(§8)*

Items 1 and 2 are small and protect everything else; they are worth doing before the next
feature, not after.
