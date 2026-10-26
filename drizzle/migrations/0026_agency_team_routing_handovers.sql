CREATE TABLE public.agency_team_routing(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),agency_id uuid NOT NULL REFERENCES public.agencies(id),project_id uuid NOT NULL REFERENCES public.projects(id),partner_tenant_id uuid NOT NULL REFERENCES public.tenants(id),team_ids uuid[] NOT NULL DEFAULT '{}',UNIQUE(agency_id,project_id));
GRANT SELECT ON public.agency_team_routing TO authenticated; GRANT ALL ON public.agency_team_routing TO service_role;
ALTER TABLE public.agency_team_routing ENABLE ROW LEVEL SECURITY;
CREATE POLICY team_routing_read ON public.agency_team_routing FOR SELECT TO authenticated USING(private.has_tenant_role_in(partner_tenant_id,ARRAY['owner','admin','manager']::public.app_role[]));
ALTER TABLE public.agency_lead_referrals ADD COLUMN team_id uuid REFERENCES public.teams(id);
CREATE TABLE public.agency_referral_handovers(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),referral_id uuid NOT NULL REFERENCES public.agency_lead_referrals(id),master_tenant_id uuid NOT NULL REFERENCES public.tenants(id),from_partner_id uuid NOT NULL,to_partner_id uuid NOT NULL,from_agency_id uuid NOT NULL,to_agency_id uuid NOT NULL,from_sale_id uuid NOT NULL,to_sale_id uuid NOT NULL,from_team_id uuid,to_team_id uuid,reason text NOT NULL,actor uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.agency_referral_handovers TO authenticated; GRANT ALL ON public.agency_referral_handovers TO service_role;
ALTER TABLE public.agency_referral_handovers ENABLE ROW LEVEL SECURITY;
CREATE POLICY referral_handover_read ON public.agency_referral_handovers FOR SELECT TO authenticated USING(private.has_tenant_role_in(master_tenant_id,ARRAY['owner','admin','manager']::public.app_role[]) OR private.has_tenant_role_in(from_partner_id,ARRAY['owner','admin','manager']::public.app_role[]) OR private.has_tenant_role_in(to_partner_id,ARRAY['owner','admin','manager']::public.app_role[]));
CREATE OR REPLACE FUNCTION public.agency_project_pool(p_agency uuid,p_project uuid) RETURNS TABLE(user_id uuid,team_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 WITH cfg AS (SELECT team_ids FROM public.agency_team_routing WHERE agency_id=p_agency AND project_id=p_project), pool AS (SELECT s.user_id FROM public.agency_sale_pool(p_agency) s)
 SELECT p.user_id,t.id FROM pool p JOIN public.team_members m ON m.user_id=p.user_id JOIN public.teams t ON t.id=m.team_id JOIN public.agencies a ON a.id=p_agency AND a.partner_tenant_id=t.tenant_id AND m.tenant_id=t.tenant_id WHERE t.deleted_at IS NULL AND t.id=ANY(coalesce((SELECT team_ids FROM cfg),'{}'::uuid[]))
 UNION ALL SELECT p.user_id,NULL::uuid FROM pool p WHERE cardinality(coalesce((SELECT team_ids FROM cfg),'{}'::uuid[]))=0
$$;
REVOKE ALL ON FUNCTION public.agency_project_pool(uuid,uuid) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.agency_project_pool(uuid,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.agency_project_pick(p_agency uuid,p_project uuid) RETURNS TABLE(user_id uuid,team_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT p.user_id,p.team_id FROM public.agency_project_pool(p_agency,p_project) p JOIN public.agencies a ON a.id=p_agency ORDER BY
 (SELECT count(*) FROM public.agency_lead_referrals f WHERE f.partner_tenant_id=a.partner_tenant_id AND f.team_id=p.team_id AND f.status='assigned'),
 (SELECT count(*) FROM public.agency_lead_referrals f WHERE f.partner_tenant_id=a.partner_tenant_id AND f.team_id=p.team_id AND f.created_at>=now()-interval '30 days'),
 (SELECT count(*) FROM public.agency_lead_referrals f WHERE f.partner_tenant_id=a.partner_tenant_id AND f.sale_user_id=p.user_id AND f.status='assigned'),
 (SELECT count(*) FROM public.leads l WHERE l.tenant_id=a.partner_tenant_id AND l.owner_user_id=p.user_id AND l.deleted_at IS NULL AND l.created_at>=now()-interval '30 days')+(SELECT count(*) FROM public.agency_lead_referrals f WHERE f.partner_tenant_id=a.partner_tenant_id AND f.sale_user_id=p.user_id AND f.created_at>=now()-interval '30 days'),p.team_id,p.user_id LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.agency_project_pick(uuid,uuid) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.agency_project_pick(uuid,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.agency_team_rule_save(p_tenant uuid,p_agency uuid,p_project uuid,p_teams uuid[]) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.agencies; tid uuid; BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(private.has_tenant_role_in(p_tenant,ARRAY['owner','admin','manager']::public.app_role[]),false) THEN RAISE EXCEPTION 'Chỉ quản lý đại lý được cấu hình nhóm'; END IF;
 SELECT * INTO a FROM public.agencies WHERE id=p_agency AND partner_tenant_id=p_tenant AND accepted_at IS NOT NULL AND status='active';
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.agency_lead_rules WHERE agency_id=a.id AND project_id=p_project) OR p_teams IS NULL OR cardinality(p_teams)>30 THEN RAISE EXCEPTION 'Quy tắc không hợp lệ'; END IF;
 FOREACH tid IN ARRAY p_teams LOOP
 IF tid IS NULL OR NOT EXISTS(SELECT 1 FROM public.teams t WHERE t.id=tid AND t.tenant_id=p_tenant AND t.deleted_at IS NULL) OR NOT EXISTS(SELECT 1 FROM public.agency_sale_pool(a.id) s JOIN public.team_members m ON m.user_id=s.user_id AND m.team_id=tid AND m.tenant_id=p_tenant) THEN RAISE EXCEPTION 'Nhóm cần có Sale được cấp quyền giỏ hàng'; END IF;
 END LOOP;
 INSERT INTO public.agency_team_routing(agency_id,project_id,partner_tenant_id,team_ids) VALUES(a.id,p_project,p_tenant,p_teams) ON CONFLICT(agency_id,project_id) DO UPDATE SET team_ids=excluded.team_ids;
 INSERT INTO public.audit_logs(tenant_id,actor_user_id,action,entity,entity_id,diff) VALUES(p_tenant,auth.uid(),'agency.team_rule','agency',a.id,jsonb_build_object('project',p_project,'teams',p_teams));
END $$;
REVOKE ALL ON FUNCTION public.agency_team_rule_save(uuid,uuid,uuid,uuid[]) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.agency_team_rule_save(uuid,uuid,uuid,uuid[]) TO authenticated;
DO $$ DECLARE d text; old text; BEGIN
 SELECT pg_get_functiondef('public.route_agency_lead(uuid)'::regprocedure) INTO d;
 d:=replace(d,'rid uuid; due timestamptz;','rid uuid; due timestamptz; chosen_team uuid;');
 d:=replace(d,'EXISTS(SELECT 1 FROM public.agency_sale_pool(g.id))','EXISTS(SELECT 1 FROM public.agency_project_pool(g.id,l.project_id))');
 old:=substring(d FROM ' SELECT p.user_id INTO sale FROM public.agency_sale_pool\(aid\) p ORDER BY[\s\S]*?p.user_id LIMIT 1;');
 IF old IS NULL THEN RAISE EXCEPTION 'Routing definition mismatch'; END IF;
 d:=replace(d,old,' SELECT p.user_id,p.team_id INTO sale,chosen_team FROM public.agency_project_pick(aid,l.project_id) p;');
 d:=replace(d,'sale_user_id,sla_due_at,history)','sale_user_id,team_id,sla_due_at,history)');
 d:=replace(d,'l.project_id,sale,due,','l.project_id,sale,chosen_team,due,');
 d:=replace(d,'''sale'',sale)))','''sale'',sale,''team'',chosen_team)))');
 EXECUTE d;
END $$;
CREATE OR REPLACE FUNCTION public.agency_referral_handover(p_tenant uuid,p_id uuid,p_agency uuid,p_sale uuid,p_team uuid,p_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE f public.agency_lead_referrals; a public.agencies; l public.leads; target public.agencies; sale uuid; team uuid; master boolean; partner boolean; BEGIN
 IF auth.uid() IS NULL OR char_length(trim(coalesce(p_reason,''))) NOT BETWEEN 2 AND 500 THEN RAISE EXCEPTION 'Nhập lý do bàn giao'; END IF;
 SELECT * INTO f FROM public.agency_lead_referrals WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR f.status='closed' THEN RAISE EXCEPTION 'Không thể bàn giao khách đã kết thúc'; END IF;
 SELECT * INTO a FROM public.agencies WHERE id=f.agency_id;
 master:=p_tenant=f.tenant_id AND coalesce(private.has_tenant_role_in(p_tenant,ARRAY['owner','admin','manager']::public.app_role[]),false);
 partner:=p_tenant=f.partner_tenant_id AND coalesce(private.has_tenant_role_in(p_tenant,ARRAY['owner','admin','manager']::public.app_role[]),false) AND coalesce(public.can_view_agency_inventory(a.id),false);
 IF NOT coalesce(master OR partner,false) THEN RAISE EXCEPTION 'Không có quyền bàn giao'; END IF;
 SELECT * INTO target FROM public.agencies WHERE id=p_agency AND tenant_id=f.tenant_id AND status='active' AND accepted_at IS NOT NULL;
 IF NOT FOUND OR (NOT master AND target.id<>a.id) THEN RAISE EXCEPTION 'Chỉ sàn tổng được chuyển đại lý'; END IF;
 SELECT * INTO l FROM public.leads WHERE id=f.lead_id AND deleted_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Khách không còn hoạt động'; END IF;
 IF target.id<>a.id AND NOT EXISTS(SELECT 1 FROM public.agency_lead_rules r WHERE r.agency_id=target.id AND r.project_id=f.project_id AND r.enabled) THEN RAISE EXCEPTION 'Đại lý chưa bật nhận khách dự án'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.agency_allocations al WHERE al.agency_id=target.id AND al.project_id=f.project_id AND al.status='active' AND (al.expires_at IS NULL OR al.expires_at>now()) AND (l.meta->>'product_id' IS NULL OR al.product_id::text=l.meta->>'product_id')) THEN RAISE EXCEPTION 'Đại lý chưa có giỏ hàng phù hợp'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('agency-sale:'||target.partner_tenant_id::text,0));
 IF master AND target.id<>a.id THEN
 SELECT p.user_id,p.team_id INTO sale,team FROM public.agency_project_pick(target.id,f.project_id) p;
 ELSE
 SELECT p.user_id,p.team_id INTO sale,team FROM public.agency_project_pool(target.id,f.project_id) p WHERE p.user_id=p_sale AND p.team_id IS NOT DISTINCT FROM p_team LIMIT 1;
 END IF;
 IF sale IS NULL OR (target.id=a.id AND sale=f.sale_user_id AND team IS NOT DISTINCT FROM f.team_id) THEN RAISE EXCEPTION 'Chọn nhóm/Sale khác được phép nhận khách'; END IF;
 INSERT INTO public.agency_referral_handovers(referral_id,master_tenant_id,from_partner_id,to_partner_id,from_agency_id,to_agency_id,from_sale_id,to_sale_id,from_team_id,to_team_id,reason,actor) VALUES(f.id,f.tenant_id,f.partner_tenant_id,target.partner_tenant_id,a.id,target.id,f.sale_user_id,sale,f.team_id,team,trim(p_reason),auth.uid());
 UPDATE public.agency_lead_referrals SET agency_id=target.id,partner_tenant_id=target.partner_tenant_id,sale_user_id=sale,team_id=team,
 history=CASE WHEN f.partner_tenant_id<>target.partner_tenant_id THEN jsonb_build_array(jsonb_build_object('action','assigned','at',now(),'sale',sale,'team',team)) ELSE history||jsonb_build_array(jsonb_build_object('action','reassigned','at',now(),'from',f.sale_user_id,'sale',sale,'team',team,'actor',auth.uid(),'reason',trim(p_reason))) END WHERE id=f.id;
 INSERT INTO public.notifications(tenant_id,user_id,type,title,body,link) VALUES(target.partner_tenant_id,sale,'agency_lead','Khách được bàn giao','Hạn phản hồi giữ nguyên.','/agencies');
 INSERT INTO public.audit_logs(tenant_id,actor_user_id,action,entity,entity_id,diff) VALUES(p_tenant,auth.uid(),'agency.handover','agency_referral',f.id,jsonb_build_object('from_agency',a.id,'to_agency',target.id,'from_sale',f.sale_user_id,'to_sale',sale,'reason',trim(p_reason)));
