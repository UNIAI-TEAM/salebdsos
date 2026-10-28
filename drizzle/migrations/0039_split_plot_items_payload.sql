-- split_plot nhận payload dạng { note, items: [...] } từ server function
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
  items jsonb := coalesce(p_children->'items', p_children);
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

  n := jsonb_array_length(items);
  IF n IS NULL OR n < 2 OR n > 20 THEN RAISE EXCEPTION 'Tách thành 2 đến 20 lô con'; END IF;

  FOR child IN SELECT * FROM jsonb_array_elements(items) LOOP
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

  FOR child IN SELECT * FROM jsonb_array_elements(items) LOOP
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