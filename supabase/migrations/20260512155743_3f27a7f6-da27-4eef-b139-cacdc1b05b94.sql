
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

DROP POLICY IF EXISTS tenants_insert ON public.tenants;
CREATE POLICY tenants_insert ON public.tenants FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
