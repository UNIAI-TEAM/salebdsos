CREATE TABLE public.sales_prompts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  tags text[] NOT NULL DEFAULT '{}',
  request text,
  prompt text NOT NULL,
  tone text,
  audience text,
  cta text,
  source_page_id uuid,
  use_count integer NOT NULL DEFAULT 0,
  last_used_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone
);

CREATE INDEX idx_sales_prompts_tenant ON public.sales_prompts (tenant_id, created_at DESC);
CREATE INDEX idx_sales_prompts_category ON public.sales_prompts (tenant_id, category);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_prompts TO authenticated;
GRANT ALL ON public.sales_prompts TO service_role;

ALTER TABLE public.sales_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY sales_prompts_select ON public.sales_prompts FOR SELECT TO authenticated
  USING (private.is_tenant_member(tenant_id));
CREATE POLICY sales_prompts_insert ON public.sales_prompts FOR INSERT TO authenticated
  WITH CHECK (private.has_tenant_role_in(tenant_id, ARRAY['owner'::app_role,'admin'::app_role,'manager'::app_role,'agent'::app_role]));
CREATE POLICY sales_prompts_update ON public.sales_prompts FOR UPDATE TO authenticated
  USING (private.has_tenant_role_in(tenant_id, ARRAY['owner'::app_role,'admin'::app_role,'manager'::app_role,'agent'::app_role]))
  WITH CHECK (private.has_tenant_role_in(tenant_id, ARRAY['owner'::app_role,'admin'::app_role,'manager'::app_role,'agent'::app_role]));
CREATE POLICY sales_prompts_delete ON public.sales_prompts FOR DELETE TO authenticated
  USING (private.has_tenant_role_in(tenant_id, ARRAY['owner'::app_role,'admin'::app_role]));

CREATE TRIGGER trg_sales_prompts_updated BEFORE UPDATE ON public.sales_prompts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.sales_prompt_uses (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  prompt_id uuid NOT NULL REFERENCES public.sales_prompts(id) ON DELETE CASCADE,
  used_by uuid,
  page_id uuid,
  note text,
  used_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_prompt_uses_prompt ON public.sales_prompt_uses (prompt_id, used_at DESC);

GRANT SELECT, INSERT ON public.sales_prompt_uses TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.sales_prompt_uses_id_seq TO authenticated;
GRANT ALL ON public.sales_prompt_uses TO service_role;
GRANT ALL ON SEQUENCE public.sales_prompt_uses_id_seq TO service_role;

ALTER TABLE public.sales_prompt_uses ENABLE ROW LEVEL SECURITY;

CREATE POLICY sales_prompt_uses_select ON public.sales_prompt_uses FOR SELECT TO authenticated
  USING (private.is_tenant_member(tenant_id));
CREATE POLICY sales_prompt_uses_insert ON public.sales_prompt_uses FOR INSERT TO authenticated
  WITH CHECK (private.is_tenant_member(tenant_id));