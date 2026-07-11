
CREATE TABLE public.airdrop_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  card_id uuid,
  sender_id uuid,
  recipient_name text,
  device_name text NOT NULL,
  device_kind text NOT NULL DEFAULT 'phone',
  direction text NOT NULL DEFAULT 'sent',
  status text NOT NULL DEFAULT 'delivered',
  distance_m numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT airdrop_shares_direction_chk CHECK (direction IN ('sent','received')),
  CONSTRAINT airdrop_shares_status_chk CHECK (status IN ('pending','delivered','declined','canceled')),
  CONSTRAINT airdrop_shares_kind_chk CHECK (device_kind IN ('phone','tablet','laptop','watch'))
);

CREATE INDEX idx_airdrop_shares_tenant_time ON public.airdrop_shares (tenant_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.airdrop_shares TO authenticated;
GRANT ALL ON public.airdrop_shares TO service_role;

ALTER TABLE public.airdrop_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY airdrop_shares_select ON public.airdrop_shares
  FOR SELECT USING (private.is_tenant_member(tenant_id));

CREATE POLICY airdrop_shares_insert ON public.airdrop_shares
  FOR INSERT WITH CHECK (private.has_tenant_role_in(tenant_id, ARRAY['owner'::app_role,'admin'::app_role,'manager'::app_role,'agent'::app_role]));

CREATE POLICY airdrop_shares_update ON public.airdrop_shares
  FOR UPDATE USING (private.has_tenant_role_in(tenant_id, ARRAY['owner'::app_role,'admin'::app_role,'manager'::app_role,'agent'::app_role]))
  WITH CHECK (private.has_tenant_role_in(tenant_id, ARRAY['owner'::app_role,'admin'::app_role,'manager'::app_role,'agent'::app_role]));

CREATE POLICY airdrop_shares_delete ON public.airdrop_shares
  FOR DELETE USING (private.has_tenant_role_in(tenant_id, ARRAY['owner'::app_role,'admin'::app_role,'manager'::app_role,'agent'::app_role]));

CREATE TRIGGER trg_airdrop_shares_updated_at
  BEFORE UPDATE ON public.airdrop_shares
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
