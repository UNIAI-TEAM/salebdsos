-- Extend lead_status enum
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'consulting';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'quoted';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'deposit';

-- Add columns
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS budget text,
  ADD COLUMN IF NOT EXISTS need_type text,
  ADD COLUMN IF NOT EXISTS timeline text;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leads_tenant_status ON public.leads(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_tenant_source ON public.leads(tenant_id, source) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_tenant_project ON public.leads(tenant_id, project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_tenant_owner ON public.leads(tenant_id, owner_user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_tenant_created ON public.leads(tenant_id, created_at DESC) WHERE deleted_at IS NULL;