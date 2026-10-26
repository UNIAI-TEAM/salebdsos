DROP POLICY agency_read ON public.agencies;
CREATE POLICY agency_read ON public.agencies FOR SELECT TO authenticated USING (
 private.has_tenant_role_in(tenant_id,ARRAY['owner','admin','manager']::public.app_role[]) OR private.has_tenant_role_in(partner_tenant_id,ARRAY['owner','admin','manager']::public.app_role[]));
CREATE OR REPLACE FUNCTION public.agency_workspace(p_tenant uuid,p_agency uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.agencies; result jsonb; is_master boolean; is_partner_admin boolean; can_inventory boolean;
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_tenant_member(p_tenant) THEN RAISE EXCEPTION 'Không có quyền truy cập sàn'; END IF;
 is_master := private.has_tenant_role_in(p_tenant,ARRAY['owner','admin','manager']::public.app_role[]);
 SELECT jsonb_build_object('canCreate',private.has_tenant_role_in(p_tenant,ARRAY['owner','admin']::public.app_role[]),
 'agencies',coalesce((SELECT jsonb_agg(x) FROM (SELECT g.id,g.code,g.name,g.status,
 CASE WHEN is_master THEN g.tax_code END AS tax_code,
 CASE WHEN is_master THEN g.contact_name END AS contact_name,
 CASE WHEN is_master THEN g.phone END AS phone,
 CASE WHEN is_master THEN g.email END AS email,
 CASE WHEN is_master THEN g.address END AS address,
 CASE WHEN g.tenant_id=p_tenant AND is_master THEN g.notes END AS notes,
 g.partner_tenant_id,g.accepted_at,CASE WHEN g.tenant_id=p_tenant THEN 'master' ELSE 'partner' END AS side,
 t.name AS master_name,pt.name AS partner_name,pt.slug AS partner_slug,
 (SELECT count(*) FROM public.agency_allocations al WHERE al.agency_id=g.id AND al.status='active' AND (al.expires_at IS NULL OR al.expires_at>now()) AND public.can_view_agency_inventory(g.id)) AS allocated_count
 FROM public.agencies g JOIN public.tenants t ON t.id=g.tenant_id LEFT JOIN public.tenants pt ON pt.id=g.partner_tenant_id
 WHERE (g.tenant_id=p_tenant AND is_master) OR (g.partner_tenant_id=p_tenant AND (is_master OR public.can_view_agency_inventory(g.id))) ORDER BY g.created_at DESC LIMIT 200) x),'[]'::jsonb)) INTO result;
 IF p_agency IS NULL THEN RETURN result; END IF;
 SELECT * INTO a FROM public.agencies WHERE id=p_agency AND ((tenant_id=p_tenant AND is_master) OR (partner_tenant_id=p_tenant AND (is_master OR public.can_view_agency_inventory(id))));
 IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy đại lý hoặc không có quyền'; END IF;
 is_partner_admin := a.partner_tenant_id=p_tenant AND private.has_tenant_role_in(p_tenant,ARRAY['owner','admin']::public.app_role[]);
 can_inventory := public.can_view_agency_inventory(a.id);
 result := result || jsonb_build_object('detail',jsonb_build_object(
 'canEdit',a.tenant_id=p_tenant AND private.has_tenant_role_in(p_tenant,ARRAY['owner','admin']::public.app_role[]),
 'canAccept',is_partner_admin AND a.accepted_at IS NULL,
 'canAllocate',a.tenant_id=p_tenant AND private.has_tenant_role_in(p_tenant,ARRAY['owner','admin']::public.app_role[]),
 'canManageAccess',is_partner_admin AND a.accepted_at IS NOT NULL,
 'canViewInventory',can_inventory,
 'allocations',CASE WHEN can_inventory THEN coalesce((SELECT jsonb_agg(x) FROM (SELECT al.id,al.project_id,al.product_id,al.status,al.expires_at,al.created_at,p.name,p.code,p.area,p.price,p.currency,p.listing_status,p.zone,pr.name AS project_name
 FROM public.agency_allocations al JOIN public.products p ON p.id=al.product_id AND p.tenant_id=a.tenant_id AND p.project_id=al.project_id
 JOIN public.projects pr ON pr.id=al.project_id AND pr.tenant_id=a.tenant_id AND pr.deleted_at IS NULL
 WHERE al.agency_id=a.id AND (a.tenant_id=p_tenant OR (al.status='active' AND (al.expires_at IS NULL OR al.expires_at>now()) AND a.status='active')) ORDER BY al.created_at DESC LIMIT 200) x),'[]'::jsonb) ELSE '[]'::jsonb END,
 'people',CASE WHEN is_partner_admin THEN coalesce((SELECT jsonb_agg(x) FROM (SELECT DISTINCT r.user_id,coalesce(p.full_name,p.email,'Thành viên') AS name FROM public.user_roles r LEFT JOIN public.profiles p ON p.user_id=r.user_id WHERE r.tenant_id=a.partner_tenant_id ORDER BY name LIMIT 500) x),'[]'::jsonb) ELSE '[]'::jsonb END,
 'teams',CASE WHEN is_partner_admin THEN coalesce((SELECT jsonb_agg(x) FROM (SELECT id,name FROM public.teams WHERE tenant_id=a.partner_tenant_id AND deleted_at IS NULL ORDER BY name LIMIT 200) x),'[]'::jsonb) ELSE '[]'::jsonb END,
 'access',CASE WHEN is_partner_admin THEN coalesce((SELECT jsonb_agg(x) FROM (SELECT g.id,g.user_id,g.team_id,coalesce(t.name,p.full_name,p.email,'Thành viên') AS name FROM public.agency_access g LEFT JOIN public.teams t ON t.id=g.team_id LEFT JOIN public.profiles p ON p.user_id=g.user_id WHERE g.agency_id=a.id) x),'[]'::jsonb) ELSE '[]'::jsonb END));
 RETURN result;
END $$;