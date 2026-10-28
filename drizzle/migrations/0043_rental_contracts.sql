-- Giai đoạn B: hợp đồng cho thuê — thu tiền định kỳ, người thuê, trạng thái 'đang cho thuê'.

ALTER TYPE public.listing_status ADD VALUE IF NOT EXISTS 'rented';

ALTER TABLE public.contracts
  ADD COLUMN contract_kind text NOT NULL DEFAULT 'sale',
  ADD COLUMN lease_start date,
  ADD COLUMN lease_end date,
  ADD COLUMN monthly_rent numeric,
  ADD COLUMN deposit_amount numeric,
  ADD COLUMN rent_cycle_day integer;

ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_kind_check CHECK (contract_kind IN ('sale', 'rental')),
  ADD CONSTRAINT contracts_cycle_day_check CHECK (rent_cycle_day IS NULL OR (rent_cycle_day BETWEEN 1 AND 31));

CREATE INDEX IF NOT EXISTS contracts_tenant_kind_idx ON public.contracts (tenant_id, contract_kind) WHERE deleted_at IS NULL;

-- Lập hợp đồng thuê nguyên tử: khoá căn, tạo hợp đồng + lịch thu định kỳ, chuyển căn sang 'đang cho thuê'.
CREATE OR REPLACE FUNCTION public.create_rental_contract(
  p_tenant uuid,
  p_product uuid,
  p_customer uuid,
  p_lead uuid,
  p_owner uuid,
  p_code text,
  p_monthly_rent numeric,
  p_deposit numeric,
  p_lease_start date,
  p_lease_end date,
  p_cycle_day integer,
  p_note text,
  p_schedule jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product public.products%ROWTYPE;
  v_contract_id uuid;
  v_code text;
BEGIN
  -- Chỉ thành viên có vai trò trong tenant mới được lập hợp đồng
  IF NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.tenant_id = p_tenant AND ur.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Bạn không thuộc workspace này';
  END IF;

  IF p_lease_end < p_lease_start THEN
    RAISE EXCEPTION 'Ngày kết thúc thuê phải sau ngày bắt đầu';
  END IF;
  IF p_monthly_rent IS NULL OR p_monthly_rent <= 0 THEN
    RAISE EXCEPTION 'Giá thuê hàng tháng phải lớn hơn 0';
  END IF;
  IF p_cycle_day IS NULL OR p_cycle_day < 1 OR p_cycle_day > 31 THEN
    RAISE EXCEPTION 'Ngày thu hàng tháng phải từ 1 đến 31';
  END IF;

  SELECT * INTO v_product FROM public.products WHERE id = p_product FOR UPDATE;
  IF NOT FOUND OR v_product.tenant_id <> p_tenant THEN
    RAISE EXCEPTION 'Sản phẩm không thuộc workspace này';
  END IF;
  IF v_product.listing_status IN ('sold', 'rented', 'retired', 'liquidated', 'deposited', 'contracted') THEN
    RAISE EXCEPTION 'Căn/lô này đang ở trạng thái %, không thể cho thuê', v_product.listing_status;
  END IF;

  v_code := NULLIF(btrim(COALESCE(p_code, '')), '');
  IF v_code IS NULL THEN
    v_code := 'HDT-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 4));
  END IF;

  INSERT INTO public.contracts (
    tenant_id, project_id, product_id, customer_id, lead_id, owner_user_id,
    code, sale_price, discount_amount, net_price, currency, status,
    signed_at, note, created_by, contract_kind,
    lease_start, lease_end, monthly_rent, deposit_amount, rent_cycle_day
  ) VALUES (
    p_tenant, v_product.project_id, p_product, p_customer, p_lead, COALESCE(p_owner, auth.uid()),
    v_code, p_monthly_rent, 0, p_monthly_rent, COALESCE(v_product.currency, 'VND'), 'active',
    p_lease_start, NULLIF(btrim(COALESCE(p_note, '')), ''), auth.uid(), 'rental',
    p_lease_start, p_lease_end, p_monthly_rent, COALESCE(p_deposit, 0), p_cycle_day
  )
  RETURNING id INTO v_contract_id;

  INSERT INTO public.contract_installments (tenant_id, contract_id, name, position, amount, due_date, status)
  SELECT p_tenant, v_contract_id,
         row->>'name',
         (row->>'position')::integer,
         (row->>'amount')::numeric,
         (row->>'due_date')::date,
         'pending'
  FROM jsonb_array_elements(p_schedule) AS row;

  UPDATE public.products SET listing_status = 'rented', updated_at = now() WHERE id = p_product;

  RETURN v_contract_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_rental_contract(uuid, uuid, uuid, uuid, uuid, text, numeric, numeric, date, date, integer, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_rental_contract(uuid, uuid, uuid, uuid, uuid, text, numeric, numeric, date, date, integer, text, jsonb) TO authenticated;