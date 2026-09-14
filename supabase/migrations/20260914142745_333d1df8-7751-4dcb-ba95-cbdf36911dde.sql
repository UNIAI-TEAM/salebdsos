-- 1. AI sales pages: publishing fields
ALTER TABLE public.ai_sales_pages
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS ux_ai_sales_pages_tenant_slug
  ON public.ai_sales_pages (tenant_id, slug) WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_ai_sales_pages_slug_pub
  ON public.ai_sales_pages (slug) WHERE slug IS NOT NULL;

-- 2. Lead forms
CREATE TABLE IF NOT EXISTS public.lead_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  redirect_url text,
  success_message text,
  is_active boolean NOT NULL DEFAULT true,
  submit_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_forms TO authenticated;
GRANT ALL ON public.lead_forms TO service_role;
ALTER TABLE public.lead_forms ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS ux_lead_forms_slug ON public.lead_forms (slug);
CREATE INDEX IF NOT EXISTS idx_lead_forms_tenant_created ON public.lead_forms (tenant_id, created_at DESC);

CREATE POLICY "lead_forms_select_members" ON public.lead_forms
  FOR SELECT TO authenticated USING (private.is_tenant_member(tenant_id));
CREATE POLICY "lead_forms_insert_staff" ON public.lead_forms
  FOR INSERT TO authenticated
  WITH CHECK (private.has_tenant_role_in(tenant_id, ARRAY['owner','admin','manager','agent']::public.app_role[]));
CREATE POLICY "lead_forms_update_staff" ON public.lead_forms
  FOR UPDATE TO authenticated
  USING (private.has_tenant_role_in(tenant_id, ARRAY['owner','admin','manager','agent']::public.app_role[]))
  WITH CHECK (private.has_tenant_role_in(tenant_id, ARRAY['owner','admin','manager','agent']::public.app_role[]));
CREATE POLICY "lead_forms_delete_staff" ON public.lead_forms
  FOR DELETE TO authenticated
  USING (private.has_tenant_role_in(tenant_id, ARRAY['owner','admin','manager']::public.app_role[]));

CREATE TRIGGER trg_lead_forms_updated BEFORE UPDATE ON public.lead_forms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Lead submissions
CREATE TABLE IF NOT EXISTS public.lead_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  form_id uuid NOT NULL REFERENCES public.lead_forms(id) ON DELETE CASCADE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  ip_hash text,
  user_agent text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_submissions TO authenticated;
GRANT ALL ON public.lead_submissions TO service_role;
ALTER TABLE public.lead_submissions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_lead_submissions_form_created ON public.lead_submissions (form_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_submissions_tenant_created ON public.lead_submissions (tenant_id, created_at DESC);

CREATE POLICY "lead_submissions_select_members" ON public.lead_submissions
  FOR SELECT TO authenticated USING (private.is_tenant_member(tenant_id));
CREATE POLICY "lead_submissions_insert_staff" ON public.lead_submissions
  FOR INSERT TO authenticated
  WITH CHECK (private.has_tenant_role_in(tenant_id, ARRAY['owner','admin','manager','agent']::public.app_role[]));
CREATE POLICY "lead_submissions_delete_staff" ON public.lead_submissions
  FOR DELETE TO authenticated
  USING (private.has_tenant_role_in(tenant_id, ARRAY['owner','admin','manager']::public.app_role[]));