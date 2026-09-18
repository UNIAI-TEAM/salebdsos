CREATE TYPE public.contract_status AS ENUM ('draft','active','completed','cancelled');
CREATE TYPE public.commission_status AS ENUM ('pending','approved','paid');

CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.pipeline_deals(id) ON DELETE SET NULL,
  owner_user_id uuid,
  code text NOT NULL,
  sale_price numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  net_price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'VND',
  status public.contract_status NOT NULL DEFAULT 'draft',
  signed_at date,
  completed_at timestamptz,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contracts tenant select" ON public.contracts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.tenant_id = contracts.tenant_id AND ur.user_id = auth.uid()));
CREATE POLICY "contracts tenant insert" ON public.contracts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.tenant_id = contracts.tenant_id AND ur.user_id = auth.uid()));
CREATE POLICY "contracts tenant update" ON public.contracts FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.tenant_id = contracts.tenant_id AND ur.user_id = auth.uid()));
CREATE POLICY "contracts tenant delete" ON public.contracts FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.tenant_id = contracts.tenant_id AND ur.user_id = auth.uid()));

CREATE UNIQUE INDEX contracts_tenant_code_key ON public.contracts (tenant_id, lower(code)) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX contracts_active_product_key ON public.contracts (product_id) WHERE deleted_at IS NULL AND status IN ('draft','active','completed') AND product_id IS NOT NULL;
CREATE INDEX contracts_tenant_status_idx ON public.contracts (tenant_id, status);
CREATE INDEX contracts_owner_idx ON public.contracts (owner_user_id);

CREATE TRIGGER trg_contracts_updated BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.contract_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  percent numeric,
  amount numeric NOT NULL DEFAULT 0,
  due_date date,
  paid_amount numeric NOT NULL DEFAULT 0,
  paid_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_installments TO authenticated;
GRANT ALL ON public.contract_installments TO service_role;
ALTER TABLE public.contract_installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "installments tenant select" ON public.contract_installments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.tenant_id = contract_installments.tenant_id AND ur.user_id = auth.uid()));
CREATE POLICY "installments tenant insert" ON public.contract_installments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.tenant_id = contract_installments.tenant_id AND ur.user_id = auth.uid()));
CREATE POLICY "installments tenant update" ON public.contract_installments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.tenant_id = contract_installments.tenant_id AND ur.user_id = auth.uid()));
CREATE POLICY "installments tenant delete" ON public.contract_installments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.tenant_id = contract_installments.tenant_id AND ur.user_id = auth.uid()));

CREATE INDEX contract_installments_contract_idx ON public.contract_installments (contract_id, position);
CREATE TRIGGER trg_contract_installments_updated BEFORE UPDATE ON public.contract_installments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.contract_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  beneficiary_user_id uuid,
  beneficiary_name text,
  role_label text,
  percent numeric,
  amount numeric NOT NULL DEFAULT 0,
  status public.commission_status NOT NULL DEFAULT 'pending',
  approved_by uuid,
  approved_at timestamptz,
  paid_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_commissions TO authenticated;
GRANT ALL ON public.contract_commissions TO service_role;
ALTER TABLE public.contract_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commissions tenant select" ON public.contract_commissions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.tenant_id = contract_commissions.tenant_id AND ur.user_id = auth.uid()));
CREATE POLICY "commissions tenant insert" ON public.contract_commissions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.tenant_id = contract_commissions.tenant_id AND ur.user_id = auth.uid()));
CREATE POLICY "commissions tenant update" ON public.contract_commissions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.tenant_id = contract_commissions.tenant_id AND ur.user_id = auth.uid()));
CREATE POLICY "commissions tenant delete" ON public.contract_commissions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.tenant_id = contract_commissions.tenant_id AND ur.user_id = auth.uid()));

CREATE INDEX contract_commissions_contract_idx ON public.contract_commissions (contract_id);
CREATE INDEX contract_commissions_beneficiary_idx ON public.contract_commissions (beneficiary_user_id, status);
CREATE TRIGGER trg_contract_commissions_updated BEFORE UPDATE ON public.contract_commissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.sync_product_from_contract()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target public.listing_status;
BEGIN
  IF NEW.product_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  target := CASE NEW.status
    WHEN 'draft' THEN 'negotiating'::public.listing_status
    WHEN 'active' THEN 'contracted'::public.listing_status
    WHEN 'completed' THEN 'sold'::public.listing_status
    WHEN 'cancelled' THEN 'available'::public.listing_status
  END;

  UPDATE public.products
     SET listing_status = target,
         deal_id = COALESCE(NEW.deal_id, deal_id)
   WHERE id = NEW.product_id
     AND listing_status IS DISTINCT FROM target;

  RETURN NEW;
END $$;

CREATE TRIGGER trg_contracts_sync_product
AFTER INSERT OR UPDATE OF status ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.sync_product_from_contract();