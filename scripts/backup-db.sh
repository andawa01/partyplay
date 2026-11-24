#!/bin/sh
set -eu

: "${PGHOST:=db}"
: "${PGPORT:=5432}"
: "${PGUSER:=partyplay}"
: "${PGDATABASE:=partyplay}"
: "${BACKUP_DIR:=/backups}"
: "${BACKUP_INTERVAL_SECONDS:=86400}"
: "${BACKUP_RETENTION_DAYS:=14}"

if [ -z "${PGPASSWORD:-}" ]; then
  echo "[backup] PGPASSWORD is required" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

once=0
if [ "${1:-}" = "--once" ]; then
  once=1
fi

stop=0
trap 'stop=1' INT TERM

log() {
  echo "[backup] $(date -u +%Y-%m-%dT%H:%M:%SZ) $*"
}

while [ "$stop" -eq 0 ]; do
  if ! psql --tuples-only --no-align \
    --command "SELECT to_regclass('public.\"_prisma_migrations\"') IS NOT NULL" | grep -qx 't'; then
    log "database has not been migrated; refusing to write a misleading backup" >&2
    exit 1
  fi

  stamp=$(date -u +%Y%m%dT%H%M%SZ)
  target="$BACKUP_DIR/partyplay-$stamp.dump"
  partial="$target.partial"

  log "starting dump of $PGDATABASE from $PGHOST"
  if pg_dump --format=custom --no-owner --no-privileges --file="$partial"; then
    mv "$partial" "$target"
    log "wrote $target"
  else
    rm -f "$partial"
    log "pg_dump failed" >&2
    exit 1
  fi

  # A failed delete must not stop future backups.
  find "$BACKUP_DIR" -type f -name 'partyplay-*.dump' -mtime +"$BACKUP_RETENTION_DAYS" -delete || true
  find "$BACKUP_DIR" -type f -name '*.partial' -mtime +1 -delete || true
  log "retaining dumps newer than $BACKUP_RETENTION_DAYS day(s)"

  if [ "$once" -eq 1 ]; then
    log "one-shot backup complete"
    exit 0
  fi

  remaining=$BACKUP_INTERVAL_SECONDS
  while [ "$remaining" -gt 0 ] && [ "$stop" -eq 0 ]; do
    chunk=60
    if [ "$remaining" -lt "$chunk" ]; then
      chunk=$remaining
    fi
    sleep "$chunk" &
    wait $! || true
    remaining=$((remaining - chunk))
  done
done

log "stopped"
