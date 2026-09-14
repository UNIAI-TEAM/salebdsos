ALTER TABLE public.sales_prompts
  ADD COLUMN IF NOT EXISTS stage_id uuid REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variables jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_sales_prompts_stage ON public.sales_prompts (tenant_id, stage_id) WHERE deleted_at IS NULL;