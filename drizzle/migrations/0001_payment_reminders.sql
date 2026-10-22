CREATE TABLE public.payment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  contract_id uuid NOT NULL,
  installment_id uuid NOT NULL,
  kind text NOT NULL,
  days_overdue integer NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  notified_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX payment_reminders_once ON public.payment_reminders (installment_id, kind);
CREATE INDEX payment_reminders_contract ON public.payment_reminders (contract_id, created_at DESC);
GRANT SELECT ON public.payment_reminders TO authenticated;
GRANT ALL ON public.payment_reminders TO service_role;
ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment reminders tenant select" ON public.payment_reminders FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.tenant_id = payment_reminders.tenant_id AND ur.user_id = auth.uid()));