# Data Export & Import (per tenant)

Two modes:

## A. Whole-platform migration
Use `backup.sh` + `restore.sh`. Moves everything (all tenants).

## B. Per-tenant export
For GDPR data-subject requests, customer offboarding, or migrating one
tenant between instances.

### Export
```bash
DATABASE_URL=… STORAGE_BUCKET=… S3_ENDPOINT=… \
deploy/scripts/export-tenant.sh <tenant_uuid>
# → tenant-<uuid>-<ts>.tar.gz
```

### Archive layout
```
tenant-<uuid>-<ts>/
  data.json              # all tenant rows, table → array
  files/
    cards/<id>/avatar.png
    brochures/<id>.pdf
    ...
  manifest.json          # tenant id, source instance, timestamp, schema_version
```

### `data.json` schema
```jsonc
{
  "tenants": [ { "id": "...", "name": "...", ... } ],
  "user_roles": [ ... ],
  "cards": [ ... ],
  "card_blocks": [ ... ],
  "projects": [ ... ],
  "leads": [ ... ],
  "pipeline_stages": [ ... ],
  "pipeline_deals": [ ... ],
  "ai_followups": [ ... ],
  "ai_lead_scores": [ ... ],
  "analytics_daily": [ ... ],
  // ... every tenant-scoped table in dependency order
}
```

### Import
```bash
DATABASE_URL=… deploy/scripts/import-tenant.sh tenant-<uuid>-<ts>.tar.gz
```
Rows insert with `ON CONFLICT DO NOTHING` so re-running is safe.
File paths preserve `tenants/<uuid>/...` prefix.

## Public REST endpoints
- `POST /api/public/admin/tenants/:id/export` — same as script, returns signed URL (admin token required)
- `POST /api/public/admin/tenants/import` — multipart upload of archive

Both require `X-Admin-Token: $ADMIN_API_TOKEN`.

## CSV exports for end users
The Team page already exports CSV. Each main entity (Leads, Deals, Projects)
should expose a "Export CSV" button calling a server function that streams
`text/csv` from a parameterized query, scoped by RLS.
