#!/usr/bin/env bash
# Apply SQL migrations in lexicographic order. Idempotent via schema_migrations table.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL not set}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-supabase/migrations}"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
SQL

for f in $(ls "$MIGRATIONS_DIR" | sort); do
  version="${f%.sql}"
  applied=$(psql "$DATABASE_URL" -tAc "SELECT 1 FROM public.schema_migrations WHERE version='$version'")
  if [[ "$applied" == "1" ]]; then
    echo "✓ $version (skipped)"
    continue
  fi
  echo "→ Applying $f"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$MIGRATIONS_DIR/$f"
  psql "$DATABASE_URL" -c "INSERT INTO public.schema_migrations(version) VALUES('$version')"
done
echo "✓ All migrations applied."
