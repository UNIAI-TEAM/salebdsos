-- 1) Enums
DO $$ BEGIN
  CREATE TYPE public.property_kind AS ENUM ('apartment','land_plot','townhouse','social_housing');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.listing_status AS ENUM ('available','locked','reserved','negotiating','deposited','contracted','sold','liquidated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Extend products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS product_type public.property_kind,
  ADD COLUMN IF NOT EXISTS zone text,
  ADD COLUMN IF NOT EXISTS floor integer,
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS area numeric,
  ADD COLUMN IF NOT EXISTS usable_area numeric,
  ADD COLUMN IF NOT EXISTS bedrooms integer,
  ADD COLUMN IF NOT EXISTS bathrooms integer,
  ADD COLUMN IF NOT EXISTS direction text,
  ADD COLUMN IF NOT EXISTS legal_status text,
  ADD COLUMN IF NOT EXISTS listing_status public.listing_status NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS hold_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS deal_id uuid REFERENCES public.pipeline_deals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS products_project_code_uniq
  ON public.products (project_id, lower(code)) WHERE project_id IS NOT NULL AND code IS NOT NULL;
CREATE INDEX IF NOT EXISTS products_project_idx ON public.products (project_id, listing_status);
CREATE INDEX IF NOT EXISTS products_tenant_type_idx ON public.products (tenant_id, product_type);
CREATE INDEX IF NOT EXISTS products_zone_floor_idx ON public.products (project_id, zone, floor);

-- 3) Status history
CREATE TABLE IF NOT EXISTS public.product_status_history (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  from_status public.listing_status,
  to_status public.listing_status NOT NULL,
  changed_by uuid,
  note text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.product_status_history TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.product_status_history_id_seq TO authenticated;
GRANT ALL ON public.product_status_history TO service_role;
GRANT ALL ON SEQUENCE public.product_status_history_id_seq TO service_role;

ALTER TABLE public.product_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_status_history_select ON public.product_status_history;
CREATE POLICY product_status_history_select ON public.product_status_history
  FOR SELECT TO authenticated USING (private.is_tenant_member(tenant_id));

DROP POLICY IF EXISTS product_status_history_insert ON public.product_status_history;
CREATE POLICY product_status_history_insert ON public.product_status_history
  FOR INSERT TO authenticated WITH CHECK (private.is_tenant_member(tenant_id));

CREATE INDEX IF NOT EXISTS product_status_history_product_idx
  ON public.product_status_history (product_id, occurred_at DESC);

-- 4) Auto log status changes
CREATE OR REPLACE FUNCTION public.log_product_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.product_status_history (tenant_id, product_id, from_status, to_status, changed_by)
    VALUES (NEW.tenant_id, NEW.id, NULL, NEW.listing_status, auth.uid());
  ELSIF NEW.listing_status IS DISTINCT FROM OLD.listing_status THEN
    INSERT INTO public.product_status_history (tenant_id, product_id, from_status, to_status, changed_by)
    VALUES (NEW.tenant_id, NEW.id, OLD.listing_status, NEW.listing_status, auth.uid());
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_products_status_log ON public.products;
CREATE TRIGGER trg_products_status_log
AFTER INSERT OR UPDATE OF listing_status ON public.products
FOR EACH ROW EXECUTE FUNCTION public.log_product_status_change();

-- 5) Public read for published available inventory
GRANT SELECT ON public.products TO anon;
DROP POLICY IF EXISTS products_public_select ON public.products;
CREATE POLICY products_public_select ON public.products
  FOR SELECT TO anon
  USING (is_public = true AND listing_status = 'available' AND status = 'active');
