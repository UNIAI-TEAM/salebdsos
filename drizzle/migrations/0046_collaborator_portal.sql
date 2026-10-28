ALTER TABLE public.sales_collaborators ADD COLUMN portal_user_id uuid;
CREATE UNIQUE INDEX sales_collaborator_portal_user ON public.sales_collaborators(portal_user_id) WHERE portal_user_id IS NOT NULL;
CREATE TABLE public.collaborator_portal_invites(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,collaborator_id uuid NOT NULL,token_hash text NOT NULL UNIQUE,email text NOT NULL,expires_at timestamptz NOT NULL DEFAULT now()+interval '7 days',used_at timestamptz,created_by uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),FOREIGN KEY(tenant_id,collaborator_id) REFERENCES public.sales_collaborators(tenant_id,id));
GRANT ALL ON public.collaborator_portal_invites TO service_role;
ALTER TABLE public.collaborator_portal_invites ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.collaborator_portal_invite(p_tenant uuid,p_collaborator uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.sales_collaborators; token text;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(private.has_tenant_role_in(p_tenant,ARRAY['owner','admin']::public.app_role[]),false) THEN RAISE EXCEPTION 'Chỉ quản trị sàn được mời CTV'; END IF;
 SELECT * INTO c FROM public.sales_collaborators WHERE id=p_collaborator AND tenant_id=p_tenant FOR UPDATE;
 IF NOT FOUND OR c.status<>'active' OR c.portal_user_id IS NOT NULL OR coalesce(c.email,'') !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN RAISE EXCEPTION 'CTV cần email hợp lệ, đang hợp tác và chưa liên kết tài khoản'; END IF;
 token:=encode(extensions.gen_random_bytes(32),'hex');
 UPDATE public.collaborator_portal_invites SET expires_at=now() WHERE collaborator_id=c.id AND used_at IS NULL;
 INSERT INTO public.collaborator_portal_invites(tenant_id,collaborator_id,token_hash,email,created_by) VALUES(p_tenant,c.id,encode(extensions.digest(token,'sha256'),'hex'),lower(trim(c.email)),auth.uid());
 INSERT INTO public.audit_logs(tenant_id,actor_user_id,action,entity,entity_id) VALUES(p_tenant,auth.uid(),'collaborator.portal_invite','collaborator',c.id);
 RETURN token;
END $$;
CREATE OR REPLACE FUNCTION public.collaborator_portal_accept(p_token text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE i public.collaborator_portal_invites; c public.sales_collaborators;
BEGIN
 IF auth.uid() IS NULL OR p_token !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Lời mời không hợp lệ'; END IF;
 SELECT * INTO i FROM public.collaborator_portal_invites WHERE token_hash=encode(extensions.digest(p_token,'sha256'),'hex') FOR UPDATE;
 IF NOT FOUND OR i.used_at IS NOT NULL OR i.expires_at<=now() OR lower(coalesce(auth.jwt()->>'email',''))<>i.email THEN RAISE EXCEPTION 'Lời mời hết hạn, đã dùng hoặc không đúng email'; END IF;
 SELECT * INTO c FROM public.sales_collaborators WHERE id=i.collaborator_id AND tenant_id=i.tenant_id FOR UPDATE;
 IF NOT FOUND OR c.status<>'active' OR c.portal_user_id IS NOT NULL THEN RAISE EXCEPTION 'CTV chưa được phép liên kết'; END IF;
 UPDATE public.sales_collaborators SET portal_user_id=auth.uid(),updated_at=now() WHERE id=c.id;
 UPDATE public.collaborator_portal_invites SET used_at=now() WHERE id=i.id;
 INSERT INTO public.audit_logs(tenant_id,actor_user_id,action,entity,entity_id) VALUES(i.tenant_id,auth.uid(),'collaborator.portal_accept','collaborator',c.id);
 RETURN c.id;
END $$;
CREATE OR REPLACE FUNCTION public.collaborator_portal_workspace() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.sales_collaborators;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Cần đăng nhập'; END IF;
 SELECT * INTO c FROM public.sales_collaborators WHERE portal_user_id=auth.uid();
 IF NOT FOUND THEN RETURN jsonb_build_object('profile',null,'referrals','[]'::jsonb,'payments','[]'::jsonb); END IF;
 IF c.status<>'active' THEN RAISE EXCEPTION 'Quyền CTV đang tạm dừng'; END IF;
 RETURN jsonb_build_object('profile',jsonb_build_object('name',c.full_name,'code',c.code,'agency',(SELECT name FROM public.tenants WHERE id=c.tenant_id)),
 'referrals',coalesce((SELECT jsonb_agg(x ORDER BY x.created_at DESC) FROM(SELECT r.id,l.full_name AS name,l.phone,l.status::text AS status,r.created_at,r.approved,CASE WHEN r.approved THEN r.commission_amount ELSE 0 END AS commission_amount,coalesce((SELECT sum(q.amount) FROM public.collaborator_payments q WHERE q.referral_id=r.id AND q.tenant_id=c.tenant_id),0) AS paid FROM public.collaborator_referrals r JOIN public.leads l ON l.id=r.lead_id AND l.tenant_id=c.tenant_id WHERE r.collaborator_id=c.id AND r.tenant_id=c.tenant_id AND l.deleted_at IS NULL)x),'[]'::jsonb),
 'payments',coalesce((SELECT jsonb_agg(x ORDER BY x.paid_at DESC) FROM(SELECT q.id,q.referral_id,q.amount,q.paid_at FROM public.collaborator_payments q JOIN public.collaborator_referrals r ON r.id=q.referral_id AND r.tenant_id=c.tenant_id WHERE r.collaborator_id=c.id AND q.tenant_id=c.tenant_id)x),'[]'::jsonb));
END $$;
CREATE OR REPLACE FUNCTION public.collaborator_portal_submit(p_name text,p_phone text,p_email text DEFAULT '',p_need text DEFAULT '',p_request uuid DEFAULT gen_random_uuid()) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.sales_collaborators; lid uuid; rid uuid; phone_key text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Cần đăng nhập'; END IF;
 SELECT * INTO c FROM public.sales_collaborators WHERE portal_user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND OR c.status<>'active' THEN RAISE EXCEPTION 'Chưa được cấp quyền CTV'; END IF;
 IF length(trim(coalesce(p_name,''))) NOT BETWEEN 1 AND 150 OR length(coalesce(p_need,''))>2000 OR length(coalesce(p_email,''))>254 OR p_request IS NULL THEN RAISE EXCEPTION 'Thông tin khách không hợp lệ'; END IF;
 phone_key:=regexp_replace(coalesce(p_phone,''),'[^0-9]','','g');
 IF phone_key LIKE '84%' THEN phone_key:='0'||substr(phone_key,3); END IF;
 IF phone_key !~ '^0[0-9]{9}$' THEN RAISE EXCEPTION 'Số điện thoại không hợp lệ'; END IF;
 IF coalesce(p_email,'')<>'' AND p_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN RAISE EXCEPTION 'Email khách không hợp lệ'; END IF;
 SELECT r.id INTO rid FROM public.collaborator_referrals r JOIN public.leads l ON l.id=r.lead_id WHERE r.collaborator_id=c.id AND l.meta->>'ctv_request'=p_request::text;
 IF rid IS NOT NULL THEN RETURN rid; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(c.tenant_id::text||phone_key,0));
 IF EXISTS(SELECT 1 FROM public.leads l WHERE l.tenant_id=c.tenant_id AND l.deleted_at IS NULL AND (CASE WHEN regexp_replace(coalesce(l.phone,''),'[^0-9]','','g') LIKE '84%' THEN '0'||substr(regexp_replace(l.phone,'[^0-9]','','g'),3) ELSE regexp_replace(coalesce(l.phone,''),'[^0-9]','','g') END)=phone_key) THEN RAISE EXCEPTION 'Thông tin chưa thể tiếp nhận; vui lòng liên hệ Sale phụ trách'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE tenant_id=c.tenant_id AND user_id=c.owner_user_id AND role IN ('owner','admin','manager','agent')) THEN RAISE EXCEPTION 'Cần sàn cập nhật Sale phụ trách'; END IF;
 INSERT INTO public.leads(tenant_id,owner_user_id,full_name,phone,email,source,notes,meta) VALUES(c.tenant_id,c.owner_user_id,trim(p_name),phone_key,nullif(trim(p_email),''),'collaborator',p_need,jsonb_build_object('ctv_request',p_request::text)) RETURNING id INTO lid;
 INSERT INTO public.collaborator_referrals(tenant_id,collaborator_id,lead_id,note) VALUES(c.tenant_id,c.id,lid,p_need) RETURNING id INTO rid;
 INSERT INTO public.audit_logs(tenant_id,actor_user_id,action,entity,entity_id) VALUES(c.tenant_id,auth.uid(),'collaborator.portal_submit','collaborator_referral',rid);
 RETURN rid;
END $$;
REVOKE ALL ON FUNCTION public.collaborator_portal_invite(uuid,uuid),public.collaborator_portal_accept(text),public.collaborator_portal_workspace(),public.collaborator_portal_submit(text,text,text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.collaborator_portal_invite(uuid,uuid),public.collaborator_portal_accept(text),public.collaborator_portal_workspace(),public.collaborator_portal_submit(text,text,text,text,uuid) TO authenticated;