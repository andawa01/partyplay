# Client build plan — slices C1–C11

**Prepared:** 15 November 2026
**Scope:** `client/` only. The backend (F1–F10) is finished and merged at `d269e90`.
**Companion docs:** `build-plan.md` §7 (slice list), `backend-gaps.md` (what the API does
not do yet), `git-workflow.md` (branch, PR and commit rules).

This is the working plan for the client milestone: what each slice builds, which endpoint
it consumes, and what must be true before the slice is accepted. The backend is the source
of truth for prices, availability and booking state — the client renders what it is given
and never recalculates money to decide a total.

---

## 1. Starting state (verified)

The shell exists and nothing else:

- Vite + React 19 + TypeScript, Tailwind 4 via `@tailwindcss/vite` (`index.css` is one
  `@import "tailwindcss"`).
- `react-router-dom` 7 with routes in `src/App.tsx`: public `/`, `/equipment`, `/packages`,
  `/offers`, `/booking`, `/contact`; admin `/admin/login`, `/admin/dashboard`; `*`.
- Two layouts (`PublicLayout`, `AdminLayout`) and static pages with hardcoded copy.
- `vite.config.ts` proxies `/api` to `http://localhost:4000`, so the browser talks to the
  API same-origin in dev and the session cookie works without CORS.
- No data layer, no `fetch` wrapper, no query library, no `zod`, no component kit, no form
  handling, no client tests.
- CI (`.github/workflows/ci.yml`) typechecks client and server through `npm run typecheck`.

Nothing on the client currently reads the API, so every slice below replaces placeholder
content with real data. No mock data survives a slice.

---

## 2. The API contract the client must honour

Read once in C1 and encoded in `lib/api.ts`; later slices must not re-implement any of it.

**Success envelope**

```jsonc
{ "data": ... }                                     // single object or list
{ "data": [...], "meta": { "total": 57, "page": 1, "pageSize": 20 } }  // paginated lists
```

**Error envelope** (every non-2xx response)

```jsonc
{ "error": "Human readable message", "code": "MACHINE_CODE", "details": { ... } }
```

Codes the UI must handle deliberately:

| Status + code | Meaning | Client behaviour |
|---|---|---|
| 400 `VALIDATION_ERROR` | Body/query failed zod. `details` is a flattened zod error (`fieldErrors`) | Map `fieldErrors` onto form fields |
| 400 `BAD_REQUEST` | Semantic rejection (bad date, inverted range, past date) | Show message near the relevant field |
| 401 `UNAUTHORIZED` | No/expired session | Admin: redirect to `/admin/login`; public: not expected |
| 404 `NOT_FOUND` | Unknown slug/id/booking code | Render a "not found" state, not a crash |
| 409 `CONFLICT` | Stock conflict, invalid status transition | Show message; refresh the affected query |
| 429 `RATE_LIMITED` | Booking create/lookup throttled | Explain the wait; disable submit |
| 500 `INTERNAL_ERROR` | Unexpected | Generic failure + retry, log `requestId` if present |

**Conventions already fixed by the backend**

- Dates are calendar strings `YYYY-MM-DD`; never send or parse a `Date` for rental days.
- Money arrives as a **decimal string with 2 dp** (e.g. `"2500.00"`). Format for display;
  never do float arithmetic on it.
- Delete endpoints return `204` with no body.
- Admin session is an httpOnly cookie `pt_sess` (`sameSite=lax`, 12 h default). The
  wrapper must send `credentials: "include"`; the client never sees or stores the token.
- `POST /api/bookings` and `GET /api/bookings/:code` are rate-limited — no polling loops.
- Guest phone numbers are exactly 10 digits, and optional emails must be valid. New admin
  passwords are at least 8 characters with uppercase, lowercase and a number.
- Prices in a booking request body are ignored by the server, so the form may send only
  ids and quantities; the preview must come from the server, not local maths.

---

## 3. C1 — client foundation (this branch)

**Goal:** every later slice writes data calls and UI states without touching infrastructure.

**Dependencies to install (only now):**

- `zod` — request/response shape checks and form validation.
- `@tanstack/react-query` (+ devtools in dev only).
- shadcn/ui prerequisites: `class-variance-authority`, `clsx`, `tailwind-merge`,
  `lucide-react`, and the Radix packages for the components actually used.
  `tailwindcss` 4 is already installed; no `tailwind.config` is required.

