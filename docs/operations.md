# PartyPlay — Operations Runbook

**Scope:** the production compose stack in `docker-compose.prod.yml`.
**Added by:** O1 operations package.

The compose stack starts Postgres, applies migrations, runs the API and sweep job, serves
the built client through Caddy, and takes a nightly database dump.

---

## 1. What runs

| Service | Purpose |
|---|---|
| `db` | PostgreSQL 17. Not published to the host. |
| `migrate` | One-shot `prisma migrate deploy`; the API waits for it to succeed. |
| `api` | Express API on the internal network, with graceful shutdown and request logs. |
| `sweeper` | Runs the hold-expiry job every `HOLD_SWEEP_INTERVAL_MINUTES` minutes. |
| `backup` | `pg_dump` once on start and every `BACKUP_INTERVAL_SECONDS`; keeps 14 days by default. |
| `web` | Caddy serving the built React app and proxying `/api/*` to `api`. |

Only Caddy publishes ports `80` and `443`. Postgres and the API stay on the internal
Compose network. Database and backup data live in named volumes.

---

## 2. First deploy

Prerequisites:

- A host with Docker and the Compose plugin.
- DNS `A`/`AAAA` records for `DOMAIN` pointing at the host.
- Inbound TCP `80` and `443` open. Caddy obtains and renews the TLS certificate.
- Cloudinary and Resend credentials if those features are used.

```bash
cp .env.production.example .env.production
# Edit .env.production: DOMAIN, APP_ORIGIN, POSTGRES_PASSWORD, JWT_SECRET,
# Cloudinary, Resend and owner account values.

docker compose --env-file .env.production -f docker-compose.prod.yml build
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

Check the stack:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
curl "https://$DOMAIN/api/health"
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f api
```

Create the first owner account after migrations have run:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml \
  run --rm api npm --prefix server run admin:create:prod
```

The command is idempotent. Rerunning it never overwrites an existing password.

---

## 3. Releases and migrations

The `migrate` service runs before the API on every `up`. A failed migration stops the API
from starting.

```bash
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml build
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

Expected sequence:

1. Build the new images.
2. `migrate` applies pending migrations.
3. `api` and `sweeper` are recreated and receive `SIGTERM`.
4. The old API drains in-flight requests, then disconnects Prisma.

Take a fresh backup before a risky migration:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml \
  exec backup sh /usr/local/bin/backup-db.sh --once
```

See §5 for the backup location and restore procedure.

---

## 4. Graceful shutdown and sweep job

The API handles `SIGTERM` and `SIGINT`:

- Stops accepting new connections.
- Waits for in-flight responses to finish.
- Disconnects Prisma.
- Exits, or is forced down after `SHUTDOWN_TIMEOUT_MS` (default 10 seconds).

Compose allows 30 seconds for this (`stop_grace_period`).

The sweeper logs one line per pass:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f sweeper
```

It skips a pass rather than overlapping a previous sweep, and exits cleanly on
`SIGTERM`. Run one pass manually with:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml \
  run --rm sweeper node server/dist/jobs/expire-holds.js --once
```

---

## 5. Backups

The `backup` service writes compressed custom-format dumps into the `pgbackups` volume:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml \
  exec backup ls -lh /backups
```

Copy a dump to the host:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml \
  cp backup:/backups/partyplay-YYYYMMDDTHHMMSSZ.dump ./partyplay.dump
```

The backup service waits for migrations before its first dump and refuses to dump a
database where `_prisma_migrations` does not exist, so a first boot cannot silently write
an empty backup.

Defaults: every 24 hours, retain 14 days. Change them in `.env.production`.

**This is an on-host backup.** It protects against a bad migration or deleted rows, not
against losing the whole host or volume. Copy dumps to off-site storage as a separate
operational step until an off-site backup job exists.

Never run `docker compose down -v`: that deletes `pgdata` and `pgbackups`.

### Restore a dump

Copy the dump into the backup volume, stop the writers and the backup loop, then restore:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml \
  cp ./partyplay.dump backup:/backups/restore.dump

docker compose --env-file .env.production -f docker-compose.prod.yml \
  stop api sweeper backup

docker compose --env-file .env.production -f docker-compose.prod.yml \
  run --rm --entrypoint pg_restore backup \
  --host=db --username=partyplay --dbname=partyplay \
  --clean --if-exists --no-owner /backups/restore.dump

docker compose --env-file .env.production -f docker-compose.prod.yml \
  run --rm --entrypoint rm backup /backups/restore.dump

docker compose --env-file .env.production -f docker-compose.prod.yml start api sweeper backup
```

This restore was exercised into a disposable database during the O1 verification. Rehearse
it again on a non-production environment before relying on it for a real incident.

---

## 6. Logs and health

- Request log lines are JSON on the API container's stdout:
  `level`, `time`, `requestId`, `method`, `path`, `status`, `durationMs`.
- Query strings, bodies and cookies are not logged.
- Successful `/api/health` probes are omitted; failures are logged.
- Set `LOG_REQUESTS=false` to disable request logs.
- The API health check calls `SELECT 1`; a database outage returns `503`.

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f api
```

Docker logs are not durable. Configure the host's log rotation and an external error
tracker/uptime monitor before depending on this in production.

---

## 7. Still not covered

These remain in `docs/backend-gaps.md`:

- A staging environment.
- External error tracking and uptime alerting.
- Off-site backup storage.
- A full restore rehearsal in a staging environment.
