CREATE OR REPLACE FUNCTION public.bump_sales_page_view(_page_id uuid, _tenant_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.sales_page_views (page_id, tenant_id, day, views, conversions)
  VALUES (_page_id, _tenant_id, CURRENT_DATE, 1, 0)
  ON CONFLICT (page_id, day) DO UPDATE SET views = public.sales_page_views.views + 1;
$$;

CREATE OR REPLACE FUNCTION public.bump_sales_page_conversion(_page_id uuid, _tenant_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.sales_page_views (page_id, tenant_id, day, views, conversions)
  VALUES (_page_id, _tenant_id, CURRENT_DATE, 0, 1)
  ON CONFLICT (page_id, day) DO UPDATE SET conversions = public.sales_page_views.conversions + 1;
$$;

REVOKE ALL ON FUNCTION public.bump_sales_page_view(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bump_sales_page_conversion(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_sales_page_view(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.bump_sales_page_conversion(uuid, uuid) TO service_role;