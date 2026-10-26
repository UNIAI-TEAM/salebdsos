CREATE TABLE public.agencies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 partner_tenant_id uuid REFERENCES public.tenants(id), code text NOT NULL, name text NOT NULL,
 tax_code text, contact_name text, phone text, email text, address text, notes text,
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused')),
 accepted_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,code), CHECK(partner_tenant_id IS NULL OR partner_tenant_id <> tenant_id)
);
GRANT SELECT ON public.agencies TO authenticated;
GRANT ALL ON public.agencies TO service_role;
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY agency_read ON public.agencies FOR SELECT TO authenticated USING (
 private.has_tenant_role_in(tenant_id,ARRAY['owner','admin','manager']::public.app_role[])
 OR (partner_tenant_id IS NOT NULL AND private.is_tenant_member(partner_tenant_id)));
CREATE TABLE public.agency_allocations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), agency_id uuid NOT NULL REFERENCES public.agencies(id),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id), project_id uuid NOT NULL REFERENCES public.projects(id),
 product_id uuid NOT NULL REFERENCES public.products(id), status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked')),
 expires_at timestamptz, assigned_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz
);
GRANT SELECT ON public.agency_allocations TO authenticated;
GRANT ALL ON public.agency_allocations TO service_role;
ALTER TABLE public.agency_allocations ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX agency_product_active ON public.agency_allocations(product_id) WHERE status='active';
CREATE INDEX agency_allocation_lookup ON public.agency_allocations(agency_id,project_id);
CREATE TABLE public.agency_access (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), agency_id uuid NOT NULL REFERENCES public.agencies(id),
 user_id uuid, team_id uuid REFERENCES public.teams(id), created_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((user_id IS NOT NULL)::integer + (team_id IS NOT NULL)::integer = 1)
);
GRANT SELECT ON public.agency_access TO authenticated;
GRANT ALL ON public.agency_access TO service_role;
ALTER TABLE public.agency_access ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX agency_access_user_unique ON public.agency_access(agency_id,user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX agency_access_team_unique ON public.agency_access(agency_id,team_id) WHERE team_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.can_view_agency_inventory(p_agency uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS(SELECT 1 FROM public.agencies a WHERE a.id=p_agency AND (
 private.has_tenant_role_in(a.tenant_id,ARRAY['owner','admin','manager']::public.app_role[])
 OR (a.status='active' AND a.accepted_at IS NOT NULL AND private.is_tenant_member(a.partner_tenant_id) AND (
 private.has_tenant_role_in(a.partner_tenant_id,ARRAY['owner','admin','manager']::public.app_role[])
 OR EXISTS(SELECT 1 FROM public.agency_access g WHERE g.agency_id=a.id AND (
 g.user_id=auth.uid() OR EXISTS(SELECT 1 FROM public.team_members m JOIN public.teams t ON t.id=m.team_id
 WHERE m.team_id=g.team_id AND m.user_id=auth.uid() AND m.tenant_id=a.partner_tenant_id AND t.tenant_id=a.partner_tenant_id AND t.deleted_at IS NULL)))))))
$$;
REVOKE ALL ON FUNCTION public.can_view_agency_inventory(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_view_agency_inventory(uuid) TO authenticated,service_role;
CREATE POLICY agency_allocation_read ON public.agency_allocations FOR SELECT TO authenticated USING(public.can_view_agency_inventory(agency_id));
CREATE POLICY agency_access_read ON public.agency_access FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.agencies a WHERE a.id=agency_id AND (
 private.has_tenant_role_in(a.tenant_id,ARRAY['owner','admin','manager']::public.app_role[]) OR private.has_tenant_role_in(a.partner_tenant_id,ARRAY['owner','admin','manager']::public.app_role[]))));
CREATE OR REPLACE FUNCTION public.agency_workspace(p_tenant uuid,p_agency uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.agencies; result jsonb; is_master boolean; is_partner_admin boolean; can_inventory boolean;
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_tenant_member(p_tenant) THEN RAISE EXCEPTION 'Không có quyền truy cập sàn'; END IF;
 is_master := private.has_tenant_role_in(p_tenant,ARRAY['owner','admin','manager']::public.app_role[]);
 SELECT jsonb_build_object('canCreate',private.has_tenant_role_in(p_tenant,ARRAY['owner','admin']::public.app_role[]),
 'agencies',coalesce((SELECT jsonb_agg(x) FROM (SELECT g.id,g.code,g.name,g.status,g.tax_code,g.contact_name,g.phone,g.email,g.address,g.notes,g.partner_tenant_id,g.accepted_at,
 CASE WHEN g.tenant_id=p_tenant THEN 'master' ELSE 'partner' END AS side,
 t.name AS master_name,pt.name AS partner_name,pt.slug AS partner_slug,
 (SELECT count(*) FROM public.agency_allocations al WHERE al.agency_id=g.id AND al.status='active' AND (al.expires_at IS NULL OR al.expires_at>now()) AND public.can_view_agency_inventory(g.id)) AS allocated_count
 FROM public.agencies g JOIN public.tenants t ON t.id=g.tenant_id LEFT JOIN public.tenants pt ON pt.id=g.partner_tenant_id
 WHERE (g.tenant_id=p_tenant AND is_master) OR g.partner_tenant_id=p_tenant ORDER BY g.created_at DESC LIMIT 200) x),'[]'::jsonb)) INTO result;
 IF p_agency IS NULL THEN RETURN result; END IF;
 SELECT * INTO a FROM public.agencies WHERE id=p_agency AND ((tenant_id=p_tenant AND is_master) OR partner_tenant_id=p_tenant);
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
REVOKE ALL ON FUNCTION public.agency_workspace(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.agency_workspace(uuid,uuid) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.agency_command(p_tenant uuid,p_action text,p_data jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.agencies; aid uuid := nullif(p_data->>'id','')::uuid; target uuid; product public.products;
 ids uuid[]; pid uuid; until_date timestamptz := nullif(p_data->>'expiresAt','')::timestamptz; subject uuid; team uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_tenant_member(p_tenant) THEN RAISE EXCEPTION 'Không có quyền truy cập sàn'; END IF;
 IF p_action='save' THEN
 IF NOT private.has_tenant_role_in(p_tenant,ARRAY['owner','admin']::public.app_role[]) THEN RAISE EXCEPTION 'Chỉ quản trị sàn tổng được sửa hồ sơ'; END IF;
 IF char_length(trim(coalesce(p_data->>'name','')))<2 OR char_length(p_data->>'name')>160 OR char_length(trim(coalesce(p_data->>'code','')))<1 OR char_length(p_data->>'code')>40 THEN RAISE EXCEPTION 'Tên hoặc mã đại lý không hợp lệ'; END IF;
 IF aid IS NOT NULL THEN SELECT * INTO a FROM public.agencies WHERE id=aid AND tenant_id=p_tenant FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy đại lý'; END IF; END IF;
 IF nullif(trim(p_data->>'partnerSlug'),'') IS NOT NULL THEN
 SELECT id INTO target FROM public.tenants WHERE slug=trim(p_data->>'partnerSlug') AND deleted_at IS NULL AND status='active';
 IF target IS NULL OR target=p_tenant THEN RAISE EXCEPTION 'Mã sàn đối tác không hợp lệ'; END IF;
 END IF;
 IF a.accepted_at IS NOT NULL AND target IS DISTINCT FROM a.partner_tenant_id THEN RAISE EXCEPTION 'Không thể đổi sàn đối tác đã xác nhận'; END IF;
 IF aid IS NULL THEN
 INSERT INTO public.agencies(tenant_id,partner_tenant_id,code,name,tax_code,contact_name,phone,email,address,notes) VALUES(p_tenant,target,trim(p_data->>'code'),trim(p_data->>'name'),p_data->>'taxCode',p_data->>'contactName',p_data->>'phone',p_data->>'email',p_data->>'address',p_data->>'notes') RETURNING id INTO aid;
 ELSE
 UPDATE public.agencies SET partner_tenant_id=target,code=trim(p_data->>'code'),name=trim(p_data->>'name'),tax_code=p_data->>'taxCode',contact_name=p_data->>'contactName',phone=p_data->>'phone',email=p_data->>'email',address=p_data->>'address',notes=p_data->>'notes',updated_at=now() WHERE id=aid;
 END IF;
 ELSE
 SELECT * INTO a FROM public.agencies WHERE id=aid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy đại lý'; END IF;
 IF p_action='accept' THEN
 IF a.partner_tenant_id IS DISTINCT FROM p_tenant OR NOT private.has_tenant_role_in(p_tenant,ARRAY['owner','admin']::public.app_role[]) THEN RAISE EXCEPTION 'Chỉ quản trị đại lý được xác nhận'; END IF;
 IF a.accepted_at IS NOT NULL THEN RAISE EXCEPTION 'Đã xác nhận liên kết'; END IF;
 UPDATE public.agencies SET accepted_at=now(),status='active',updated_at=now() WHERE id=aid;
 ELSIF p_action='access_add' OR p_action='access_remove' THEN
 IF a.partner_tenant_id IS DISTINCT FROM p_tenant OR a.accepted_at IS NULL OR NOT private.has_tenant_role_in(p_tenant,ARRAY['owner','admin']::public.app_role[]) THEN RAISE EXCEPTION 'Chỉ quản trị đại lý được cấp quyền'; END IF;
 IF p_action='access_remove' THEN DELETE FROM public.agency_access WHERE id=(p_data->>'accessId')::uuid AND agency_id=aid; IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy quyền'; END IF;
 ELSE
 subject := nullif(p_data->>'userId','')::uuid; team := nullif(p_data->>'teamId','')::uuid;
 IF (subject IS NULL)=(team IS NULL) THEN RAISE EXCEPTION 'Chọn một Sale hoặc nhóm'; END IF;
 IF subject IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.user_roles WHERE tenant_id=p_tenant AND user_id=subject) THEN RAISE EXCEPTION 'Sale không thuộc đại lý'; END IF;
 IF team IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.teams WHERE id=team AND tenant_id=p_tenant AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Nhóm không thuộc đại lý'; END IF;
 INSERT INTO public.agency_access(agency_id,user_id,team_id) VALUES(aid,subject,team) ON CONFLICT DO NOTHING;
 END IF;
 ELSE
 IF a.tenant_id<>p_tenant OR NOT private.has_tenant_role_in(p_tenant,ARRAY['owner','admin']::public.app_role[]) THEN RAISE EXCEPTION 'Chỉ quản trị sàn tổng được phân phối'; END IF;
 IF p_action='status' THEN
 IF p_data->>'status' NOT IN ('active','paused') OR a.accepted_at IS NULL THEN RAISE EXCEPTION 'Đại lý chưa xác nhận liên kết'; END IF;
 UPDATE public.agencies SET status=p_data->>'status',updated_at=now() WHERE id=aid;
 ELSIF p_action='allocate' THEN
 IF a.status<>'active' OR a.accepted_at IS NULL THEN RAISE EXCEPTION 'Đại lý chưa hoạt động'; END IF;
 pid := (p_data->>'projectId')::uuid;
 IF NOT EXISTS(SELECT 1 FROM public.projects WHERE id=pid AND tenant_id=p_tenant AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Dự án không thuộc sàn tổng'; END IF;
 SELECT array_agg(DISTINCT value::uuid) INTO ids FROM jsonb_array_elements_text(p_data->'productIds');
 IF coalesce(array_length(ids,1),0) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Chọn từ 1 đến 100 căn'; END IF;
 IF until_date IS NOT NULL AND until_date<=now() THEN RAISE EXCEPTION 'Hạn cấp phải trong tương lai'; END IF;
 FOR product IN SELECT * FROM public.products WHERE id=ANY(ids) ORDER BY id FOR UPDATE LOOP
 IF product.tenant_id<>p_tenant OR product.project_id IS DISTINCT FROM pid OR product.listing_status<>'available' THEN RAISE EXCEPTION 'Căn không thuộc dự án hoặc không còn mở bán'; END IF;
 UPDATE public.agency_allocations SET status='revoked',revoked_at=now() WHERE product_id=product.id AND status='active' AND expires_at<=now();
 IF EXISTS(SELECT 1 FROM public.agency_allocations WHERE product_id=product.id AND status='active') THEN RAISE EXCEPTION 'Căn đã cấp cho đại lý khác hoặc đã được cấp'; END IF;
 END LOOP;
 IF (SELECT count(*) FROM public.products WHERE id=ANY(ids))<>array_length(ids,1) THEN RAISE EXCEPTION 'Có căn không tồn tại'; END IF;
 INSERT INTO public.agency_allocations(agency_id,tenant_id,project_id,product_id,expires_at,assigned_by) SELECT aid,p_tenant,pid,unnest(ids),until_date,auth.uid();
 ELSIF p_action='revoke' THEN
 UPDATE public.agency_allocations SET status='revoked',revoked_at=now() WHERE id=(p_data->>'allocationId')::uuid AND agency_id=aid AND status='active';
 IF NOT FOUND THEN RAISE EXCEPTION 'Căn không còn được cấp'; END IF;
 ELSE RAISE EXCEPTION 'Thao tác không hợp lệ'; END IF;
 END IF;
 END IF;
 INSERT INTO public.audit_logs(tenant_id,actor_user_id,action,entity,entity_id,diff) VALUES(p_tenant,auth.uid(),'agency.'||p_action,'agency',aid,p_data);
 RETURN aid;
END $$;
REVOKE ALL ON FUNCTION public.agency_command(uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.agency_command(uuid,text,jsonb) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.agency_catalog(p_tenant uuid,p_project uuid DEFAULT NULL,p_page integer DEFAULT 0) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT private.has_tenant_role_in(p_tenant,ARRAY['owner','admin']::public.app_role[]) THEN RAISE EXCEPTION 'Không có quyền cấp giỏ hàng'; END IF;
 RETURN jsonb_build_object('projects',coalesce((SELECT jsonb_agg(x) FROM (SELECT id,name FROM public.projects WHERE tenant_id=p_tenant AND deleted_at IS NULL ORDER BY name LIMIT 500) x),'[]'::jsonb),
 'total',(SELECT count(*) FROM public.products WHERE tenant_id=p_tenant AND project_id=p_project AND listing_status='available'),
 'products',coalesce((SELECT jsonb_agg(x) FROM (SELECT p.id,p.code,p.name,p.area,p.price,p.currency,
 EXISTS(SELECT 1 FROM public.agency_allocations al WHERE al.product_id=p.id AND al.status='active' AND (al.expires_at IS NULL OR al.expires_at>now())) AS allocated
 FROM public.products p WHERE p.tenant_id=p_tenant AND p.project_id=p_project AND p.listing_status='available' ORDER BY p.code,p.id LIMIT 100 OFFSET greatest(0,least(p_page,10000))*100) x),'[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.agency_catalog(uuid,uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.agency_catalog(uuid,uuid,integer) TO authenticated,service_role;