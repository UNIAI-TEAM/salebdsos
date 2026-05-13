#!/usr/bin/env bash
# Nightly backup: Postgres dump + object storage sync, encrypted, rotated.
set -euo pipefail

: "${DATABASE_URL:?}"
: "${BACKUP_DIR:=/var/backups/unicom}"
: "${BACKUP_RETENTION_DAYS:=30}"
TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT="$BACKUP_DIR/$TS"
mkdir -p "$OUT"

echo "→ pg_dump"
pg_dump --format=custom --no-owner --no-privileges \
        --file="$OUT/db.dump" "$DATABASE_URL"

echo "→ object storage sync"
if [[ "${STORAGE_PROVIDER:-s3}" == "s3" ]]; then
  aws --endpoint-url "${S3_ENDPOINT:-https://s3.amazonaws.com}" \
      s3 sync "s3://${STORAGE_BUCKET}" "$OUT/files/"
else
  cp -r "${STORAGE_LOCAL_PATH:-/var/lib/unicom/files}" "$OUT/files"
fi

echo "→ archive + encrypt"
tar -C "$BACKUP_DIR" -czf - "$TS" \
  | gpg --batch --yes --symmetric --passphrase "$BACKUP_PASSPHRASE" \
        -o "$BACKUP_DIR/$TS.tar.gz.gpg"
rm -rf "$OUT"

echo "→ rotate (>$BACKUP_RETENTION_DAYS days)"
find "$BACKUP_DIR" -name "*.tar.gz.gpg" -mtime +$BACKUP_RETENTION_DAYS -delete

# Optional: ship to off-site
[[ -n "${BACKUP_REMOTE_S3:-}" ]] && \
  aws s3 cp "$BACKUP_DIR/$TS.tar.gz.gpg" "$BACKUP_REMOTE_S3/"

echo "✓ Backup $TS complete."
