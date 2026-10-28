ALTER TYPE public.listing_status ADD VALUE IF NOT EXISTS 'retired';

CREATE TABLE public.plot_transform_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  action text NOT NULL,
  parent_ids uuid[] NOT NULL,
  child_ids uuid[] NOT NULL,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.plot_transform_events IS 'Lịch sử tách/ghép lô: action = split | merge, parent_ids = lô gốc, child_ids = lô mới';

GRANT SELECT ON public.plot_transform_events TO authenticated;
GRANT ALL ON public.plot_transform_events TO service_role;

ALTER TABLE public.plot_transform_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read plot transform history"
  ON public.plot_transform_events FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()));

-- Tách 1 lô thành nhiều lô con (nguyên tử, khoá hàng, kiểm tra diện tích)
CREATE OR REPLACE FUNCTION public.split_plot(p_id uuid, p_children jsonb, p_expected timestamptz)
RETURNS SETOF public.products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  v public.products;
  child jsonb;
  new_id uuid;
  child_ids uuid[] := '{}';
  total_area numeric := 0;
  codes text[] := '{}';
  n int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Cần đăng nhập'; END IF;
  SELECT * INTO v FROM public.products WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy lô'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE tenant_id = v.tenant_id AND user_id = auth.uid() AND role IN ('owner','admin','manager')) THEN
    RAISE EXCEPTION 'Chỉ quản lý được tách lô';
  END IF;
  IF p_expected IS NULL OR v.updated_at IS DISTINCT FROM p_expected THEN
    RAISE EXCEPTION 'Lô vừa được cập nhật; tải lại trước khi tách';
  END IF;
  IF v.listing_status <> 'available' THEN
    RAISE EXCEPTION 'Chỉ tách được lô đang trống (chưa giữ chỗ, cọc hay hợp đồng)';
  END IF;

  n := jsonb_array_length(p_children);
  IF n IS NULL OR n < 2 OR n > 20 THEN RAISE EXCEPTION 'Tách thành 2 đến 20 lô con'; END IF;

  FOR child IN SELECT * FROM jsonb_array_elements(p_children) LOOP
    DECLARE
      c_code text := nullif(trim(coalesce(child->>'code','')), '');
      c_area numeric := nullif(child->>'area','')::numeric;
      c_price numeric := coalesce(nullif(child->>'price','')::numeric, 0);
    BEGIN
      IF c_code IS NULL OR char_length(c_code) > 80 THEN RAISE EXCEPTION 'Mã lô con không hợp lệ'; END IF;
      IF c_area IS NULL OR c_area <= 0 THEN RAISE EXCEPTION 'Diện tích lô con phải lớn hơn 0'; END IF;
      IF c_price < 0 THEN RAISE EXCEPTION 'Giá lô con không hợp lệ'; END IF;
      IF c_code = ANY(codes) THEN RAISE EXCEPTION 'Mã lô con bị trùng: %', c_code; END IF;
      IF EXISTS (SELECT 1 FROM public.products WHERE tenant_id = v.tenant_id AND project_id IS NOT DISTINCT FROM v.project_id AND code = c_code) THEN
        RAISE EXCEPTION 'Mã lô đã tồn tại: %', c_code;
      END IF;
      codes := codes || c_code;
      total_area := total_area + c_area;
    END;
  END LOOP;

  IF v.area IS NOT NULL AND total_area > v.area + 0.0001 THEN
    RAISE EXCEPTION 'Tổng diện tích lô con (%) vượt diện tích lô gốc (%)', total_area, v.area;
  END IF;

  FOR child IN SELECT * FROM jsonb_array_elements(p_children) LOOP
    INSERT INTO public.products (
      tenant_id, project_id, product_type, category, code, name, zone,
      area, direction, legal_status, price, currency, unit, status,
      listing_status, is_public, description, attributes, map_row, map_col, created_by
    ) VALUES (
      v.tenant_id, v.project_id, v.product_type, v.category,
      trim(child->>'code'), trim(child->>'code'), v.zone,
      (child->>'area')::numeric,
      coalesce(nullif(trim(child->>'direction',''), ''), v.direction),
      v.legal_status,
      coalesce(nullif(child->>'price','')::numeric, 0),
      v.currency, v.unit, v.status,
      'available', false, v.description, coalesce(v.attributes, '{}'::jsonb),
      nullif(child->>'map_row','')::int, nullif(child->>'map_col','')::int,
      auth.uid()
    ) RETURNING id INTO new_id;
    child_ids := child_ids || new_id;
  END LOOP;

  UPDATE public.products
  SET listing_status = 'retired', hold_expires_at = NULL, hold_owner_user_id = NULL, is_public = false
  WHERE id = v.id;

  INSERT INTO public.plot_transform_events (tenant_id, project_id, action, parent_ids, child_ids, note, created_by)
  VALUES (v.tenant_id, v.project_id, 'split', ARRAY[v.id], child_ids, nullif(trim(p_children->>'note'), ''), auth.uid());

  INSERT INTO public.audit_logs (tenant_id, actor_user_id, action, entity, entity_id, diff)
  VALUES (v.tenant_id, auth.uid(), 'plot.split', 'product', v.id, jsonb_build_object('children', child_ids, 'count', n));

  RETURN QUERY SELECT * FROM public.products WHERE id = ANY(child_ids);
