ALTER TABLE public.pipeline_deals ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id);
CREATE INDEX IF NOT EXISTS idx_pipeline_deals_customer ON public.pipeline_deals(tenant_id, customer_id);

CREATE TABLE IF NOT EXISTS public.customer_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.pipeline_deals(id),
  project_id uuid REFERENCES public.projects(id),
  kind text NOT NULL DEFAULT 'deposit',
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'VND',
  status text NOT NULL DEFAULT 'completed',
  note text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_customer_tx_tenant_customer ON public.customer_transactions(tenant_id, customer_id, occurred_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_transactions TO authenticated;
GRANT ALL ON public.customer_transactions TO service_role;

ALTER TABLE public.customer_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY customer_tx_select ON public.customer_transactions FOR SELECT TO authenticated
  USING (private.is_tenant_member(tenant_id));
CREATE POLICY customer_tx_insert ON public.customer_transactions FOR INSERT TO authenticated
  WITH CHECK (private.has_tenant_role_in(tenant_id, ARRAY['owner'::app_role,'admin'::app_role,'manager'::app_role,'agent'::app_role]));
CREATE POLICY customer_tx_update ON public.customer_transactions FOR UPDATE TO authenticated
  USING (private.has_tenant_role_in(tenant_id, ARRAY['owner'::app_role,'admin'::app_role,'manager'::app_role,'agent'::app_role]));
CREATE POLICY customer_tx_delete ON public.customer_transactions FOR DELETE TO authenticated
  USING (private.has_tenant_role_in(tenant_id, ARRAY['owner'::app_role,'admin'::app_role]));

CREATE TRIGGER trg_customer_tx_updated BEFORE UPDATE ON public.customer_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();