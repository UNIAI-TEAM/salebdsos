CREATE TABLE public.agency_lead_rules(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id), project_id uuid NOT NULL REFERENCES public.projects(id), agency_id uuid NOT NULL REFERENCES public.agencies(id), enabled boolean NOT NULL DEFAULT true, sla_minutes integer NOT NULL DEFAULT 30 CHECK(sla_minutes BETWEEN 5 AND 1440), UNIQUE(project_id,agency_id));
GRANT SELECT ON public.agency_lead_rules TO authenticated; GRANT ALL ON public.agency_lead_rules TO service_role;
ALTER TABLE public.agency_lead_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY agency_rules_read ON public.agency_lead_rules FOR SELECT TO authenticated USING(private.has_tenant_role_in(tenant_id,ARRAY['owner','admin','manager']::public.app_role[]));
CREATE TABLE public.agency_lead_referrals(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id), partner_tenant_id uuid NOT NULL REFERENCES public.tenants(id), agency_id uuid NOT NULL REFERENCES public.agencies(id), lead_id uuid NOT NULL UNIQUE REFERENCES public.leads(id), project_id uuid NOT NULL REFERENCES public.projects(id), sale_user_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), sla_due_at timestamptz NOT NULL, responded_at timestamptz, status text NOT NULL DEFAULT 'assigned' CHECK(status IN ('assigned','contacted','closed')), history jsonb NOT NULL DEFAULT '[]');
GRANT SELECT ON public.agency_lead_referrals TO authenticated; GRANT ALL ON public.agency_lead_referrals TO service_role;
ALTER TABLE public.agency_lead_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY agency_referrals_read ON public.agency_lead_referrals FOR SELECT TO authenticated USING(private.has_tenant_role_in(tenant_id,ARRAY['owner','admin','manager']::public.app_role[]) OR (public.can_view_agency_inventory(agency_id) AND private.is_tenant_member(partner_tenant_id) AND (sale_user_id=auth.uid() OR private.has_tenant_role_in(partner_tenant_id,ARRAY['owner','admin','manager']::public.app_role[]))));
CREATE INDEX agency_referral_load ON public.agency_lead_referrals(agency_id,status,created_at);
CREATE OR REPLACE FUNCTION public.agency_sale_pool(p_agency uuid) RETURNS TABLE(user_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT DISTINCT r.user_id FROM public.agencies a JOIN public.user_roles r ON r.tenant_id=a.partner_tenant_id WHERE a.id=p_agency AND a.status='active' AND a.accepted_at IS NOT NULL AND r.role IN ('agent','manager','owner','admin') AND EXISTS(SELECT 1 FROM public.agency_access g WHERE g.agency_id=a.id AND (g.user_id=r.user_id OR EXISTS(SELECT 1 FROM public.team_members m JOIN public.teams t ON t.id=m.team_id WHERE m.team_id=g.team_id AND m.user_id=r.user_id AND m.tenant_id=a.partner_tenant_id AND t.tenant_id=a.partner_tenant_id AND t.deleted_at IS NULL)))
$$;
REVOKE ALL ON FUNCTION public.agency_sale_pool(uuid) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.agency_sale_pool(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.route_agency_lead(p_lead uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE l public.leads; aid uuid; partner uuid; mins integer; sale uuid; rid uuid; due timestamptz;
BEGIN
 SELECT * INTO l FROM public.leads WHERE id=p_lead FOR UPDATE;
 IF NOT FOUND OR l.deleted_at IS NOT NULL OR l.project_id IS NULL OR l.owner_user_id IS NOT NULL OR coalesce(l.meta->>'shared_agency_routing','false')<>'true' THEN RETURN NULL; END IF;
 IF EXISTS(SELECT 1 FROM public.agency_lead_referrals WHERE lead_id=l.id) THEN RETURN (SELECT id FROM public.agency_lead_referrals WHERE lead_id=l.id); END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('agency-routing:'||l.tenant_id::text,0));
 SELECT g.id,g.partner_tenant_id,r.sla_minutes INTO aid,partner,mins FROM public.agency_lead_rules r JOIN public.agencies g ON g.id=r.agency_id
 WHERE r.tenant_id=l.tenant_id AND r.project_id=l.project_id AND r.enabled AND g.tenant_id=l.tenant_id AND g.status='active' AND g.accepted_at IS NOT NULL
 AND EXISTS(SELECT 1 FROM public.agency_allocations al WHERE al.agency_id=g.id AND al.project_id=l.project_id AND al.status='active' AND (al.expires_at IS NULL OR al.expires_at>now()) AND (l.meta->>'product_id' IS NULL OR al.product_id::text=l.meta->>'product_id'))
 AND EXISTS(SELECT 1 FROM public.agency_sale_pool(g.id))
 ORDER BY (SELECT count(*) FROM public.agency_lead_referrals f WHERE f.agency_id=g.id AND f.status='assigned' AND f.responded_at IS NULL), (SELECT count(*) FROM public.agency_lead_referrals f WHERE f.agency_id=g.id AND f.created_at>=now()-interval '30 days'),g.id LIMIT 1;
 IF aid IS NULL THEN RETURN NULL; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('agency-sale:'||partner::text,0));
 SELECT p.user_id INTO sale FROM public.agency_sale_pool(aid) p ORDER BY
 (SELECT count(*) FROM public.agency_lead_referrals f WHERE f.partner_tenant_id=partner AND f.sale_user_id=p.user_id AND f.status='assigned' AND f.responded_at IS NULL),
 (SELECT count(*) FROM public.leads ll WHERE ll.tenant_id=partner AND ll.owner_user_id=p.user_id AND ll.deleted_at IS NULL AND ll.created_at>=now()-interval '30 days')+(SELECT count(*) FROM public.agency_lead_referrals f WHERE f.partner_tenant_id=partner AND f.sale_user_id=p.user_id AND f.created_at>=now()-interval '30 days'),p.user_id LIMIT 1;
 due:=l.created_at+make_interval(mins=>mins);
 INSERT INTO public.agency_lead_referrals(tenant_id,partner_tenant_id,agency_id,lead_id,project_id,sale_user_id,sla_due_at,history) VALUES(l.tenant_id,partner,aid,l.id,l.project_id,sale,due,jsonb_build_array(jsonb_build_object('action','assigned','at',now(),'sale',sale))) RETURNING id INTO rid;
 INSERT INTO public.notifications(tenant_id,user_id,type,title,body,link) VALUES(partner,sale,'agency_lead','Khách mới từ sàn tổng','Có khách mới được giao. SLA '||mins||' phút.','/agencies');
 INSERT INTO public.audit_logs(tenant_id,action,entity,entity_id,diff) VALUES(l.tenant_id,'agency.lead_assigned','agency_referral',rid,jsonb_build_object('agency_id',aid,'sale',sale,'sla_due_at',due)); RETURN rid;
END $$;
REVOKE ALL ON FUNCTION public.route_agency_lead(uuid) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.route_agency_lead(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.agency_route_after_entry() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN PERFORM public.route_agency_lead(NEW.id); RETURN NEW; END $$;
CREATE TRIGGER agency_route_after_entry AFTER INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION public.agency_route_after_entry();
CREATE OR REPLACE FUNCTION public.agency_routing_save(p_tenant uuid,p_agency uuid,p_project uuid,p_enabled boolean,p_sla integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT private.has_tenant_role_in(p_tenant,ARRAY['owner','admin']::public.app_role[]) THEN RAISE EXCEPTION 'Chỉ quản trị sàn tổng được cấu hình'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.agencies WHERE id=p_agency AND tenant_id=p_tenant AND accepted_at IS NOT NULL AND status='active') OR NOT EXISTS(SELECT 1 FROM public.projects WHERE id=p_project AND tenant_id=p_tenant AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Đại lý hoặc dự án không hợp lệ'; END IF;
 IF p_enabled IS NULL OR p_sla IS NULL OR p_sla NOT BETWEEN 5 AND 1440 THEN RAISE EXCEPTION 'SLA không hợp lệ'; END IF;
 IF p_enabled AND (NOT EXISTS(SELECT 1 FROM public.agency_sale_pool(p_agency)) OR NOT EXISTS(SELECT 1 FROM public.agency_allocations WHERE agency_id=p_agency AND project_id=p_project AND status='active' AND (expires_at IS NULL OR expires_at>now()))) THEN RAISE EXCEPTION 'Cần cấp giỏ hàng và quyền cho Sale/nhóm trước'; END IF;
 INSERT INTO public.agency_lead_rules(tenant_id,project_id,agency_id,enabled,sla_minutes) VALUES(p_tenant,p_project,p_agency,p_enabled,p_sla) ON CONFLICT(project_id,agency_id) DO UPDATE SET enabled=excluded.enabled,sla_minutes=excluded.sla_minutes;
 INSERT INTO public.audit_logs(tenant_id,actor_user_id,action,entity,entity_id,diff) VALUES(p_tenant,auth.uid(),'agency.routing_saved','agency',p_agency,jsonb_build_object('project',p_project,'enabled',p_enabled,'sla',p_sla));
END $$;
REVOKE ALL ON FUNCTION public.agency_routing_save(uuid,uuid,uuid,boolean,integer) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.agency_routing_save(uuid,uuid,uuid,boolean,integer) TO authenticated;
CREATE OR REPLACE FUNCTION public.agency_referral_action(p_id uuid,p_action text,p_sale uuid DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE f public.agency_lead_referrals; BEGIN
 SELECT * INTO f FROM public.agency_lead_referrals WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR NOT public.can_view_agency_inventory(f.agency_id) OR NOT private.is_tenant_member(f.partner_tenant_id) THEN RAISE EXCEPTION 'Không có quyền xử lý'; END IF;
 IF p_action='reassign' THEN
 IF NOT private.has_tenant_role_in(f.partner_tenant_id,ARRAY['owner','admin','manager']::public.app_role[]) OR NOT EXISTS(SELECT 1 FROM public.agency_sale_pool(f.agency_id) WHERE user_id=p_sale) OR f.status<>'assigned' THEN RAISE EXCEPTION 'Không thể chuyển Sale'; END IF;
 UPDATE public.agency_lead_referrals SET sale_user_id=p_sale,history=history||jsonb_build_array(jsonb_build_object('action','reassigned','at',now(),'from',f.sale_user_id,'sale',p_sale,'actor',auth.uid())) WHERE id=p_id;
 INSERT INTO public.notifications(tenant_id,user_id,type,title,body,link) VALUES(f.partner_tenant_id,p_sale,'agency_lead','Khách được chuyển giao','SLA giữ nguyên thời hạn tiếp nhận khách.','/agencies');
 ELSIF p_action IN ('contacted','closed') THEN
 IF f.sale_user_id<>auth.uid() AND NOT private.has_tenant_role_in(f.partner_tenant_id,ARRAY['owner','admin','manager']::public.app_role[]) THEN RAISE EXCEPTION 'Chỉ Sale phụ trách được cập nhật'; END IF;
 IF f.status='closed' OR (p_action='contacted' AND f.status<>'assigned') THEN RAISE EXCEPTION 'Trạng thái không hợp lệ'; END IF;
 UPDATE public.agency_lead_referrals SET status=p_action,responded_at=coalesce(responded_at,now()),history=history||jsonb_build_array(jsonb_build_object('action',p_action,'at',now(),'actor',auth.uid())) WHERE id=p_id;
 ELSE RAISE EXCEPTION 'Thao tác không hợp lệ'; END IF;
 INSERT INTO public.audit_logs(tenant_id,actor_user_id,action,entity,entity_id,diff) VALUES(f.partner_tenant_id,auth.uid(),'agency.referral_'||p_action,'agency_referral',p_id,jsonb_build_object('sale',p_sale));
END $$;
REVOKE ALL ON FUNCTION public.agency_referral_action(uuid,text,uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.agency_referral_action(uuid,text,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.agency_routing_view(p_tenant uuid,p_agency uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.agencies; master boolean; manager boolean; BEGIN
 SELECT * INTO a FROM public.agencies WHERE id=p_agency;
 IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy đại lý'; END IF;
 master:=a.tenant_id=p_tenant AND private.has_tenant_role_in(p_tenant,ARRAY['owner','admin','manager']::public.app_role[]);
 manager:=a.partner_tenant_id=p_tenant AND private.has_tenant_role_in(p_tenant,ARRAY['owner','admin','manager']::public.app_role[]);
 IF auth.uid() IS NULL OR NOT private.is_tenant_member(p_tenant) OR NOT coalesce(master OR (a.partner_tenant_id=p_tenant AND public.can_view_agency_inventory(a.id)),false) THEN RAISE EXCEPTION 'Không có quyền xem phân khách'; END IF;
 RETURN jsonb_build_object('canConfigure',a.tenant_id=p_tenant AND private.has_tenant_role_in(p_tenant,ARRAY['owner','admin']::public.app_role[]),'canReassign',manager,
 'projects',CASE WHEN master THEN coalesce((SELECT jsonb_agg(x) FROM (SELECT id,name FROM public.projects WHERE tenant_id=p_tenant AND deleted_at IS NULL ORDER BY name LIMIT 500)x),'[]') ELSE '[]'::jsonb END,
 'rules',coalesce((SELECT jsonb_agg(x) FROM(SELECT r.id,r.project_id,p.name AS project_name,r.enabled,r.sla_minutes FROM public.agency_lead_rules r JOIN public.projects p ON p.id=r.project_id WHERE r.agency_id=a.id)x),'[]'),
 'sales',CASE WHEN manager THEN coalesce((SELECT jsonb_agg(x) FROM(SELECT pool.user_id,coalesce(p.full_name,p.email,'Sale') AS name FROM public.agency_sale_pool(a.id) pool LEFT JOIN public.profiles p ON p.user_id=pool.user_id)x),'[]') ELSE '[]'::jsonb END,
 'referrals',coalesce((SELECT jsonb_agg(x) FROM(SELECT f.id,l.full_name,l.phone,l.email,l.source,p.name AS project_name,f.sale_user_id,coalesce(pr.full_name,'Sale') AS sale_name,f.created_at,f.sla_due_at,f.responded_at,f.status,f.history,(NOT master) AS canUpdate FROM public.agency_lead_referrals f JOIN public.leads l ON l.id=f.lead_id AND l.tenant_id=f.tenant_id AND l.deleted_at IS NULL JOIN public.projects p ON p.id=f.project_id AND p.tenant_id=f.tenant_id LEFT JOIN public.profiles pr ON pr.user_id=f.sale_user_id WHERE f.agency_id=a.id AND (master OR manager OR f.sale_user_id=auth.uid()) ORDER BY f.created_at DESC LIMIT 200)x),'[]'));
END $$;
REVOKE ALL ON FUNCTION public.agency_routing_view(uuid,uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.agency_routing_view(uuid,uuid) TO authenticated;