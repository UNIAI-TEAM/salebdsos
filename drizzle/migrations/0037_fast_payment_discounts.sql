CREATE TABLE public.payment_discount_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  within_days integer NOT NULL DEFAULT 7,
  discount_percent numeric NOT NULL DEFAULT 0,
  product_kinds text[] NOT NULL DEFAULT ARRAY['land_plot','subdivision'],
  active boolean NOT NULL DEFAULT true,
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.payment_discount_policies IS 'Chính sách chiết khấu thanh toán nhanh: thanh toán trong within_days ngày được giảm discount_percent %';
COMMENT ON COLUMN public.payment_discount_policies.project_id IS 'NULL = áp dụng cho mọi dự án của sàn';

GRANT SELECT ON public.payment_discount_policies TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.payment_discount_policies TO authenticated;
GRANT ALL ON public.payment_discount_policies TO service_role;

ALTER TABLE public.payment_discount_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read tenant discount policies"
  ON public.payment_discount_policies FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Admins manage tenant discount policies"
  ON public.payment_discount_policies FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('owner','admin','manager')))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('owner','admin','manager')));

ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS discount_policy_id uuid REFERENCES public.payment_discount_policies(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.contracts.discount_policy_id IS 'Chính sách chiết khấu thanh toán nhanh đã áp dụng (nếu có)';