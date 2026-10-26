CREATE OR REPLACE FUNCTION public.can_read_agency_allocation(p_agency uuid,p_tenant uuid,p_status text,p_expires timestamptz) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.agencies a WHERE a.id=p_agency AND a.tenant_id=p_tenant AND (
 private.has_tenant_role_in(a.tenant_id,ARRAY['owner','admin','manager']::public.app_role[])
 OR (p_status='active' AND (p_expires IS NULL OR p_expires>now()) AND a.status='active' AND a.accepted_at IS NOT NULL AND private.is_tenant_member(a.partner_tenant_id) AND public.can_view_agency_inventory(a.id))))
$$;
REVOKE ALL ON FUNCTION public.can_read_agency_allocation(uuid,uuid,text,timestamptz) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.can_read_agency_allocation(uuid,uuid,text,timestamptz) TO authenticated,service_role;
ALTER POLICY agency_allocation_read ON public.agency_allocations USING(public.can_read_agency_allocation(agency_id,tenant_id,status,expires_at));