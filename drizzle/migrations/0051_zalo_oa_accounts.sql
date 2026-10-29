CREATE TABLE public.zalo_oa_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  oa_id text NOT NULL UNIQUE,
  name text NOT NULL DEFAULT '',
  avatar_url text,
  project_id uuid,
  app_id text NOT NULL,
  webhook_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','connected','expired','webhook_error','paused','disconnected')),
  app_secret_ct text, app_secret_iv text,
  access_token_ct text, access_token_iv text,
  refresh_token_ct text, refresh_token_iv text,
  token_expires_at timestamptz,
  refresh_expires_at timestamptz,
  refresh_lock_until timestamptz,
  oauth_state text, oauth_verifier_ct text, oauth_verifier_iv text, oauth_expires_at timestamptz,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_webhook_at timestamptz,
  last_error text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX zalo_oa_accounts_tenant_idx ON public.zalo_oa_accounts(tenant_id);
CREATE INDEX zalo_oa_accounts_refresh_idx ON public.zalo_oa_accounts(token_expires_at) WHERE status IN ('connected','paused');
GRANT ALL ON public.zalo_oa_accounts TO service_role;
ALTER TABLE public.zalo_oa_accounts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.zalo_webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  oa_account_id uuid NOT NULL REFERENCES public.zalo_oa_accounts(id) ON DELETE CASCADE,
  event_name text NOT NULL DEFAULT '',
  ok boolean NOT NULL,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX zalo_webhook_logs_account_idx ON public.zalo_webhook_logs(oa_account_id, created_at DESC);
GRANT ALL ON public.zalo_webhook_logs TO service_role;
ALTER TABLE public.zalo_webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.zalo_oa_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  oa_account_id uuid,
  actor_user_id uuid,
  action text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.zalo_oa_audit TO service_role;
ALTER TABLE public.zalo_oa_audit ENABLE ROW LEVEL SECURITY;

-- Khóa làm mới token theo OA: chỉ một tiến trình giành được trong khoảng lock.
CREATE OR REPLACE FUNCTION public.claim_zalo_token_refresh(p_account uuid, p_seconds int DEFAULT 60)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  UPDATE public.zalo_oa_accounts SET refresh_lock_until = now() + make_interval(secs => p_seconds)
   WHERE id = p_account AND (refresh_lock_until IS NULL OR refresh_lock_until < now());
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n = 1;
END $$;
REVOKE ALL ON FUNCTION public.claim_zalo_token_refresh(uuid,int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_zalo_token_refresh(uuid,int) TO service_role;