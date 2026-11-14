## What this changes

<!-- One or two sentences. Which feature from docs/build-plan.md §12 does this finish? -->

Feature: F

## Verification

<!-- Paste the recipe from docs/build-plan.md §10 that you ran, and its result. -->

- [ ] `npm run typecheck` passes
- [ ] The feature's verification recipe was run against the local database
- [ ] Layers respected: route -> middleware -> controller -> service -> db (no `db` in a
      controller, no `req` in a service)
- [ ] Error paths return the standard envelope with the right status code

## Schema

- [ ] No schema change
- [ ] Migration added (name): ``
- [ ] `docs/database-spec.md` updated for the change above
