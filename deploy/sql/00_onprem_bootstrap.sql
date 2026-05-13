-- =============================================================================
-- ON-PREM COMPATIBILITY BOOTSTRAP (vanilla PostgreSQL only)
--
-- DO NOT run this on Supabase / Lovable Cloud — auth.uid(), auth.users, and
-- the storage schema already exist there.
--
-- Run this AFTER restoring your schema dump on a vanilla PostgreSQL 14+ host,
-- BEFORE starting the app, when AUTH_PROVIDER=custom or you are not using
-- self-hosted Supabase GoTrue.
--
-- Usage:
--   psql "$DATABASE_URL" -f deploy/sql/00_onprem_bootstrap.sql
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS citext;

-- 1. auth schema shim (only created if missing).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname='auth') THEN
    CREATE SCHEMA auth;
  END IF;
END$$;

-- 2. auth.uid() / auth.role() read JWT claims set by app via SET LOCAL.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), 'anon')
$$;

-- 3. Local users mirror.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='auth' AND c.relname='users'
  ) THEN
    CREATE TABLE auth.users (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email         citext UNIQUE,
      phone         text UNIQUE,
      password_hash text,
      email_confirmed_at timestamptz,
      created_at    timestamptz NOT NULL DEFAULT now(),
      updated_at    timestamptz NOT NULL DEFAULT now(),
      raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb
    );
  END IF;
END$$;

-- 4. Storage shim (no-op tables) so any code referencing storage.* parses.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname='storage') THEN
    CREATE SCHEMA storage;
    CREATE TABLE storage.buckets (
      id text PRIMARY KEY, name text NOT NULL, public boolean NOT NULL DEFAULT false
    );
    CREATE TABLE storage.objects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      bucket_id text NOT NULL REFERENCES storage.buckets(id),
      name text NOT NULL, owner uuid, metadata jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END$$;

-- 5. Migration tracker for deploy/scripts/migrate.sh
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
