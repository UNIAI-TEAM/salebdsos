CREATE TABLE public.handovers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL,
  to_user_ids uuid[] NOT NULL DEFAULT '{}',
  team_id uuid,
  reason text,
  counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.handovers TO authenticated;
GRANT ALL ON public.handovers TO service_role;
ALTER TABLE public.handovers ENABLE ROW LEVEL SECURITY;
CREATE POLICY handovers_select ON public.handovers FOR SELECT TO authenticated
  USING (private.is_tenant_member(tenant_id));
CREATE POLICY handovers_insert ON public.handovers FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND private.has_tenant_role_in(tenant_id, ARRAY['owner'::app_role,'admin'::app_role,'manager'::app_role,'agent'::app_role]));
CREATE INDEX handovers_tenant_idx ON public.handovers(tenant_id, created_at DESC);