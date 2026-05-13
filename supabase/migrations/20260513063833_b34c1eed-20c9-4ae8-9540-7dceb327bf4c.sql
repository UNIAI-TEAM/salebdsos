
-- 1) chat_leads: tighten SELECT
DROP POLICY IF EXISTS "Authenticated users can read chat leads" ON public.chat_leads;
CREATE POLICY "Platform admins read chat leads"
  ON public.chat_leads FOR SELECT TO authenticated
  USING (public.is_platform_admin());

-- 2) Storage: replace open SELECT with tenant-member listing
DROP POLICY IF EXISTS "card-assets public read" ON storage.objects;
CREATE POLICY "card-assets tenant list"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'card-assets'
    AND public.is_tenant_member(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "project-assets read" ON storage.objects;
CREATE POLICY "project-assets tenant list"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-assets'
    AND public.is_tenant_member(((storage.foldername(name))[1])::uuid)
  );

-- 3) Lock down SECURITY DEFINER functions
-- Revoke from PUBLIC + anon for everything definer
REVOKE EXECUTE ON FUNCTION public.aggregate_interaction_events_daily(date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_tenant_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_tenant_role_in(uuid, app_role[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_tenant_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.register_agency(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.accept_invitation(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ensure_default_pipeline_stages(uuid) FROM PUBLIC, anon;

-- Re-grant only what authenticated app code needs
GRANT EXECUTE ON FUNCTION public.has_tenant_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_tenant_role_in(uuid, app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_agency(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_default_pipeline_stages(uuid) TO authenticated;
