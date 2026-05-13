#!/usr/bin/env bash
# Export a single tenant's data (rows + files) for migration / GDPR / handoff.
# Output: tenant-<id>-<ts>.tar.gz containing data.json + files/
set -euo pipefail
TENANT_ID="${1:?usage: export-tenant.sh <tenant_uuid>}"
TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT="/tmp/tenant-$TENANT_ID-$TS"
mkdir -p "$OUT/files"

TABLES=(
  tenants user_roles teams team_members invitations
  cards card_blocks card_projects card_templates
  projects brochures customers leads
  pipeline_stages pipeline_deals
  ai_followups ai_lead_scores
  campaigns settings audit_logs
  dynamic_qr_codes wallet_cards nfc_short_codes
)

echo "{" > "$OUT/data.json"
first=1
for t in "${TABLES[@]}"; do
  [[ $first -eq 0 ]] && echo "," >> "$OUT/data.json"
  first=0
  printf '"%s":' "$t" >> "$OUT/data.json"
  psql "$DATABASE_URL" -tAc \
    "SELECT COALESCE(json_agg(row_to_json(x)),'[]'::json)
       FROM public.$t x
      WHERE tenant_id = '$TENANT_ID'" >> "$OUT/data.json"
done
echo "}" >> "$OUT/data.json"

echo "→ syncing files for tenant"
aws --endpoint-url "${S3_ENDPOINT}" \
    s3 sync "s3://${STORAGE_BUCKET}/tenants/$TENANT_ID/" "$OUT/files/"

tar -C /tmp -czf "tenant-$TENANT_ID-$TS.tar.gz" "$(basename "$OUT")"
rm -rf "$OUT"
echo "✓ Exported to tenant-$TENANT_ID-$TS.tar.gz"
