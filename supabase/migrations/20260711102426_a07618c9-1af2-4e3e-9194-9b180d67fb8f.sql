
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  assigned_to uuid,
  title text NOT NULL,
  location text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','canceled','no_show')),
  notes text,
  reminder_minutes int DEFAULT 30,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_appointments_tenant_starts ON public.appointments(tenant_id, starts_at DESC);
CREATE INDEX idx_appointments_tenant_status ON public.appointments(tenant_id, status);
CREATE INDEX idx_appointments_assigned ON public.appointments(assigned_to) WHERE assigned_to IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointments_select" ON public.appointments FOR SELECT TO authenticated
  USING (private.is_tenant_member(tenant_id));
CREATE POLICY "appointments_insert" ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (private.has_tenant_role_in(tenant_id, ARRAY['owner','admin','manager','agent']::public.app_role[]));
CREATE POLICY "appointments_update" ON public.appointments FOR UPDATE TO authenticated
  USING (private.has_tenant_role_in(tenant_id, ARRAY['owner','admin','manager','agent']::public.app_role[]))
  WITH CHECK (private.has_tenant_role_in(tenant_id, ARRAY['owner','admin','manager','agent']::public.app_role[]));
CREATE POLICY "appointments_delete" ON public.appointments FOR DELETE TO authenticated
  USING (private.has_tenant_role_in(tenant_id, ARRAY['owner','admin','manager']::public.app_role[]));

CREATE TRIGGER trg_appointments_updated BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sku text,
  name text NOT NULL,
  category text,
  price numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'VND',
  unit text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','archived')),
  description text,
  image_url text,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, sku)
);
CREATE INDEX idx_products_tenant_created ON public.products(tenant_id, created_at DESC);
CREATE INDEX idx_products_tenant_status ON public.products(tenant_id, status);
CREATE INDEX idx_products_tenant_name_lower ON public.products(tenant_id, lower(name));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_select" ON public.products FOR SELECT TO authenticated
  USING (private.is_tenant_member(tenant_id));
CREATE POLICY "products_insert" ON public.products FOR INSERT TO authenticated
  WITH CHECK (private.has_tenant_role_in(tenant_id, ARRAY['owner','admin','manager']::public.app_role[]));
CREATE POLICY "products_update" ON public.products FOR UPDATE TO authenticated
  USING (private.has_tenant_role_in(tenant_id, ARRAY['owner','admin','manager']::public.app_role[]))
  WITH CHECK (private.has_tenant_role_in(tenant_id, ARRAY['owner','admin','manager']::public.app_role[]));
CREATE POLICY "products_delete" ON public.products FOR DELETE TO authenticated
  USING (private.has_tenant_role_in(tenant_id, ARRAY['owner','admin']::public.app_role[]));

CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
