#!/usr/bin/env bash
# Restore from an encrypted backup archive produced by backup.sh.
set -euo pipefail
ARCHIVE="${1:?usage: restore.sh /path/to/backup.tar.gz.gpg}"
WORK=$(mktemp -d)
trap "rm -rf $WORK" EXIT

echo "→ decrypt"
gpg --batch --yes --decrypt --passphrase "$BACKUP_PASSPHRASE" "$ARCHIVE" \
  | tar -C "$WORK" -xzf -

DUMP=$(find "$WORK" -name db.dump | head -1)
FILES=$(find "$WORK" -type d -name files | head -1)

echo "→ restore Postgres (DROP + CREATE)"
psql "$DATABASE_URL" -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
pg_restore --no-owner --no-privileges --dbname "$DATABASE_URL" "$DUMP"

echo "→ restore object storage"
if [[ "${STORAGE_PROVIDER:-s3}" == "s3" ]]; then
  aws --endpoint-url "${S3_ENDPOINT:-https://s3.amazonaws.com}" \
      s3 sync "$FILES" "s3://${STORAGE_BUCKET}" --delete
else
  rsync -a --delete "$FILES/" "${STORAGE_LOCAL_PATH}/"
fi
echo "✓ Restore complete."