END $$;
REVOKE ALL ON FUNCTION public.agency_referral_handover(uuid,uuid,uuid,uuid,uuid,text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.agency_referral_handover(uuid,uuid,uuid,uuid,uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.agency_routing_extended(p_tenant uuid,p_agency uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb; a public.agencies; partner boolean; master boolean; BEGIN
 result:=public.agency_routing_view(p_tenant,p_agency);
 SELECT * INTO a FROM public.agencies WHERE id=p_agency;
 partner:=a.partner_tenant_id=p_tenant AND coalesce(private.has_tenant_role_in(p_tenant,ARRAY['owner','admin','manager']::public.app_role[]),false);
 master:=a.tenant_id=p_tenant AND coalesce(private.has_tenant_role_in(p_tenant,ARRAY['owner','admin','manager']::public.app_role[]),false);
 RETURN result||jsonb_build_object('canManageTeams',partner,'canTransferAgency',master,
 'teams',CASE WHEN partner THEN coalesce((SELECT jsonb_agg(x) FROM(SELECT id,name FROM public.teams WHERE tenant_id=p_tenant AND deleted_at IS NULL ORDER BY name)x),'[]') ELSE '[]'::jsonb END,
 'teamRules',CASE WHEN partner THEN coalesce((SELECT jsonb_agg(x) FROM(SELECT project_id,team_ids FROM public.agency_team_routing WHERE agency_id=a.id AND partner_tenant_id=p_tenant)x),'[]') ELSE '[]'::jsonb END,
 'candidates',CASE WHEN partner THEN coalesce((SELECT jsonb_agg(x) FROM(SELECT r.project_id,p.user_id,p.team_id,coalesce(pr.full_name,pr.email,'Sale') AS name FROM public.agency_lead_rules r CROSS JOIN LATERAL public.agency_project_pool(a.id,r.project_id) p LEFT JOIN public.profiles pr ON pr.user_id=p.user_id WHERE r.agency_id=a.id)x),'[]') ELSE '[]'::jsonb END,
 'agencies',CASE WHEN master THEN coalesce((SELECT jsonb_agg(x) FROM(SELECT id,name FROM public.agencies WHERE tenant_id=a.tenant_id AND accepted_at IS NOT NULL AND status='active' ORDER BY name)x),'[]') ELSE '[]'::jsonb END,
 'referrals',coalesce((SELECT jsonb_agg(v||jsonb_build_object('team_id',f.team_id,'team_name',CASE WHEN partner THEN t.name END)) FROM jsonb_array_elements(result->'referrals') v JOIN public.agency_lead_referrals f ON f.id=(v->>'id')::uuid LEFT JOIN public.teams t ON t.id=f.team_id),'[]'),
 'handovers',CASE WHEN master OR partner THEN coalesce((SELECT jsonb_agg(x) FROM(SELECT h.id,h.referral_id,h.created_at,h.reason,fa.name AS from_agency,ta.name AS to_agency,
 CASE WHEN master OR h.from_partner_id=p_tenant THEN coalesce(fp.full_name,'Sale') END AS from_sale,
 CASE WHEN master OR h.to_partner_id=p_tenant THEN coalesce(tp.full_name,'Sale') END AS to_sale
 FROM public.agency_referral_handovers h JOIN public.agencies fa ON fa.id=h.from_agency_id JOIN public.agencies ta ON ta.id=h.to_agency_id LEFT JOIN public.profiles fp ON fp.user_id=h.from_sale_id LEFT JOIN public.profiles tp ON tp.user_id=h.to_sale_id WHERE h.master_tenant_id=a.tenant_id AND (h.from_agency_id=a.id OR h.to_agency_id=a.id) AND (master OR h.from_partner_id=p_tenant OR h.to_partner_id=p_tenant) ORDER BY h.created_at DESC LIMIT 100)x),'[]') ELSE '[]'::jsonb END);
END $$;
REVOKE ALL ON FUNCTION public.agency_routing_extended(uuid,uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.agency_routing_extended(uuid,uuid) TO authenticated;