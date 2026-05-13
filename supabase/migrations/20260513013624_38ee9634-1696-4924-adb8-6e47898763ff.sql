-- Add scenario + tracking fields to ai_followups for AI Follow-up MVP
ALTER TABLE public.ai_followups
  ADD COLUMN IF NOT EXISTS scenario text,
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS owner_user_id uuid,
  ADD COLUMN IF NOT EXISTS project_id uuid;

CREATE INDEX IF NOT EXISTS idx_ai_followups_tenant_status
  ON public.ai_followups (tenant_id, status, created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ai_followups_lead
  ON public.ai_followups (lead_id, created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ai_followups_scenario
  ON public.ai_followups (tenant_id, scenario) WHERE deleted_at IS NULL;

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_ai_followups_updated ON public.ai_followups;
CREATE TRIGGER trg_ai_followups_updated
  BEFORE UPDATE ON public.ai_followups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();