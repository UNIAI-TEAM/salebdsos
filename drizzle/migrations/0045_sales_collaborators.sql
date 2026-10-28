CREATE TABLE public.sales_collaborators (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id), code text NOT NULL, full_name text NOT NULL, phone text, email text, owner_user_id uuid NOT NULL, status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused')), note text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,code), UNIQUE(tenant_id,id)
);
GRANT ALL ON public.sales_collaborators TO service_role;
ALTER TABLE public.sales_collaborators ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.collaborator_referrals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, collaborator_id uuid NOT NULL, lead_id uuid NOT NULL REFERENCES public.leads(id), contract_id uuid REFERENCES public.contracts(id), commission_amount numeric NOT NULL DEFAULT 0 CHECK(commission_amount>=0), approved boolean NOT NULL DEFAULT false, note text, created_at timestamptz NOT NULL DEFAULT now(), FOREIGN KEY(tenant_id,collaborator_id) REFERENCES public.sales_collaborators(tenant_id,id), UNIQUE(tenant_id,lead_id), UNIQUE(tenant_id,id)
);
GRANT ALL ON public.collaborator_referrals TO service_role;
ALTER TABLE public.collaborator_referrals ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.collaborator_payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, referral_id uuid NOT NULL, amount numeric NOT NULL CHECK(amount>0), reference text NOT NULL, actor_user_id uuid NOT NULL, paid_at timestamptz NOT NULL DEFAULT now(), FOREIGN KEY(tenant_id,referral_id) REFERENCES public.collaborator_referrals(tenant_id,id), UNIQUE(tenant_id,reference)
);
GRANT ALL ON public.collaborator_payments TO service_role;
ALTER TABLE public.collaborator_payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX collaborator_owner_idx ON public.sales_collaborators(tenant_id,owner_user_id);
CREATE INDEX collaborator_referral_idx ON public.collaborator_referrals(collaborator_id);
CREATE OR REPLACE FUNCTION public.collaborator_workspace(p_tenant uuid,p_search text DEFAULT '') RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE adm boolean; wide boolean;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(private.is_tenant_member(p_tenant),false) THEN RAISE EXCEPTION 'Không có quyền truy cập sàn'; END IF;
 adm:=private.has_tenant_role_in(p_tenant,ARRAY['owner','admin']::public.app_role[]);
 wide:=private.has_tenant_role_in(p_tenant,ARRAY['owner','admin','manager']::public.app_role[]);
 IF NOT wide AND NOT private.has_tenant_role_in(p_tenant,ARRAY['agent']::public.app_role[]) THEN RAISE EXCEPTION 'Không có quyền xem cộng tác viên'; END IF;
 RETURN jsonb_build_object('canEdit',adm,
 'profiles',coalesce((SELECT jsonb_agg(x ORDER BY x.created_at DESC) FROM(SELECT c.*,coalesce(p.full_name,p.email,'Sale') AS owner_name FROM public.sales_collaborators c LEFT JOIN public.profiles p ON p.user_id=c.owner_user_id WHERE c.tenant_id=p_tenant AND (wide OR c.owner_user_id=auth.uid()))x),'[]'::jsonb),
 'referrals',coalesce((SELECT jsonb_agg(x ORDER BY x.created_at DESC) FROM(SELECT r.*,l.full_name AS lead_name,l.phone AS lead_phone,l.status AS lead_status,k.code AS contract_code,coalesce((SELECT sum(amount) FROM public.collaborator_payments WHERE referral_id=r.id),0) AS paid FROM public.collaborator_referrals r JOIN public.sales_collaborators c ON c.id=r.collaborator_id JOIN public.leads l ON l.id=r.lead_id LEFT JOIN public.contracts k ON k.id=r.contract_id WHERE r.tenant_id=p_tenant AND (wide OR (c.owner_user_id=auth.uid() AND l.owner_user_id=auth.uid())))x),'[]'::jsonb),
 'payments',coalesce((SELECT jsonb_agg(x ORDER BY x.paid_at DESC) FROM(SELECT q.* FROM public.collaborator_payments q JOIN public.collaborator_referrals r ON r.id=q.referral_id JOIN public.sales_collaborators c ON c.id=r.collaborator_id JOIN public.leads l ON l.id=r.lead_id WHERE q.tenant_id=p_tenant AND (wide OR (c.owner_user_id=auth.uid() AND l.owner_user_id=auth.uid())))x),'[]'::jsonb),
 'people',CASE WHEN adm THEN coalesce((SELECT jsonb_agg(x) FROM(SELECT DISTINCT r.user_id,coalesce(p.full_name,p.email,'Sale') AS name FROM public.user_roles r LEFT JOIN public.profiles p ON p.user_id=r.user_id WHERE r.tenant_id=p_tenant AND r.role IN ('owner','admin','manager','agent'))x),'[]'::jsonb) ELSE '[]'::jsonb END,
 'leads',CASE WHEN adm AND length(trim(p_search))>=2 THEN coalesce((SELECT jsonb_agg(x) FROM(SELECT id,full_name,phone FROM public.leads WHERE tenant_id=p_tenant AND deleted_at IS NULL AND (full_name ILIKE '%'||left(p_search,100)||'%' OR phone ILIKE '%'||left(p_search,100)||'%') ORDER BY created_at DESC LIMIT 30)x),'[]'::jsonb) ELSE '[]'::jsonb END);
