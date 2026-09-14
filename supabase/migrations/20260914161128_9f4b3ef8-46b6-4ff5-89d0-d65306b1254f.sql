ALTER TABLE public.sales_prompts ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE public.ai_sales_pages ADD COLUMN IF NOT EXISTS industry text;
CREATE INDEX IF NOT EXISTS idx_sales_prompts_industry ON public.sales_prompts (tenant_id, industry);
CREATE INDEX IF NOT EXISTS idx_ai_sales_pages_industry ON public.ai_sales_pages (tenant_id, industry);