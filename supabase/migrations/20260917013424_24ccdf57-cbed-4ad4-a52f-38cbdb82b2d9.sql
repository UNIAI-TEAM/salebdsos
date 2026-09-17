CREATE TABLE public.project_qr_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  channel text NOT NULL DEFAULT 'general',
  label text,
  created_by uuid,
  is_active boolean NOT NULL DEFAULT true,
  scan_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_qr_codes TO authenticated;
GRANT ALL ON public.project_qr_codes TO service_role;
ALTER TABLE public.project_qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qr_select_tenant" ON public.project_qr_codes FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()));
CREATE POLICY "qr_insert_tenant" ON public.project_qr_codes FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()));
CREATE POLICY "qr_update_tenant" ON public.project_qr_codes FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()));
CREATE POLICY "qr_delete_tenant" ON public.project_qr_codes FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE INDEX idx_project_qr_codes_project ON public.project_qr_codes(tenant_id, project_id);

CREATE TRIGGER trg_project_qr_codes_updated_at BEFORE UPDATE ON public.project_qr_codes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.project_touchpoints (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  qr_code_id uuid REFERENCES public.project_qr_codes(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  event_type text NOT NULL,
  channel text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  device_type text,
  referrer text,
  ip_hash text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.project_touchpoints TO authenticated;
GRANT ALL ON public.project_touchpoints TO service_role;
ALTER TABLE public.project_touchpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "touch_select_tenant" ON public.project_touchpoints FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE INDEX idx_project_touchpoints_project_time ON public.project_touchpoints(tenant_id, project_id, occurred_at DESC);
CREATE INDEX idx_project_touchpoints_session ON public.project_touchpoints(session_id, occurred_at);
CREATE INDEX idx_project_touchpoints_qr ON public.project_touchpoints(qr_code_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION public.bump_project_qr_scan(_code text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.project_qr_codes SET scan_count = scan_count + 1 WHERE code = _code;
$$;