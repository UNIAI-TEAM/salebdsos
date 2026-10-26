CREATE OR REPLACE FUNCTION public.agency_routing_view(p_tenant uuid,p_agency uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.agencies; master boolean; manager boolean; BEGIN
 SELECT * INTO a FROM public.agencies WHERE id=p_agency;
 IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy đại lý'; END IF;
 master:=coalesce(a.tenant_id=p_tenant AND private.has_tenant_role_in(p_tenant,ARRAY['owner','admin','manager']::public.app_role[]),false);
 manager:=coalesce(a.partner_tenant_id=p_tenant AND private.has_tenant_role_in(p_tenant,ARRAY['owner','admin','manager']::public.app_role[]),false);
 IF auth.uid() IS NULL OR NOT private.is_tenant_member(p_tenant) OR NOT coalesce(master OR (a.partner_tenant_id=p_tenant AND public.can_view_agency_inventory(a.id)),false) THEN RAISE EXCEPTION 'Không có quyền xem phân khách'; END IF;
 RETURN jsonb_build_object('canConfigure',coalesce(a.tenant_id=p_tenant AND private.has_tenant_role_in(p_tenant,ARRAY['owner','admin']::public.app_role[]),false),'canReassign',manager,
 'projects',CASE WHEN master THEN coalesce((SELECT jsonb_agg(x) FROM (SELECT id,name FROM public.projects WHERE tenant_id=p_tenant AND deleted_at IS NULL ORDER BY name LIMIT 500)x),'[]') ELSE '[]'::jsonb END,
 'rules',coalesce((SELECT jsonb_agg(x) FROM(SELECT r.id,r.project_id,p.name AS project_name,r.enabled,r.sla_minutes FROM public.agency_lead_rules r JOIN public.projects p ON p.id=r.project_id WHERE r.agency_id=a.id)x),'[]'),
 'sales',CASE WHEN manager THEN coalesce((SELECT jsonb_agg(x) FROM(SELECT pool.user_id,coalesce(p.full_name,p.email,'Sale') AS name FROM public.agency_sale_pool(a.id) pool LEFT JOIN public.profiles p ON p.user_id=pool.user_id)x),'[]') ELSE '[]'::jsonb END,
 'referrals',coalesce((SELECT jsonb_agg(x) FROM(SELECT f.id,l.full_name,l.phone,l.email,l.source,p.name AS project_name,f.sale_user_id,coalesce(pr.full_name,'Sale') AS sale_name,f.created_at,f.sla_due_at,f.responded_at,f.status,f.history,(NOT master AND f.partner_tenant_id=p_tenant) AS canUpdate FROM public.agency_lead_referrals f JOIN public.leads l ON l.id=f.lead_id AND l.tenant_id=f.tenant_id AND l.deleted_at IS NULL JOIN public.projects p ON p.id=f.project_id AND p.tenant_id=f.tenant_id LEFT JOIN public.profiles pr ON pr.user_id=f.sale_user_id WHERE f.agency_id=a.id AND (master OR (f.partner_tenant_id=p_tenant AND (manager OR f.sale_user_id=auth.uid()))) ORDER BY f.created_at DESC LIMIT 200)x),'[]'));
END $$;
CREATE OR REPLACE FUNCTION public.agency_referral_action(p_id uuid,p_action text,p_sale uuid DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE f public.agency_lead_referrals; BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Cần đăng nhập'; END IF;
 SELECT * INTO f FROM public.agency_lead_referrals WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR NOT coalesce(public.can_view_agency_inventory(f.agency_id),false) OR NOT coalesce(private.is_tenant_member(f.partner_tenant_id),false) THEN RAISE EXCEPTION 'Không có quyền xử lý'; END IF;
 IF p_action='reassign' THEN
 IF NOT coalesce(private.has_tenant_role_in(f.partner_tenant_id,ARRAY['owner','admin','manager']::public.app_role[]),false) OR NOT EXISTS(SELECT 1 FROM public.agency_sale_pool(f.agency_id) WHERE user_id=p_sale) OR f.status<>'assigned' THEN RAISE EXCEPTION 'Không thể chuyển Sale'; END IF;
 UPDATE public.agency_lead_referrals SET sale_user_id=p_sale,history=history||jsonb_build_array(jsonb_build_object('action','reassigned','at',now(),'from',f.sale_user_id,'sale',p_sale,'actor',auth.uid())) WHERE id=p_id;
 INSERT INTO public.notifications(tenant_id,user_id,type,title,body,link) VALUES(f.partner_tenant_id,p_sale,'agency_lead','Khách được chuyển giao','SLA giữ nguyên thời hạn tiếp nhận khách.','/agencies');
 ELSIF p_action IN ('contacted','closed') THEN
 IF f.sale_user_id<>auth.uid() AND NOT coalesce(private.has_tenant_role_in(f.partner_tenant_id,ARRAY['owner','admin','manager']::public.app_role[]),false) THEN RAISE EXCEPTION 'Chỉ Sale phụ trách được cập nhật'; END IF;
 IF f.status='closed' OR (p_action='contacted' AND f.status<>'assigned') THEN RAISE EXCEPTION 'Trạng thái không hợp lệ'; END IF;
 UPDATE public.agency_lead_referrals SET status=p_action,responded_at=coalesce(responded_at,now()),history=history||jsonb_build_array(jsonb_build_object('action',p_action,'at',now(),'actor',auth.uid())) WHERE id=p_id;
 ELSE RAISE EXCEPTION 'Thao tác không hợp lệ'; END IF;
 INSERT INTO public.audit_logs(tenant_id,actor_user_id,action,entity,entity_id,diff) VALUES(f.partner_tenant_id,auth.uid(),'agency.referral_'||p_action,'agency_referral',p_id,jsonb_build_object('sale',p_sale));
END $$;