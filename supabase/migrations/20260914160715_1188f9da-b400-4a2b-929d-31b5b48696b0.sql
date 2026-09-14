CREATE TABLE IF NOT EXISTS public.sales_page_views (
  page_id uuid NOT NULL REFERENCES public.ai_sales_pages(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  day date NOT NULL DEFAULT CURRENT_DATE,
  views integer NOT NULL DEFAULT 0,
  conversions integer NOT NULL DEFAULT 0,
  PRIMARY KEY (page_id, day)
);

CREATE INDEX IF NOT EXISTS idx_sales_page_views_tenant_day ON public.sales_page_views (tenant_id, day DESC);

GRANT SELECT ON public.sales_page_views TO authenticated;
GRANT ALL ON public.sales_page_views TO service_role;

ALTER TABLE public.sales_page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY sales_page_views_select ON public.sales_page_views FOR SELECT TO authenticated
  USING (private.is_tenant_member(tenant_id));