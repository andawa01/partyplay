# PartyPlay — Git Workflow

**Version:** 1.0
**Date:** 13 November 2026
**Applies to:** the whole repository

This is deliberately not git-flow. There is one deployable application, a short
feature sequence, and no release branches. The goal is a `main` that always works and a
history that reads like the ledger in `docs/build-plan.md` §12.

---

## 1. The model

- **`main` is always working.** It is the branch that gets deployed.
- **Every feature gets a short-lived branch** cut from `main`, merged back when done.
- **One feature per branch**, sized by `docs/build-plan.md`. If a branch grows a second
  feature, that is a signal to split it, not to rename it.
- **Squash-merge into `main`.** One finished feature = one commit, so `git log` on `main`
  lists features rather than forty work-in-progress steps.
- **Delete the branch after merging.** Branches are scaffolding, not records.

```
main ──●──────────────●──────────────●──────────────●──▶
        \            / \            / \            /
         ●─feat/f1──●   ●─feat/f2──●   ●─feat/f3──●
```

---

## 2. Branch names

| Type | Pattern | Example |
|---|---|---|
| Feature (backend) | `feat/f<n>-<slug>` | `feat/f1-platform-foundation` |
| Feature (client slice) | `feat/c<n>-<slug>` | `feat/c6-booking-form` |
| Bug fix | `fix/<slug>` | `fix/hold-expiry-off-by-one` |
| Docs / tooling | `chore/<slug>` | `chore/git-workflow` |

Slug is lowercase kebab-case, matching the ledger. `<n>` is the feature number from
`docs/build-plan.md`, so the branch says exactly which planned item it finishes.

---

## 3. Commit messages

Match the style already in the repository:

```
Add Phase 2.2 database design, inventory rules and DB hardening

Package contents are normalized into BookingPackageItem rows instead of a JSON
snapshot so reserved units can be aggregated in SQL, and StockHold adds
temporary reservations so pending requests consume inventory only until their
hold window lapses.

- Add StockHold and StockHoldStatus
- Replace PackageBooking.itemsSnapshot with BookingPackageItem rows
```

**Rules**

1. **Subject:** imperative mood ("Add", "Fix", "Remove" — not "Added", "Adding"),
   under 72 characters, no trailing period.
2. **Body:** explain **why**, not what. The diff already says what changed.
3. **Bullets** for the notable pieces when the body would otherwise ramble.
4. **Conventional Commits prefixes (`feat:`, `fix:`) are not used.** One branch is one
   feature and the squash commit is the feature, so the prefix adds nothing.
5. **No attribution trailers.** No `Co-Authored-By`, no "generated with" lines, no tool
   names in the message. Commits are authored by the person who commits them.
6. **Reference the feature** when it helps the reader: `Finish F6b: booking creation`.

Squash-merge commit message = the feature's ledger row, e.g.
`Add F1 platform foundation: error envelope, ApiError and date helpers`.

---

## 4. The cycle

Start a feature:

```bash
git switch main
git pull --rebase              # start from what is actually on the remote
git switch -c feat/f1-platform-foundation
```

Work, checking as you go (this is the same command CI runs):

```bash
npm run typecheck
```

Finish:

```bash
git add <paths>                # add paths, not -A, so stray files stay out
git commit                     # message per §3
git push -u origin feat/f1-platform-foundation
```

Merge, option A — pull request on GitHub (gets CI + the PR template checklist):

```bash
# open the PR, let the Typecheck job pass, then "Squash and merge"
git switch main
git pull
```

Merge, option B — locally, same result without GitHub:

```bash
git switch main
git pull
git merge --squash feat/f1-platform-foundation
git commit                     # write the squash message per §3
git push
git branch -d feat/f1-platform-foundation
```

Never merge a feature with `git merge` (a real merge commit). Squash is the convention;
a merge commit makes `main` history depend on how many intermediate commits a branch
happened to have.

---

## 5. Migrations

The database rules that matter, all of them learned the hard way in Phase 2.2:

