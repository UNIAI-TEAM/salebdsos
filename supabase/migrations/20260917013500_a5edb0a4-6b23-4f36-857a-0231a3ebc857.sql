REVOKE ALL ON FUNCTION public.bump_project_qr_scan(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_project_qr_scan(text) TO service_role;