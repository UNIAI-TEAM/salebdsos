
CREATE TABLE public.ai_sales_pages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  owner_user_id uuid,
  lead_id uuid,
  customer_id uuid,
  project_id uuid,
  title text,
  audience text,
  tone text,
  cta text,
  prompt text,
  output jsonb,
  model text,
  tokens int,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_ai_sales_pages_tenant ON public.ai_sales_pages(tenant_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_ai_sales_pages_lead ON public.ai_sales_pages(lead_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ai_sales_pages_customer ON public.ai_sales_pages(customer_id) WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_sales_pages TO authenticated;
GRANT ALL ON public.ai_sales_pages TO service_role;

ALTER TABLE public.ai_sales_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_sales_pages_select ON public.ai_sales_pages FOR SELECT TO authenticated
  USING (private.is_tenant_member(tenant_id));
CREATE POLICY ai_sales_pages_insert ON public.ai_sales_pages FOR INSERT TO authenticated
  WITH CHECK (private.is_tenant_member(tenant_id));
CREATE POLICY ai_sales_pages_update ON public.ai_sales_pages FOR UPDATE TO authenticated
  USING (private.is_tenant_member(tenant_id)) WITH CHECK (private.is_tenant_member(tenant_id));
CREATE POLICY ai_sales_pages_delete ON public.ai_sales_pages FOR DELETE TO authenticated
  USING (private.is_tenant_member(tenant_id));

CREATE TRIGGER trg_ai_sales_pages_updated_at BEFORE UPDATE ON public.ai_sales_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