END $$;
REVOKE ALL ON FUNCTION public.collaborator_workspace(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.collaborator_workspace(uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.collaborator_command(p_tenant uuid,p_action text,p_data jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid; rid uuid; lid uuid; kid uuid; amount numeric; paid numeric; ref public.collaborator_referrals; c public.sales_collaborators;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(private.has_tenant_role_in(p_tenant,ARRAY['owner','admin']::public.app_role[]),false) THEN RAISE EXCEPTION 'Chỉ quản trị sàn được chỉnh sửa cộng tác viên'; END IF;
 IF p_action='save' THEN
 cid:=nullif(p_data->>'id','')::uuid;
 IF length(trim(coalesce(p_data->>'name','')))=0 OR length(trim(coalesce(p_data->>'code','')))=0 OR p_data->>'status' IS NULL OR p_data->>'status' NOT IN ('active','paused') THEN RAISE EXCEPTION 'Hồ sơ không hợp lệ'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE tenant_id=p_tenant AND user_id=(p_data->>'ownerId')::uuid AND role IN ('owner','admin','manager','agent')) THEN RAISE EXCEPTION 'Sale phụ trách không thuộc sàn'; END IF;
 IF cid IS NULL THEN
 INSERT INTO public.sales_collaborators(tenant_id,code,full_name,phone,email,owner_user_id,status,note) VALUES(p_tenant,upper(trim(p_data->>'code')),trim(p_data->>'name'),p_data->>'phone',p_data->>'email',(p_data->>'ownerId')::uuid,p_data->>'status',p_data->>'note') RETURNING id INTO cid;
 ELSE
 UPDATE public.sales_collaborators SET code=upper(trim(p_data->>'code')),full_name=trim(p_data->>'name'),phone=p_data->>'phone',email=p_data->>'email',owner_user_id=(p_data->>'ownerId')::uuid,status=p_data->>'status',note=p_data->>'note',updated_at=now() WHERE id=cid AND tenant_id=p_tenant;
 IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy cộng tác viên'; END IF;
 END IF;
 ELSIF p_action='refer' THEN
 cid:=(p_data->>'collaboratorId')::uuid; lid:=(p_data->>'leadId')::uuid;
 SELECT * INTO c FROM public.sales_collaborators WHERE id=cid AND tenant_id=p_tenant FOR UPDATE;
 IF NOT FOUND OR c.status<>'active' THEN RAISE EXCEPTION 'Cộng tác viên đã tạm dừng hoặc không thuộc sàn'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.leads WHERE id=lid AND tenant_id=p_tenant AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Khách không thuộc sàn'; END IF;
 INSERT INTO public.collaborator_referrals(tenant_id,collaborator_id,lead_id,note) VALUES(p_tenant,cid,lid,p_data->>'note') RETURNING id INTO rid;
 cid:=rid;
 ELSIF p_action IN ('commission','pay') THEN
 rid:=(p_data->>'referralId')::uuid;
 SELECT * INTO ref FROM public.collaborator_referrals WHERE id=rid AND tenant_id=p_tenant FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy khách giới thiệu'; END IF;
 SELECT coalesce(sum(q.amount),0) INTO paid FROM public.collaborator_payments q WHERE q.referral_id=rid;
 amount:=(p_data->>'amount')::numeric;
 IF amount IS NULL OR amount<0 THEN RAISE EXCEPTION 'Số tiền không hợp lệ'; END IF;
 IF p_action='commission' THEN
 IF paid>0 THEN RAISE EXCEPTION 'Đã chi trả; không được thay đổi hoa hồng'; END IF;
 kid:=nullif(p_data->>'contractId','')::uuid;
 IF kid IS NULL OR NOT EXISTS(SELECT 1 FROM public.contracts WHERE id=kid AND tenant_id=p_tenant AND lead_id=ref.lead_id AND deleted_at IS NULL AND status IN ('active','completed')) THEN RAISE EXCEPTION 'Cần hợp đồng hiệu lực của đúng khách giới thiệu'; END IF;
 UPDATE public.collaborator_referrals SET contract_id=kid,commission_amount=amount,approved=true WHERE id=rid;
 cid:=rid;
 ELSE
 IF NOT ref.approved OR amount<=0 OR amount>ref.commission_amount-paid THEN RAISE EXCEPTION 'Khoản chi vượt số còn lại hoặc chưa duyệt'; END IF;
 IF length(trim(coalesce(p_data->>'reference','')))=0 THEN RAISE EXCEPTION 'Cần mã chứng từ'; END IF;
 INSERT INTO public.collaborator_payments(tenant_id,referral_id,amount,reference,actor_user_id) VALUES(p_tenant,rid,amount,trim(p_data->>'reference'),auth.uid()) RETURNING id INTO cid;
 END IF;
 ELSE RAISE EXCEPTION 'Thao tác không hợp lệ'; END IF;
 INSERT INTO public.audit_logs(tenant_id,actor_user_id,action,entity,entity_id,diff) VALUES(p_tenant,auth.uid(),'collaborator.'||p_action,'collaborator',cid,p_data);
 RETURN cid;
END $$;
REVOKE ALL ON FUNCTION public.collaborator_command(uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.collaborator_command(uuid,text,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.collaborator_contracts(p_tenant uuid,p_referral uuid) RETURNS TABLE(id uuid,code text,net_price numeric) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(private.has_tenant_role_in(p_tenant,ARRAY['owner','admin']::public.app_role[]),false) THEN RAISE EXCEPTION 'Không có quyền'; END IF;
 RETURN QUERY SELECT k.id,k.code,k.net_price FROM public.contracts k JOIN public.collaborator_referrals r ON r.lead_id=k.lead_id WHERE r.id=p_referral AND r.tenant_id=p_tenant AND k.tenant_id=p_tenant AND k.deleted_at IS NULL AND k.status IN ('active','completed') ORDER BY k.created_at DESC;
END $$;
REVOKE ALL ON FUNCTION public.collaborator_contracts(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.collaborator_contracts(uuid,uuid) TO authenticated;