**Files to create**

| File | Responsibility |
|---|---|
| `src/lib/api.ts` | `apiFetch<T>()` wrapper: base path, `credentials`, JSON parse, envelope unwrap, throws typed `ApiError` (`status`, `code`, `details`, `message`) |
| `src/lib/query-client.ts` | One `QueryClient`: no retry on 4xx, one retry on 5xx, `staleTime` for catalogue reads, `refetchOnWindowFocus: false` |
| `src/lib/money.ts` | `formatMoney(value: string, currency)`, decimal-string safe |
| `src/lib/dates.ts` | `formatCalendarDate`, `todayCalendarDate()`, range helpers — string in, string out |
| `src/lib/cn.ts` | `clsx` + `tailwind-merge` helper |
| `src/components/ui/*` | Button, Input, Select, Card, Badge, Skeleton, Alert, Dialog, Table as needed |
| `src/providers.tsx` | `QueryClientProvider` + any toast/error surface |
| `src/main.tsx` | Wrap `<App />` in the providers |

**Behaviours C1 must establish**

- `apiFetch` parses the envelope, so callers receive `data` (and `meta` where present),
  never the raw body.
- Errors become one `ApiError` type; no `throw new Error(response.statusText)` anywhere.
- Query keys are centralised and typed (`["equipment", filters]`, `["booking", code]`, …)
  so mutations can invalidate precisely.
- A single visible error surface (inline alert or toast) plus retry, used by all slices.
- `queryClient.clear()` on admin logout so one operator's cached data never shows to the next.

**Explicitly not in C1:** no page reads data yet, no auth guard, no design-system sweep of
existing pages, no client test runner.

**Acceptance for C1**

- `npm run typecheck` and `npm run build` clean.
- A throwaway check (temporary page or console call) proves: `GET /api/site` returns data
  through the wrapper; a 404 slug throws `ApiError` with `code: "NOT_FOUND"`; a failed
  request renders the shared error surface and retries.
- No page still uses `fetch` directly afterwards.

---

## 4. Slices C2–C11

Each row is one branch (or one small PR), built only against the listed endpoints, and
finished when the listed states all exist. `PC` = the page currently holding placeholder
copy.

### C2 — Public shell and site settings — `GET /api/site`

Header, footer, contact details, social links and business name come from site settings.
States: loading (static shell), success, error (fall back to neutral defaults, never blank
chrome). Contact page renders phone/WhatsApp/email as links. **Done when** changing settings
in the admin changes the public footer without a code change.

