ALTER POLICY agency_allocation_read ON public.agency_allocations USING (
 EXISTS(SELECT 1 FROM public.agencies a WHERE a.id=agency_id AND a.tenant_id=agency_allocations.tenant_id AND private.has_tenant_role_in(a.tenant_id,ARRAY['owner','admin','manager']::public.app_role[]))
 OR (status='active' AND (expires_at IS NULL OR expires_at>now()) AND public.can_view_agency_inventory(agency_id) AND EXISTS(SELECT 1 FROM public.agencies a WHERE a.id=agency_id AND a.tenant_id=agency_allocations.tenant_id AND a.status='active' AND a.accepted_at IS NOT NULL AND private.is_tenant_member(a.partner_tenant_id))));
REVOKE SELECT ON public.agency_referral_handovers FROM authenticated;
REVOKE SELECT ON public.agency_lead_referrals FROM authenticated;
REVOKE SELECT ON public.agency_access FROM authenticated;
COMMENT ON TABLE public.agency_referral_handovers IS 'Raw cross-tenant history is service-only; authenticated callers use the checked and side-masked agency_routing_extended projection.';
COMMENT ON TABLE public.agency_lead_referrals IS 'Raw identities and history are service-only; authenticated callers use checked minimal referral projections.';
COMMENT ON TABLE public.agency_access IS 'Raw partner team/user grants are service-only; partner admins manage their own roster through agency_workspace and agency_command.';
DO $$ DECLARE d text; BEGIN
 SELECT pg_get_functiondef('public.agency_routing_extended(uuid,uuid)'::regprocedure) INTO d;
 d:=replace(d,'h.created_at,h.reason,fa.name AS from_agency,ta.name AS to_agency,','h.created_at,CASE WHEN master OR h.from_partner_id=h.to_partner_id THEN h.reason ELSE ''Bàn giao giữa đại lý'' END AS reason,CASE WHEN master OR h.from_partner_id=p_tenant THEN fa.name ELSE ''Sàn tổng'' END AS from_agency,CASE WHEN master OR h.to_partner_id=p_tenant THEN ta.name ELSE ''Sàn tổng'' END AS to_agency,');
 d:=replace(d,'(master OR h.from_partner_id=p_tenant OR h.to_partner_id=p_tenant)','(master OR (h.from_partner_id=p_tenant AND public.can_view_agency_inventory(h.from_agency_id)) OR (h.to_partner_id=p_tenant AND public.can_view_agency_inventory(h.to_agency_id)))');
 d:=replace(d,'''team_id'',f.team_id','''team_id'',CASE WHEN a.partner_tenant_id=p_tenant THEN f.team_id END');
 EXECUTE d;
 SELECT pg_get_functiondef('public.agency_workspace(uuid,uuid)'::regprocedure) INTO d;
 d:=replace(d,'IF auth.uid() IS NULL OR NOT private.is_tenant_member(p_tenant)','IF auth.uid() IS NULL OR NOT coalesce(private.is_tenant_member(p_tenant),false)');
 d:=replace(d,'WHERE al.agency_id=a.id AND (a.tenant_id=p_tenant','WHERE al.agency_id=a.id AND al.tenant_id=a.tenant_id AND (a.tenant_id=p_tenant');
 EXECUTE d;
END $$;