END
$func$;

-- Ghép nhiều lô thành 1 lô mới (nguyên tử, khoá tất cả hàng)
CREATE OR REPLACE FUNCTION public.merge_plots(p_ids uuid[], p_child jsonb)
RETURNS public.products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  parents public.products[];
  p public.products;
  v public.products;
  total_area numeric := 0;
  total_price numeric := 0;
  new_code text;
  new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Cần đăng nhập'; END IF;
  IF p_ids IS NULL OR cardinality(p_ids) < 2 OR cardinality(p_ids) > 20 THEN
    RAISE EXCEPTION 'Ghép từ 2 đến 20 lô';
  END IF;

  SELECT array_agg(x ORDER BY x.id) INTO parents FROM public.products x WHERE x.id = ANY(p_ids) FOR UPDATE;
  IF parents IS NULL OR cardinality(parents) <> cardinality(p_ids) THEN RAISE EXCEPTION 'Có lô không tồn tại'; END IF;

  p := parents[1];
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE tenant_id = p.tenant_id AND user_id = auth.uid() AND role IN ('owner','admin','manager')) THEN
    RAISE EXCEPTION 'Chỉ quản lý được ghép lô';
  END IF;

  FOREACH v IN ARRAY parents LOOP
    IF v.tenant_id <> p.tenant_id THEN RAISE EXCEPTION 'Các lô phải cùng sàn'; END IF;
    IF v.project_id IS DISTINCT FROM p.project_id THEN RAISE EXCEPTION 'Các lô phải cùng dự án'; END IF;
    IF v.listing_status <> 'available' THEN RAISE EXCEPTION 'Chỉ ghép được lô đang trống: %', v.code; END IF;
    total_area := total_area + coalesce(v.area, 0);
    total_price := total_price + coalesce(v.price, 0);
  END LOOP;

  new_code := nullif(trim(coalesce(p_child->>'code','')), '');
  IF new_code IS NULL OR char_length(new_code) > 80 THEN RAISE EXCEPTION 'Mã lô mới không hợp lệ'; END IF;
  IF EXISTS (SELECT 1 FROM public.products WHERE tenant_id = p.tenant_id AND project_id IS NOT DISTINCT FROM p.project_id AND code = new_code) THEN
    RAISE EXCEPTION 'Mã lô đã tồn tại: %', new_code;
  END IF;

  INSERT INTO public.products (
    tenant_id, project_id, product_type, category, code, name, zone,
    area, direction, legal_status, price, currency, unit, status,
    listing_status, is_public, description, attributes, map_row, map_col, created_by
  ) VALUES (
    p.tenant_id, p.project_id, p.product_type, p.category,
    new_code, new_code,
    coalesce(nullif(trim(p_child->>'zone'), ''), p.zone),
    coalesce(nullif(p_child->>'area','')::numeric, total_area),
    coalesce(nullif(trim(p_child->>'direction'), ''), p.direction),
    p.legal_status,
    coalesce(nullif(p_child->>'price','')::numeric, total_price),
    p.currency, p.unit, p.status,
    'available', false, p.description, coalesce(p.attributes, '{}'::jsonb),
    nullif(p_child->>'map_row','')::int, nullif(p_child->>'map_col','')::int,
    auth.uid()
  ) RETURNING * INTO v;

  UPDATE public.products
  SET listing_status = 'retired', hold_expires_at = NULL, hold_owner_user_id = NULL, is_public = false
  WHERE id = ANY(p_ids);

  INSERT INTO public.plot_transform_events (tenant_id, project_id, action, parent_ids, child_ids, note, created_by)
  VALUES (p.tenant_id, p.project_id, 'merge', p_ids, ARRAY[v.id], nullif(trim(p_child->>'note'), ''), auth.uid());

  INSERT INTO public.audit_logs (tenant_id, actor_user_id, action, entity, entity_id, diff)
  VALUES (p.tenant_id, auth.uid(), 'plot.merge', 'product', v.id, jsonb_build_object('parents', p_ids, 'count', cardinality(p_ids)));

  RETURN v;
END
$func$;