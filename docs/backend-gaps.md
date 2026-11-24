# Backend gaps — what is not covered yet

**Prepared:** 15 November 2026
**Updated:** 24 November 2026 — F11 maintenance blackouts and F12 refunds
**Scope:** backend and deployment, as merged to `main` at `489a122` plus the F11/F12 branches
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
  records, partial/full refunds, dashboard summary.
- Admin auth: one owner account, session cookie, password change, rate-limited login.
- Guard rails recently added: throttled public booking routes, committed HTTP smoke
  tests, idempotent seed.

Everything below is what sits outside that boundary.

---

## 2. Operations and deployment — first package now covered

The O1 operations package adds a production Dockerfile, a Caddy-served client, a compose
stack with migrations, a scheduled sweeper and a nightly `pg_dump`, plus graceful shutdown
and structured request logs. See `docs/operations.md` for the runbook.

These remain:

| Gap | Why it matters | Risk | Effort |
|---|---|---|---|
| No staging environment | Every future change is tested against the same database the owner uses. | Medium | M |
| No external monitoring | Request logs exist, but there is no error tracker or uptime alert if the process dies or a payment write fails. | **High** | M |
| Backups are on-host only | A nightly dump protects against bad writes, but the `pgbackups` volume is on the same host as Postgres. A host loss loses both. | **High** | S |

**Done in O1:** deploy definition, graceful shutdown, scheduled sweeper, nightly backup,
basic request logging, migration/restore runbook, and a restore into a disposable
database. That turns the working codebase into a working single-host service.

---

## 3. Money handling

Payments are recorded correctly, refunds are now first-class rows, and new payments cannot
exceed the balance. The remaining money gaps are about documents, audit history and
reconciliation.

| Gap | Why it matters | Risk | Effort |
|---|---|---|---|
| ~~No refund workflow~~ | **Done in F12:** partial and full refunds are recorded against a paid payment, reduce `paidAmount`, update the dashboard and are visible in the admin payment history. | — | — |
| ~~No overpayment rule~~ | **Done in F12:** a new payment may not exceed the outstanding balance; the pending-to-paid transition rechecks it. Returned money is a refund, not an implicit credit. | — | — |
| No receipts or invoices | The owner has no document to send a customer beyond the browser print view. The payment list is admin-only. | Medium | M |
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
| ~~No blackout / maintenance dates~~ | **Done in F11:** an equipment item can be blocked for an inclusive date range without hiding it; availability, new requests and confirmations all respect the blackout. | — | — |
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
| No orphaned-upload cleanup | An image uploaded and then abandoned before saving stays in Cloudinary. Saved-image replacements and package deletions are cleaned up. | S |
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

No testing or code-quality gaps remain in this section.

**Done in T1:** the `Migrations` job runs the HTTP suite against an empty migrated
database with `PARTYPLAY_REQUIRE_SMOKE_DB=1`, so a missing connection fails the job instead
of skipping. The suite also fires two concurrent requests for the last unit and asserts
one `201` and one `409`.

**Done in T2:** ESLint covers the server, client and tooling files; Prettier is checked in
CI; client tests run in CI; and both workspaces enforce all-source coverage floors. The
current floors are server 58% statements / 44% branches / 47% functions / 58% lines and
client 27% / 19% / 25% / 27%.

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

- WhatsApp / email notifications — the owner follows up manually.
- M-Pesa Daraja and provider-side automated refunds — payments and refunds are recorded by
  hand, though manual refunds now have an auditable workflow (F12).
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

1. ~~**Operations package** — deploy definition, graceful shutdown, scheduled sweeper,
   nightly backups, basic request logging. *(§2)*~~ **Done in O1.**
2. ~~**Concurrency test in CI** — commit the last-unit test and run the smoke suite in the
   CI job that has Postgres. *(§7)*~~ **Done in T1.**
3. ~~**Maintenance blackout dates** — protects against renting out a broken item.
   *(§4)*~~ **Done in F11.**
4. ~~**Refunds and overpayment policy** — closes the gap between the books and reality.
   *(§3)*~~ **Done in F12.**
5. **Booking edit** — removes the cancel-and-rebook workaround. *(§4)*
6. **Staff accounts** — stops password sharing. *(§6)*
7. **Notifications** — the biggest labour saving for the owner. *(§5)*
8. **Reports and CSV export** — needed at month end. *(§8)*

The next item is **booking edit**, which removes the cancel-and-rebook workaround. Refunds
and maintenance blackouts are done; code-quality gates give new work lint, format and
coverage feedback from CI.