**Shipped (PR #19):** one cached `useSite()` query feeds the header, footer and contact page;
the footer renders `SITE_FALLBACK` while loading and after a failure so the chrome is never
blank. Social links and transport providers stay hidden until the owner fills them in.
Redesigned in the same PR to the §5 visual bar.

### C3 — Equipment catalogue and detail — `GET /api/equipment`, `GET /api/equipment/:slug`

Grid with card image, name, category, price and availability badge; category filter and
search (`category`, `q`) mirrored into the URL so a filtered view is shareable; pagination
(`page`, `pageSize`) with the `meta.total` count. Detail page with image, description,
inventory, price, "check dates" entry point. Empty and no-results states distinct.
**Done when** filter + page survive a reload and back/forward.

**Shipped (`feat/c3-equipment-catalogue`):**

- `/equipment?q=&category=&page=` is the state. Search is debounced into the URL with
  `replace`; category and page push history, so reload and back/forward restore the view.
  Page size is 12.
- Category pills come from public `GET /api/categories` (root categories only). A root
  filter already includes its children on the server, and a URL using a child slug lights
  its parent pill.
- The card badge reports inventory (`total`): "N units in stock" / "Unavailable". It is
  deliberately not labelled date availability — C5 owns dates and remaining quantity.
- The detail CTA links to `/booking?equipment=<slug>`. Reading that preselection and the
  server-side date check belong to C6.
- Distinct states: catalogue empty, filters with no matches (clear filters), page past the
  end (back to page one), and a friendly 404 for an unknown slug.

### C4 — Packages and offers — `GET /api/packages`, `GET /api/packages/:slug`, `GET /api/offers`

Package cards showing what is included (server-provided items, not hardcoded), price and
minimum quantity; offers rendered as display-only promotions. No "redeem" or discount CTA
while the backend has no redemption path — an offer must not promise a discount the
booking cannot apply. **Done when** the packages page content is entirely server-driven.

**Shipped (`feat/c4-packages-offers`):**

- `/packages` and `/packages/:slug` read `GET /api/packages` and
  `GET /api/packages/:slug`. Cards show the package name, package price, duration and the
  server-provided included items (first three, then "+N more"); the detail page lists every
  item with a link back to that equipment.
- No guest count appears anywhere, and `minQuantity`/`maxQuantity` are not rendered — the
  package is priced per package, per product decision #1.
- The home page shows up to three featured packages (`isFeatured`) with the same cards and
  a link to the full package list. The section is omitted when nothing is featured or the
  request fails, so the hero never waits on it.
- `/offers` is display-only. Cards show the discount, the server description, what the
  offer applies to and its validity window. There is no redeem/apply CTA and no promo code
  is displayed; a page note says the online request does not apply discounts and the owner
  confirms any offer by phone or WhatsApp.
- The package CTA links to `/booking?package=<slug>`; C6 reads the preselection and owns
  availability and pricing.
- States: loading skeletons, error with retry, empty packages, empty offers, and a friendly
  404 for an unknown package slug.

### C5 — Availability calendar — `GET /api/calendar`, `GET /api/availability`, `GET /api/packages/:slug/availability`

Month grid from `/api/calendar?equipmentId=&month=` showing unavailable days; date-range
selection; on range complete, check the selected items and show per-item available/blocked
with remaining quantity. Handle 400 for past/inverted dates and 404 for unknown equipment.
**Done when** a date the calendar marks unavailable cannot be selected, and the state
matches a fresh server check.

**Shipped (`feat/c5-availability-calendar`):**

- `/booking` is now the availability step. It accepts the existing `?equipment=<slug>`
  and `?package=<slug>` links from C3/C4, with a chooser state when neither is present.
- The month grid is built from `/api/calendar` and disables past days and days with zero
  availability, so a fully booked day cannot be selected as either endpoint. The range
  check remains the authority for every day in between.
- A package contributes every included item to the grid: a day only counts as free when
  all of its equipment is free, and the available count is the number of whole packages
  that fit. The selected range is checked with `/api/packages/:slug/availability`, which
  shows each item's required, free and shortfall quantities.
- Selecting a start and end date fires `/api/availability` (equipment) or the package
  endpoint, with loading, error/retry and an explicit "Check again" refresh. The server's
  advisory note is shown with the result.
- 400s (a date that passed while the page was open, or an inverted range from the API) use
  the shared `ErrorState`; unknown slugs render the friendly not-found state.
- Package month data needs equipment ids, which the public package payload does not carry,
  so the page resolves its item slugs from the public catalogue list. A package item that
  is no longer listed produces an inline warning instead of a silently optimistic grid.
- C6 still owns customer details, quantities, pricing, submission and the success screen.

### C6 — Booking form — `POST /api/bookings/quote`, `POST /api/bookings`, `GET /api/availability`

Package + additional equipment selection, quantity steppers, delivery/collection with the
address field the server requires, customer details, notes. **Live price preview must come
from the server** (price endpoint/creation dry-run as available) — the client never sums
line totals itself; label the preview as an estimate until the request is submitted.
Submission shows the booking code, the pending notice and the hold expiry. Handle:
`409 CONFLICT` (someone took the last unit — name the item), `429` (throttled — explain),
`400 VALIDATION_ERROR` (map fields), network failure (no duplicate submit: disable while
in flight, no automatic retry of a create). **Done when** the success screen shows the code
and expiry from the server response, and a stopped backend produces one clear error, not
two bookings.

**Shipped (`feat/c6-booking-form`):**

- `/booking` is now the full request form: package selector with its own quantity,
  additional equipment steppers, the C5 calendar, delivery/collection, contact details and
  notes. The existing `?package=` and `?equipment=` links seed the selection.
- The calendar now reflects the **whole selection**. Package items are resolved through the
  public catalogue, extra equipment is merged with package inclusions using the same
  Rule B demand rule as creation, and the day count is how many complete selections fit.
- Added `POST /api/bookings/quote` — a read-only endpoint that runs the same catalogue
  checks and `priceBooking` call as creation. The form never calculates totals itself; it
  renders the quote's line items, subtotal and estimate, and labels transport/discounts as
  confirmed by the owner. The endpoint is documented in `docs/build-plan.md`.
- The stock check uses `/api/availability` for every equipment item in the selection and
  compares free units with the required units. A quantity change refreshes both the quote
  and the stock check.
- Submission sends only ids, quantities, dates, fulfilment/address and customer details.
  Success replaces the form with the server's booking code, PENDING notice and hold expiry.
- Failures: local zod validation and server `VALIDATION_ERROR` fields are mapped to inputs;
  `409 CONFLICT` names the short items; `429` explains the wait; a network failure shows one
  "nothing was submitted" message and re-enables the button. The create mutation is never
  retried automatically.
- No guest count is introduced; packages remain priced per package.
- C7 adds the status page for a saved code.

### C7 — Booking status page — `GET /api/bookings/:code`

Code entry + status view for a known code: status, dates, items, amounts, hold expiry.
Unknown/malformed code gives the same friendly "not found". No auto-polling; a manual
refresh is enough. **Done when** an expired pending booking shows `EXPIRED` after refresh.

**Shipped (`feat/c7-booking-status`):**

- `/booking/status` is a manual code-entry page. The code lives only in component state;
  it is never added to the address, a route param or a link. Links from the booking page,
  success screen and footer open the empty lookup form rather than pre-filling a code.
- A lookup is an explicit action: submit or "Refresh status". There is no polling and no
  cached status query. The route is lazy-loaded like `/booking`.
- The result shows the server's code, status, rental dates and day count, delivery or
  collection address, package lines with included items, extra equipment, notes, server
  totals, hold expiry and the masked customer phone. No money is recalculated client-side.
- Status copy and badge cover `PENDING`, `CONFIRMED`, `REJECTED`, `CANCELLED`, `COMPLETED`
  and `EXPIRED`. A pending request shows its hold deadline; an expired request shows the
  expired notice and no amount due.
- Unknown and malformed codes share one friendly not-found panel. `429` explains the wait,
  other failures use the shared retry surface, and a failed refresh leaves the form usable.
- `GET /api/bookings/:code` performs lazy expiry, so forcing a pending hold into the past
  and refreshing moves the booking to `EXPIRED` without a separate job.
- Added Vitest + jsdom and Testing Library to the client. The first component test forces a
  `429 RATE_LIMITED` lookup, asserts the wait copy and error code, confirms the request is
  not retried, and verifies submit stays disabled for the retry window.

### C8 — Admin login and guard — `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`, `POST /api/auth/password`

Login form with inline 401 and 429 handling; `me` on boot decides guarded routes; guard
redirects unauthenticated users to `/admin/login` and returns them to the attempted page.
Logout clears the query cache. Password change available from the admin area.
**Done when** a hard reload on `/admin/dashboard` with no cookie lands on login, and
logging in returns to the intended page.

**Shipped (`feat/c8-admin-auth`):**

- `/admin/login` sits outside the admin shell. It validates with a local zod schema,
  normalises the email, offers password visibility, and shows inline 401 (invalid
  credentials) and 429 (login throttled) messages without exposing a raw error code.
- `GET /api/auth/me` is the boot query for guarded routes. `RequireAdmin` shows a session
  loader while it resolves, redirects any 401 to login with the attempted location in
  router state, and shows a retry state for network/server failures instead of treating
  them as a sign-out.
- Successful login seeds the `admin/me` query from the login response, so the guard does
  not refetch or flash a redirect. The login page returns to the guarded admin URL stored
  by the guard, with an allow-list limited to `/admin` paths.
- `AdminLayout` is now the authenticated shell: responsive Dashboard and Settings nav,
  current operator, role, public-site link and sign-out. Sign-out calls the API, clears the
  whole React Query cache through `clearSession`, and lands on login. A 401 during sign-out
  still clears the client state.
- `/admin/settings` shows the signed-in account and changes the password. Local validation
  enforces the 8-character minimum, uppercase/lowercase/number requirements and
  confirmation match; a wrong current password uses the server message; success clears the
  fields and confirms with a toast. A 401 clears the session and returns to login.
- Login and settings are lazy-loaded so the public bundle does not pay for the admin form
  code. The dashboard is now an authenticated placeholder with account/settings shortcuts.
- `/admin/reset-password#token=...` sits outside the admin guard. The token is read from
  the URL fragment so it never reaches server logs, the form enforces the password policy
  and matching confirmation, and success explains that old sessions were signed out. A
  missing, expired or reused link shows a recovery message. Login links users to the
  server-assisted recovery path.
- Added four component tests covering inline 401, inline 429, return-to-attempted-page and
  the unauthenticated guard redirect.

### C9 — Admin catalogue CRUD — `/api/admin/categories`, `/api/admin/equipment`, `/api/admin/packages`, `/api/admin/offers`, `/api/admin/transport-providers`

Table + create/edit forms for each entity, inventory setter, package item editor, offer
editor. Deactivation (equipment delete = deactivate) must be presented as deactivation, not
deletion. Handle `409` (in use) with the server message. **Done when** a newly created
equipment item appears on the public catalogue without a rebuild.

**Shipped (`feat/c9-admin-catalogue`):**

- Added `/admin/catalogue` as a lazy-loaded admin route with five tabs: Equipment,
  Packages, Offers, Categories and Transport. The active tab lives in `?tab=`, so reload
  and shared links reopen the same section. Catalogue joins Dashboard and Settings in the
  responsive admin nav.
- Equipment: table with price, stock, status and category, create/edit form, inventory
  setter, and deactivate/reactivate. Deactivation is labelled as hiding the item, never as
  deletion, and existing bookings keep their records. Duplicate slugs surface the server's
  `409` message.
- Packages: table of bundle price and included items, create/edit form, and a package item
  editor that replaces the whole item set after saving. Per-package pricing is stated in
  the UI; guest-count fields are not introduced. Packages are deactivated with the active
  toggle; delete is offered only with a warning that booked packages are kept and must be
  deactivated instead.
- Offers: create/edit form with percentage or fixed discount, scope, optional equipment or
  package target, code, start/end window and active flag. The form mirrors the server's
  percentage, target and date-window rules. Delete is explicit.
- Categories: table showing parent and active equipment count, create/edit form, parent
  selection on create, and delete. A category that still contains equipment shows the
  server's `409` message. The parent is fixed after creation because the API has no clear
  operation for an existing parent.
- Transport providers: create/edit/delete with phone, service area, notes and active flag.
  A duplicate phone shows the server's `409` message.
- Every mutation invalidates both its admin query and the public catalogue, packages,
  offers and categories keys, so a saved change appears on the public site without a
  rebuild or manual reload. Server errors are shown verbatim in the form or confirmation
  dialog.
- Added shared catalogue dialog, field, toggle, status, empty and confirm components so
  the five tables keep one visual and accessibility pattern.
- Added four focused component tests covering empty equipment validation, the equipment
  slug-conflict state (server message, retained values and outgoing payload), duplicate
  equipment lines in a package, and the required target when an offer applies to one item.

**Verified:**

- `npm run typecheck` passed for client and server.
- `npm test --workspace client` passed: 9 tests, including the four C9 form tests.
- `npm run build --workspace client` passed. Admin catalogue is a 76.37 kB / 18.60 kB gzip
  lazy chunk; the main bundle remains 472.23 kB / 138.38 kB gzip.
- Live API pass against the local server: created a category and equipment item, confirmed
  it in the public equipment list, updated its name/price/stock, created a package and
  confirmed it publicly, updated it, created/updated an offer, created/updated/deleted a
  transport provider, tested duplicate slug and duplicate phone `409`s, tested the category
  in-use `409`, then deactivated the equipment and confirmed it returned `404` publicly.
- Browser pass against the production build: `/admin/catalogue` loaded all five tabs with
  no console errors, every edit dialog opened, the transport provider form showed inline
  validation and successfully created a provider through the UI, and the temporary records
  were removed afterwards.
- No horizontal page overflow at 1440 px or 390 px; tables scroll inside their card on
  narrow screens.

### C10 — Admin booking board — `GET /api/admin/bookings`, `GET /api/admin/bookings/:id`, `PATCH .../status`, `PATCH .../transport`, `POST .../availability`

Filterable list (status, date overlap, search, pagination) with counts; detail view with
customer, items, history; approve/reject/cancel/complete actions with reason; transport
charge editor; re-check availability before confirming. Only offer transitions the server
allows; show `409 INVALID_TRANSITION` when it disagrees. **Done when** every action's
result is reflected without a manual reload and stock messages match the server.

**Shipped (`feat/c10-admin-bookings`):**

- Added `/admin/bookings` as a lazy-loaded board with status, rental-date overlap and free
  text filters in the URL. Search is debounced into the URL; status and date changes reset
  the page; reload, back/forward and shared links restore the same view.
- Status pills show counts for every status using the current date and search filters, plus
  an all-bookings total. The list shows the server's total with 20 bookings per page and
  keeps the previous page visible while the next one loads.
- The table shows code, customer, rental dates, days, status, payment status, total, paid
  amount, fulfilment method, hold expiry and a direct detail link. Loading, empty, filtered
  empty, page-past-the-end and error-with-retry states are distinct.
- Added `/admin/bookings/:id` with customer contact, rental and fulfilment details, package
  and equipment lines, notes, special requests, server totals, payment summary, hold state,
  milestones and status history.
- Status actions are limited to the server's transition table: pending can be confirmed,
  rejected or cancelled; confirmed can be completed or cancelled. Closed states show no
  actions. Rejecting or cancelling requires a reason; completion accepts an optional note.
- Confirming runs `POST /api/admin/bookings/:id/availability` first. The dialog shows a
  fresh available result or the server's shortage list; confirmation is disabled while the
  stock is short. The server still re-checks inside the transaction.
- A `409 INVALID_TRANSITION` from a concurrent update is shown in the action dialog with
  the server's message and code; the dialog stays open and the page keeps its data.
- Added a transport charge editor for pending and confirmed bookings. It sends only the
  charge; the server recalculates the booking total, and the detail cache updates from the
  response.
- Successful status and transport changes update the detail query, invalidate the list,
  status counts and dashboard cache, and confirm with a toast. No manual reload is needed.
- Added three focused component tests covering a blocked confirmation with stock
  shortfalls, the required cancellation reason, and the `409 INVALID_TRANSITION` state.

**Verified:**

- `npm run typecheck` passed for client and server.
- `npm test --workspace client` passed: 12 tests, including the three C10 action tests.
- `npm run build --workspace client` passed. The booking list is a 12.49 kB / 4.27 kB gzip
  chunk and the detail page 24.91 kB / 6.64 kB gzip; the main bundle remains
  473.41 kB / 138.66 kB gzip.
- Seeded four real bookings through the public API: two pending, one confirmed and one
  cancelled. Confirmed the count totals, the pending filter URL, the list rendering and
  direct detail links.
- Browser pass against the production build: confirmed a pending booking after the fresh
  stock check, updated its transport charge and saw the server's new total, cancelled it
  with a reason, and verified the history and actions updated without a reload.
- Simulated a concurrent cancellation on a pending booking, then confirmed from the stale
  page: the dialog showed `INVALID_TRANSITION` and the server message.
- No console errors and no horizontal page overflow at 1440 px or 390 px. Wide tables scroll
  inside their card on mobile.
- Temporary bookings and customers were removed afterwards; the database returned to zero
  bookings, customers, payments and stock holds.

### C11 — Payments and dashboard — `/api/admin/bookings/:id/payments`, `PATCH/DELETE /api/admin/payments/:id`, `GET /api/admin/dashboard`

Payment list with running total and balance, record/edit/delete payment (method, reference,
date, notes), and a dashboard of the summary numbers the API returns. Never compute the
balance client-side for display of record — show the server's `paidAmount`/`amountDue`.
**Done when** the dashboard numbers match a direct API call for the same period.

**Shipped (`feat/c11-payments-dashboard`):**

- Added a payments panel to the booking detail page with the payment history, method,
  status, reference, recorded-by and paid/recorded date. The running total, amount due and
  payment status all come from the server's `meta.booking`; the panel never recalculates a
  balance locally.
- The payment history is a table on wide screens and a stacked card list below `lg`, so
  every reference, note and action stays visible on phones and tablets without sideways
  scrolling. The balance summary is a compact three-column strip on mobile.
- Recording a payment opens a focused dialog with amount, method, paid date, reference and
  note. Cash defaults with the current local date-time, so a cash payment records as paid.
  Cash, M-Pesa and bank transfers settle immediately when a paid date is supplied;
  manual/other methods start pending. Validation mirrors the server and server errors stay
  in the dialog.
- Payments can be updated from the row: status (`PAID`/`FAILED`), reference and paid date.
  Amount and method remain read-only. Leaving the paid date blank keeps the existing date,
  and marking a payment paid fills an empty date server-side.
- Delete is offered only while the booking is pending, matching the server rule, and asks
  for confirmation. The dialog explains the amount being removed and shows server errors
  such as `409`.
- Every paid payment has a receipt action, and recording a paid deposit opens its receipt
  automatically. The receipt shows the business contact details, a stable receipt number,
  customer, payment method/reference/date, rental period, booking total, paid-to-date and
  balance due. Print / save PDF uses a body-level print copy and `@media print` so it
  prints as a single A4 page with no admin chrome.
- Successful record/edit/delete responses update the booking detail cache from the
  server's summary, then invalidate the payment list, booking lists, status counts and
  dashboard. The new balance appears without a manual reload and a toast confirms the
  change.
- Rebuilt `/admin/dashboard` around `GET /api/admin/dashboard`: pending requests, bookings
  confirmed this month, completed jobs, collected all-time and this month, outstanding
  revenue, the five upcoming confirmed jobs and low-stock equipment for the seven-day
  horizon. Every figure and money string is rendered as returned by the API.
- The dashboard has refresh, loading, error-with-retry, empty-upcoming and healthy-stock
  states. Metric cards link to the filtered booking board, upcoming rows open the booking
  detail, and low stock links to catalogue management.
- Added six focused component tests: three for server-owned payment totals, the record
  POST payload and pending-only delete; one for opening and printing a receipt; two for
  the dashboard figures, empty states, upcoming jobs and low stock.

**Verified:**

- `npm run typecheck` passed for client and server.
- `npm test --workspace client` passed: 18 tests, including the six C11 tests.
- `npm run build --workspace client` passed. The booking detail chunk is 49.61 kB / 11.73 kB
  gzip and the main bundle is 577.52 kB / 168.63 kB gzip. The existing zod comment warning
  and the main-chunk size warning remain non-fatal.
- Seeded two real bookings through the public API, confirmed one, and recorded two
  payments through the admin API. The dashboard rendered exactly the API's figures:
  `{ pending: 1, confirmedThisMonth: 1, completed: 0 }`, collected `1,500.00`, this month
  `1,500.00`, outstanding `2,600.00`, upcoming `PP-LSFQGY` and no low-stock rows.
- Browser pass against the production build on the pending booking: recorded a KES 250
  cash payment, saw paid-to-date and amount due update from the server, edited it to
  failed and saw the balance revert, then deleted it. Each change completed without a
  reload, with the server's summary reflected in the page.
- Opened a paid receipt at 1440 px and 390 px and printed it through Chrome to PDF. The
  PDF is one A4 page and contains only the receipt, with the business details, customer,
  M-Pesa reference and server balance all visible. Mobile balance rows stack instead of
  truncating, and the print action stays fixed at the bottom of the scrolling preview.
- No application console errors; the only browser-log entry was the missing favicon
  `404`. No horizontal page overflow at 1440 px or 390 px. The desktop payment table fits
  its card without sideways scrolling, and the mobile card layout keeps every field and
  action visible.
- Temporary bookings, customers and payments were removed afterwards; the database
  returned to zero bookings, customers, payments, stock holds and status-history rows.

---

## 5. Conventions for every slice

- **File layout:** `src/pages/<area>/<Name>Page.tsx`, `src/components/<feature>/*`,
  `src/lib/*`, `src/hooks/*`. One feature folder per domain (bookings, catalogue, admin).
- **Data:** one hook per query/mutation in `src/hooks/`, colocated with its feature. Pages
  do not call `apiFetch` directly.
- **Validation:** forms validate with `zod` schemas that mirror the server's
  (`server/src/schemas/*`), duplicated deliberately — the server always wins, so a client
  schema is a UX aid, never a security control.
- **Money:** render only through `formatMoney`; arithmetic only on integer minor units and
  only for previews clearly labelled as estimates.
- **Dates:** calendar strings throughout; no `new Date("YYYY-MM-DD")` parsing (timezone
  shifts a day), no `toISOString().slice(0,10)` on a local Date.
- **Async UI:** every data view has loading, empty, error-with-retry and success states. A
  failed admin action keeps the form values and shows the server message.
- **Toasts:** one surface, `toast` from `lib/toast`, mounted once in `AppProviders`. Use a
  toast to confirm an action that finished (saved, sent, cancelled) and for failures that
  happen outside a form. Field validation stays inline next to the input; a view that could
  not load uses `ErrorState`. One toast per action: the title says what happened, the
  description carries the server's wording, and no toast says only "Success!".
- **Palette:** sky blue (`brand-*`), baby pink (`blush-*`) and white, defined once in
  `src/index.css`. Sky blue carries primary actions, links and focus; baby pink is an accent
  only. Use the tokens, never raw hex or the old indigo classes.
- **Accessibility:** labels tied to inputs, focus visible, dialogs trap focus, status
  changes announced.
- **No new global state library:** React Query owns server state; local state covers the rest.

---

## 6. Verification per slice

Minimum, matching how the backend was done:

1. `npm run typecheck` (root, covers client + server).
2. `npm test --workspace client` (Vitest + jsdom). Current coverage is the C7 lookup
   `429` state plus the C8 login and guard flows; add focused component tests where a
   state is hard to reproduce manually.
3. `npm run build` for the client.
4. Manual pass of the slice's happy path and its documented error states against the local
   API (`docker compose up -d db`, `npm run dev:server`, `npm run dev:client`).

Broader client flow or end-to-end coverage remains a separate decision; the client runner
is for focused component tests, not a requirement to test every routine edit.

---

## 7. Product decisions (settled 15 November 2026)

These were open questions; they are now decided so the UI copy and navigation can be
finalised. Each can still be revisited, but the client work proceeds on these defaults.

| # | Question | Decision | Consequence for the client |
|---|---|---|---|
| 1 | Guest count is not captured by the API (deferred D5) | **Omit it.** Do not ask for or validate a party size anywhere in the booking flow. | Package cards show name, included items and price only; no "suits X–Y guests" badge, even if the catalogue stores `minQuantity`/`maxQuantity`. |
| 2 | Offers cannot be redeemed | **Promotional-only.** The offers page stays, but every offer is labelled as a promotion with its validity dates and has no redeem/apply/discount CTA. | No coupon field on the booking form; no price line that implies a discount was applied. |
| 3 | No online payment | **Pending-request wording only.** The success screen says the request was received and is pending owner confirmation; no "pay now" or payment method selector. | Booking success copy: reference code, hold expiry, "we will confirm by phone or WhatsApp". |
| 4 | Booking code is the only credential | **Manual entry only.** The status page is reached by typing the code; the code is never put in a shareable URL or query string. | Route is `/booking/status` with a code field; no `/booking/status/:code` route and no code in links. |
| 5 | Images are URLs with no upload | **Owner hosts externally** (any public URL, e.g. Cloudinary or a shared drive); the admin form accepts a URL and the public page renders it with a neutral fallback when it fails to load. | Admin equipment/package forms have an `imageUrl` text field plus help text "paste a public image URL"; public cards use `onError` fallback. |
| 6 | Are "Offers" and package detail premature? | **Keep both.** Offers page ships as a promotions list; package detail page ships showing included items and price. | Full navigation (`Home, Equipment, Packages, Offers, Booking, Contact`) ships at launch. |

---

## 8. Definition of done for milestone C

- Every public page reads the live API; no placeholder copy or mock arrays remain.
- Every admin screen performs its operation against the API and reflects the result.
- Prices, availability, statuses and totals shown always originate from the server.
- Loading, empty, error and success states exist on every data view.
- `npm run typecheck` and `npm run build` are clean, and the manual pass in §6 has been
  done for each slice.
