#!/usr/bin/env bash
# Import a tenant export into the current instance (preserves UUIDs).
set -euo pipefail
ARCHIVE="${1:?usage: import-tenant.sh <export.tar.gz>}"
WORK=$(mktemp -d); trap "rm -rf $WORK" EXIT
tar -C "$WORK" -xzf "$ARCHIVE"
DATA=$(find "$WORK" -name data.json | head -1)
FILES=$(find "$WORK" -type d -name files | head -1)

echo "→ importing rows (per table, ON CONFLICT DO NOTHING)"
node deploy/scripts/import-tenant.mjs "$DATA"

echo "→ uploading files"
TENANT_ID=$(jq -r '.tenants[0].id' "$DATA")
aws --endpoint-url "${S3_ENDPOINT}" \
    s3 sync "$FILES/" "s3://${STORAGE_BUCKET}/tenants/$TENANT_ID/"
echo "✓ Tenant imported."
