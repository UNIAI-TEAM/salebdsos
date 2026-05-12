
-- ============================================================
-- 1. ENUMS
-- ============================================================
CREATE TYPE public.app_role AS ENUM ('owner','admin','manager','agent','viewer');
CREATE TYPE public.lead_status AS ENUM ('new','contacted','qualified','proposal','won','lost');
CREATE TYPE public.deal_status AS ENUM ('open','won','lost');

-- ============================================================
-- 2. TENANTS + PROFILES
-- ============================================================
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  plan text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_tenants_slug ON public.tenants(slug) WHERE deleted_at IS NULL;

CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY,
  email text,
  full_name text,
  avatar_url text,
  phone text,
  locale text DEFAULT 'vi',
  default_tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. RBAC (per-tenant)
-- ============================================================
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, role)
);
CREATE INDEX idx_user_roles_tenant_user ON public.user_roles(tenant_id, user_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);

-- Helpers (NO recursion: only touch user_roles)
CREATE OR REPLACE FUNCTION public.is_tenant_member(_tenant uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE tenant_id = _tenant AND user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.has_tenant_role(_tenant uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE tenant_id = _tenant AND user_id = auth.uid() AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.has_tenant_role_in(_tenant uuid, _roles public.app_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE tenant_id = _tenant AND user_id = auth.uid() AND role = ANY(_roles)
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_tenant_member(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.has_tenant_role(uuid, public.app_role) FROM public;
REVOKE EXECUTE ON FUNCTION public.has_tenant_role_in(uuid, public.app_role[]) FROM public;
GRANT EXECUTE ON FUNCTION public.is_tenant_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_tenant_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_tenant_role_in(uuid, public.app_role[]) TO authenticated;

-- ============================================================
-- 4. updated_at trigger fn (already exists as set_updated_at)
-- ============================================================
-- (re-create idempotent)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- ============================================================
-- 5. TEAMS
-- ============================================================
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_teams_tenant ON public.teams(tenant_id) WHERE deleted_at IS NULL;

CREATE TABLE public.team_members (
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  is_lead boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);
CREATE INDEX idx_team_members_user ON public.team_members(user_id);
CREATE INDEX idx_team_members_tenant ON public.team_members(tenant_id);

-- ============================================================
-- 6. CARDS (rename digital_cards → cards) + TEMPLATES + BLOCKS
-- ============================================================
ALTER TABLE public.digital_cards RENAME TO cards;
ALTER TABLE public.cards ADD COLUMN deleted_at timestamptz;
ALTER TABLE public.cards ADD COLUMN template_id uuid;
ALTER TABLE public.cards ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;
-- existing rows: none (fresh schema), so we can require tenant_id + owner
DELETE FROM public.cards WHERE tenant_id IS NULL OR owner_user_id IS NULL;
ALTER TABLE public.cards ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.cards ALTER COLUMN owner_user_id SET NOT NULL;
ALTER TABLE public.cards ADD CONSTRAINT cards_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_cards_tenant_published ON public.cards(tenant_id, is_published) WHERE deleted_at IS NULL;

CREATE TABLE public.card_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE, -- NULL = global preset
  name text NOT NULL,
  description text,
  preview_url text,
  theme jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_global boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_card_templates_tenant ON public.card_templates(tenant_id) WHERE deleted_at IS NULL;
ALTER TABLE public.cards ADD CONSTRAINT cards_template_fk FOREIGN KEY (template_id) REFERENCES public.card_templates(id) ON DELETE SET NULL;

CREATE TABLE public.card_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  block_type text NOT NULL,                  -- contact, link, video, gallery, brochure, project, ...
  position integer NOT NULL DEFAULT 0,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_card_blocks_card ON public.card_blocks(card_id, position) WHERE deleted_at IS NULL;
CREATE INDEX idx_card_blocks_tenant ON public.card_blocks(tenant_id);

-- ============================================================
-- 7. REAL ESTATE: projects + brochures
-- ============================================================
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text,
  developer text,
  location text,
  city text,
  status text DEFAULT 'selling',           -- selling, sold_out, upcoming
  price_from numeric(15,2),
  price_to numeric(15,2),
  currency text DEFAULT 'VND',
  description text,
  cover_url text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (tenant_id, slug)
);
CREATE INDEX idx_projects_tenant ON public.projects(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_tenant_status ON public.projects(tenant_id, status) WHERE deleted_at IS NULL;

CREATE TABLE public.brochures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  title text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  mime_type text,
  download_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_brochures_tenant ON public.brochures(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_brochures_project ON public.brochures(project_id) WHERE deleted_at IS NULL;

-- ============================================================
-- 8. CRM: leads + customers
-- ============================================================
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  owner_user_id uuid,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  card_id uuid REFERENCES public.cards(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  full_name text,
  email text,
  phone text,
  source text,                              -- nfc, qr, link, social, manual, import...
  status public.lead_status NOT NULL DEFAULT 'new',
  score integer DEFAULT 0,
  notes text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_leads_tenant_status ON public.leads(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_owner ON public.leads(tenant_id, owner_user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_phone ON public.leads(tenant_id, phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_email ON public.leads(tenant_id, email) WHERE deleted_at IS NULL;

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  owner_user_id uuid,
  full_name text NOT NULL,
  email text,
  phone text,
  company text,
  tags text[],
  notes text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_customers_tenant ON public.customers(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_phone ON public.customers(tenant_id, phone) WHERE deleted_at IS NULL;

-- ============================================================
-- 9. PIPELINE
-- ============================================================
CREATE TABLE public.pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  win_probability integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_pipeline_stages_tenant ON public.pipeline_stages(tenant_id, position) WHERE deleted_at IS NULL;

CREATE TABLE public.pipeline_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES public.pipeline_stages(id) ON DELETE RESTRICT,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  owner_user_id uuid,
  title text NOT NULL,
  value numeric(15,2) DEFAULT 0,
  currency text DEFAULT 'VND',
  status public.deal_status NOT NULL DEFAULT 'open',
  expected_close_date date,
  closed_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_deals_tenant_stage ON public.pipeline_deals(tenant_id, stage_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_deals_owner ON public.pipeline_deals(tenant_id, owner_user_id) WHERE deleted_at IS NULL;

-- ============================================================
-- 10. INTERACTION_EVENTS + ANALYTICS_DAILY (already exist, tighten tenant)
-- ============================================================
DELETE FROM public.interaction_events WHERE tenant_id IS NULL;
DELETE FROM public.analytics_daily WHERE tenant_id IS NULL;
ALTER TABLE public.interaction_events ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.interaction_events ADD CONSTRAINT events_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.analytics_daily ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.analytics_daily ADD CONSTRAINT analytics_daily_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- ============================================================
-- 11. AI
-- ============================================================
CREATE TABLE public.ai_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  prompt text,
  output text,
  channel text,                            -- email, sms, zalo, in_app
  model text,
  tokens integer,
  status text DEFAULT 'draft',             -- draft, sent, failed
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_ai_followups_tenant ON public.ai_followups(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ai_followups_lead ON public.ai_followups(lead_id);

CREATE TABLE public.ai_lead_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  score integer NOT NULL,
  factors jsonb NOT NULL DEFAULT '{}'::jsonb,
  model text,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id, computed_at)
);
CREATE INDEX idx_ai_scores_tenant_lead ON public.ai_lead_scores(tenant_id, lead_id);

-- ============================================================
-- 12. CAMPAIGNS
-- ============================================================
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  channel text NOT NULL,                   -- email, sms, zalo, push
  template jsonb NOT NULL DEFAULT '{}'::jsonb,
  audience jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',    -- draft, scheduled, running, paused, done
  scheduled_at timestamptz,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_campaigns_tenant_status ON public.campaigns(tenant_id, status) WHERE deleted_at IS NULL;

-- ============================================================
-- 13. DYNAMIC QR (mutable target, separate from nfc_short_codes)
-- ============================================================
CREATE TABLE public.dynamic_qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  short_code text NOT NULL UNIQUE,
  target_url text NOT NULL,
  label text,
  is_active boolean NOT NULL DEFAULT true,
  scan_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_dynamic_qr_tenant ON public.dynamic_qr_codes(tenant_id) WHERE deleted_at IS NULL;

-- ============================================================
-- 14. WALLET CARDS
-- ============================================================
CREATE TABLE public.wallet_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  platform text NOT NULL,                  -- apple, google
  serial_number text,
  pass_url text,
  install_count integer NOT NULL DEFAULT 0,
  last_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_wallet_cards_tenant ON public.wallet_cards(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_wallet_cards_card ON public.wallet_cards(card_id);

-- ============================================================
-- 15. AUDIT LOG (insert-only)
-- ============================================================
CREATE TABLE public.audit_logs (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  actor_user_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  diff jsonb,
  ip_hash text,
  user_agent text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_tenant_time ON public.audit_logs(tenant_id, occurred_at DESC);
CREATE INDEX idx_audit_entity ON public.audit_logs(tenant_id, entity, entity_id);

-- ============================================================
-- 16. SETTINGS (per-tenant key/value)
-- ============================================================
CREATE TABLE public.settings (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, key)
);

-- ============================================================
-- 17. updated_at triggers (all new tables)
-- ============================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'tenants','profiles','teams','card_templates','card_blocks',
    'projects','brochures','leads','customers',
    'pipeline_stages','pipeline_deals',
    'ai_followups','campaigns','dynamic_qr_codes','wallet_cards','settings'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%1$s_updated ON public.%1$s;
       CREATE TRIGGER trg_%1$s_updated BEFORE UPDATE ON public.%1$s
       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();', t);
  END LOOP;
END $$;

-- ============================================================
-- 18. RLS
-- ============================================================
ALTER TABLE public.tenants            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_templates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_blocks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brochures          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_deals     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_followups       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_lead_scores     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dynamic_qr_codes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_cards       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings           ENABLE ROW LEVEL SECURITY;

-- Tenants: members can see their tenant; only owner can update/delete
CREATE POLICY tenants_select ON public.tenants FOR SELECT TO authenticated
  USING (public.is_tenant_member(id));
CREATE POLICY tenants_insert ON public.tenants FOR INSERT TO authenticated
  WITH CHECK (true);  -- creator becomes owner via app code
CREATE POLICY tenants_update ON public.tenants FOR UPDATE TO authenticated
  USING (public.has_tenant_role(id, 'owner'));
CREATE POLICY tenants_delete ON public.tenants FOR DELETE TO authenticated
  USING (public.has_tenant_role(id, 'owner'));

-- Profiles: each user manages their own row
CREATE POLICY profiles_select_self ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY profiles_upsert_self ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- user_roles: members see roles in their tenant; only admin/owner mutate
CREATE POLICY user_roles_select ON public.user_roles FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));
CREATE POLICY user_roles_insert ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_tenant_role_in(tenant_id, ARRAY['owner','admin']::public.app_role[]));
CREATE POLICY user_roles_update ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_tenant_role_in(tenant_id, ARRAY['owner','admin']::public.app_role[]));
CREATE POLICY user_roles_delete ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_tenant_role_in(tenant_id, ARRAY['owner','admin']::public.app_role[]));

-- Generic tenant-scoped policy generator
DO $$
DECLARE t text;
DECLARE write_roles text := 'ARRAY[''owner'',''admin'',''manager'',''agent'']::public.app_role[]';
DECLARE admin_roles text := 'ARRAY[''owner'',''admin'']::public.app_role[]';
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'teams','team_members','card_templates','card_blocks',
    'projects','brochures','leads','customers',
    'pipeline_stages','pipeline_deals',
    'ai_followups','ai_lead_scores','campaigns',
    'dynamic_qr_codes','wallet_cards','settings'
  ] LOOP
    EXECUTE format($f$
      CREATE POLICY %1$s_select ON public.%1$s FOR SELECT TO authenticated
        USING (public.is_tenant_member(tenant_id));
      CREATE POLICY %1$s_insert ON public.%1$s FOR INSERT TO authenticated
        WITH CHECK (public.has_tenant_role_in(tenant_id, %2$s));
      CREATE POLICY %1$s_update ON public.%1$s FOR UPDATE TO authenticated
        USING (public.has_tenant_role_in(tenant_id, %2$s));
      CREATE POLICY %1$s_delete ON public.%1$s FOR DELETE TO authenticated
        USING (public.has_tenant_role_in(tenant_id, %3$s));
    $f$, t, write_roles, admin_roles);
  END LOOP;
END $$;

-- Cards: keep public read for published; rewrite write policies tenant-aware
DROP POLICY IF EXISTS "owner reads own cards" ON public.cards;
DROP POLICY IF EXISTS "owner inserts own cards" ON public.cards;
DROP POLICY IF EXISTS "owner updates own cards" ON public.cards;
DROP POLICY IF EXISTS "owner deletes own cards" ON public.cards;
-- "public reads published cards" is preserved.
CREATE POLICY cards_member_select ON public.cards FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));
CREATE POLICY cards_insert ON public.cards FOR INSERT TO authenticated
  WITH CHECK (
    public.has_tenant_role_in(tenant_id, ARRAY['owner','admin','manager','agent']::public.app_role[])
    AND owner_user_id = auth.uid()
  );
CREATE POLICY cards_update ON public.cards FOR UPDATE TO authenticated
  USING (
    public.has_tenant_role_in(tenant_id, ARRAY['owner','admin','manager']::public.app_role[])
    OR owner_user_id = auth.uid()
  );
CREATE POLICY cards_delete ON public.cards FOR DELETE TO authenticated
  USING (public.has_tenant_role_in(tenant_id, ARRAY['owner','admin']::public.app_role[]));

-- Audit log: append-only, tenant-scoped read
CREATE POLICY audit_select ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_tenant_role_in(tenant_id, ARRAY['owner','admin']::public.app_role[]));
CREATE POLICY audit_insert ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_member(tenant_id));
-- no update/delete policies → blocked.

-- ============================================================
-- 19. Auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
