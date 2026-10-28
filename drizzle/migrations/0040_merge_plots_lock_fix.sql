-- FOR UPDATE không dùng cùng aggregate: khoá hàng trước, gom mảng sau
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
  locked int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Cần đăng nhập'; END IF;
  IF p_ids IS NULL OR cardinality(p_ids) < 2 OR cardinality(p_ids) > 20 THEN
    RAISE EXCEPTION 'Ghép từ 2 đến 20 lô';
  END IF;

  SELECT count(*) INTO locked FROM public.products WHERE id = ANY(p_ids) FOR UPDATE;
  IF locked <> cardinality(p_ids) THEN RAISE EXCEPTION 'Có lô không tồn tại'; END IF;
  SELECT array_agg(x ORDER BY x.id) INTO parents FROM public.products x WHERE x.id = ANY(p_ids);

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