1. **Never edit an applied migration.** Fix forward with a new one. Applied migrations are
   checksummed by Prisma; editing one makes every checkout disagree with the database.
2. **One migration per feature where possible**, named for the change:
   `npx prisma migrate dev --name booking_domain_fixes`.
3. **Schema changes are declared in `schema.prisma` first**, then migrated. Do not hand-
   edit the SQL Prisma generates.
4. **Exception: CHECK constraints.** Prisma cannot express them, so use
   `--create-only` and append the SQL by hand (see `docs/database-spec.md` §4). They will
   not appear in `schema.prisma` and that is expected.
5. **Verify no drift after a manual edit:**
   ```bash
   cd server && npx prisma migrate diff --from-schema-datasource prisma/schema.prisma \
     --to-schema-datamodel prisma/schema.prisma --script
   ```
   It must print "This is an empty migration."
6. **Migrations are part of the feature**, committed on the same branch. A feature that
   changes the schema without its migration is not finished.
7. **Never commit `.env`.** `.env.example` gets the new key, never the value.

---

## 6. Merge checklist

The single source of truth is `docs/build-plan.md` §1 (Definition of Done). The short
version, which is also what the PR template asks:

- [ ] Typecheck passes (CI enforces this)
- [ ] The feature's verification recipe from build-plan §10 was actually run, with its
      result recorded in the PR description
- [ ] Route -> middleware -> controller -> service -> db is intact (no `db` in a
      controller, no `req` in a service)
- [ ] Errors use the standard envelope and status codes
- [ ] Schema change has its migration **and** a `database-spec.md` update
- [ ] Ledger row in build-plan §12 ticked
- [ ] New env var documented in `server/.env.example`

---

## 7. What not to do

- Commit directly to `main`.
- Force-push `main`.
- Put two features on one branch because they were "nearby".
- Add `node_modules`, `dist`, `.env` or build artifacts — check `git status` before `add`.
- Rewrite or amend a commit that is already pushed, unless it is your own branch and
  nobody has pulled it.
- Leave a merged branch lying around, or a branch that was abandoned without deletion.

---

## 8. CI

`.github/workflows/ci.yml` runs on pushes to `main`, `feat/**`, `fix/**`, `chore/**` and on
pull requests into `main`. Two independent jobs, both on Node 22, both under a minute:

**`Typecheck`** — no database

1. `npm ci`
2. `npx prisma generate`
3. `npm run typecheck` (client then server)

**`Migrations apply from empty`** — `postgres:17-alpine` service container, database
starting with zero tables

1. `npx prisma migrate deploy` — every migration, in order, from nothing
2. `npx prisma migrate status` — must report the schema is up to date
3. `npx prisma migrate diff --exit-code` — must report no difference between the migrated
   database and `schema.prisma` (exits non-zero when they diverge)

Why the empty database matters: a hand-edited migration can succeed locally only because
the object already existed. Applying from nothing is the only honest test of it, and it is
the step that would have caught a broken CHECK-constraint migration before it reached you.
The drift step catches the opposite failure — an applied migration whose result no longer
matches the Prisma schema.

Still **not** run in CI: tests. The suite starts at F6a (pricing); the workflow gains
`npm test --workspace server` then.

**Branch protection cannot be set from a file.** To make `main` truly un-pushable, turn on
in GitHub → Settings → Branches: require a pull request before merging, and require both
the `Typecheck` and `Migrations apply from empty` checks to pass. That is a one-time click
and only you can do it.

---

## 9. Not adopted (on purpose)

| Practice | Why not |
|---|---|
| Git-flow (`develop`, `release/*`, `hotfix/*`) | One app, one environment, continuous delivery of features |
| Conventional Commits | The squash commit already is the feature; prefixes are noise here |
| Release tags / changelogs | Revisit at launch, when there is something to version |
| Signed commits | Useful, but a per-machine setup step; add it if you want the assurance |
| Commit-per-file splitting | Feature branches already isolate the unit of review |
