REVOKE SELECT ON public.agencies FROM authenticated;
GRANT SELECT (id,tenant_id,partner_tenant_id,code,name,status,accepted_at,created_at,updated_at) ON public.agencies TO authenticated;
COMMENT ON TABLE public.agencies IS 'Partner tenants remain isolated. Sensitive profile fields are exposed only through agency_workspace with role checks; notes are master-only.';