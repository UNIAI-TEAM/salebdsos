CREATE TABLE public.bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  provider text NOT NULL DEFAULT 'sepay',
  external_id text NOT NULL,
  bank_name text,
  account_number text,
  amount numeric NOT NULL DEFAULT 0,
  content text,
  reference_code text,
  transferred_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'unmatched',
  matched_contract_id uuid REFERENCES public.contracts(id),
  matched_by uuid,
  matched_at timestamptz,
  allocation jsonb NOT NULL DEFAULT '[]'::jsonb,
  note text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider, external_id)
);
GRANT SELECT, UPDATE ON public.bank_transactions TO authenticated;
GRANT ALL ON public.bank_transactions TO service_role;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bank tx admin select" ON public.bank_transactions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.tenant_id = bank_transactions.tenant_id AND ur.user_id = auth.uid() AND ur.role IN ('owner','admin','manager','platform_admin')));
CREATE POLICY "bank tx admin update" ON public.bank_transactions FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.tenant_id = bank_transactions.tenant_id AND ur.user_id = auth.uid() AND ur.role IN ('owner','admin','platform_admin')));
CREATE TRIGGER trg_bank_tx_updated BEFORE UPDATE ON public.bank_transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX bank_tx_tenant_time ON public.bank_transactions(tenant_id, transferred_at DESC);

CREATE TABLE public.sales_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  project_id uuid REFERENCES public.projects(id),
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'launch',
  location text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  capacity integer,
  description text,
  status text NOT NULL DEFAULT 'scheduled',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_events TO authenticated;
GRANT ALL ON public.sales_events TO service_role;
ALTER TABLE public.sales_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events tenant all" ON public.sales_events FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.tenant_id = sales_events.tenant_id AND ur.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.tenant_id = sales_events.tenant_id AND ur.user_id = auth.uid()));
CREATE TRIGGER trg_sales_events_updated BEFORE UPDATE ON public.sales_events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.event_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  event_id uuid NOT NULL REFERENCES public.sales_events(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id),
  guest_name text NOT NULL,
  guest_phone text,
  guest_email text,
  code text NOT NULL UNIQUE,
  invited_by uuid,
  status text NOT NULL DEFAULT 'invited',
  checked_in_at timestamptz,
  checked_in_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_tickets TO authenticated;
GRANT ALL ON public.event_tickets TO service_role;
ALTER TABLE public.event_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tickets tenant all" ON public.event_tickets FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.tenant_id = event_tickets.tenant_id AND ur.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.tenant_id = event_tickets.tenant_id AND ur.user_id = auth.uid()));
CREATE TRIGGER trg_event_tickets_updated BEFORE UPDATE ON public.event_tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX event_tickets_event ON public.event_tickets(event_id);
CREATE UNIQUE INDEX event_tickets_unique_phone ON public.event_tickets(event_id, guest_phone) WHERE guest_phone IS NOT NULL;