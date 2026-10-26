CREATE TABLE public.agency_commission_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), agency_id uuid NOT NULL REFERENCES public.agencies(id),
 level text NOT NULL CHECK(level IN ('master_agency','agency_sale')), payer_tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 receiver_tenant_id uuid NOT NULL REFERENCES public.tenants(id), sale_user_id uuid, contract_id uuid NOT NULL REFERENCES public.contracts(id),
 contract_code text NOT NULL, base_amount numeric(18,2) NOT NULL, rate numeric(7,4) NOT NULL CHECK(rate>0 AND rate<=100),
 amount numeric(18,2) NOT NULL CHECK(amount>0), currency text NOT NULL, status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','confirmed','disputed','cancelled')),
 due_date date, dispute_note text, history jsonb NOT NULL DEFAULT '[]', created_at timestamptz NOT NULL DEFAULT now(),
 CHECK((level='master_agency' AND sale_user_id IS NULL) OR (level='agency_sale' AND sale_user_id IS NOT NULL))
);
GRANT SELECT ON public.agency_commission_entries TO authenticated; GRANT ALL ON public.agency_commission_entries TO service_role;
ALTER TABLE public.agency_commission_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY commission_entry_read ON public.agency_commission_entries FOR SELECT TO authenticated USING(
 private.has_tenant_role_in(payer_tenant_id,ARRAY['owner','admin']::public.app_role[]) OR
 (status<>'draft' AND ((level='master_agency' AND private.has_tenant_role_in(receiver_tenant_id,ARRAY['owner','admin']::public.app_role[])) OR (level='agency_sale' AND private.is_tenant_member(receiver_tenant_id) AND sale_user_id=auth.uid()))));
CREATE UNIQUE INDEX agency_commission_no_duplicate ON public.agency_commission_entries(agency_id,level,contract_id,coalesce(sale_user_id,'00000000-0000-0000-0000-000000000000'::uuid)) WHERE status<>'cancelled';
CREATE TABLE public.agency_commission_payments(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), entry_id uuid NOT NULL REFERENCES public.agency_commission_entries(id), amount numeric(18,2) NOT NULL CHECK(amount>0), reference text NOT NULL,
 paid_date date NOT NULL, received_at timestamptz, created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(entry_id,reference)
);
GRANT SELECT ON public.agency_commission_payments TO authenticated; GRANT ALL ON public.agency_commission_payments TO service_role;
ALTER TABLE public.agency_commission_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY commission_payment_read ON public.agency_commission_payments FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.agency_commission_entries e WHERE e.id=entry_id));
CREATE OR REPLACE FUNCTION public.agency_commission_command(p_tenant uuid,p_agency uuid,p_action text,p_data jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.agencies; e public.agency_commission_entries; ct public.contracts; eid uuid; pay public.agency_commission_payments; lvl text; payer uuid; receiver uuid; sale uuid; pct numeric; total numeric; is_payer boolean; is_receiver boolean; note text;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(private.is_tenant_member(p_tenant),false) THEN RAISE EXCEPTION 'Không có quyền'; END IF;
 SELECT * INTO a FROM public.agencies WHERE id=p_agency;
 IF NOT FOUND OR p_tenant NOT IN (a.tenant_id,a.partner_tenant_id) OR a.partner_tenant_id IS NULL THEN RAISE EXCEPTION 'Đại lý không hợp lệ'; END IF;
 IF p_action='create' THEN
 lvl:=p_data->>'level'; payer:=CASE lvl WHEN 'master_agency' THEN a.tenant_id WHEN 'agency_sale' THEN a.partner_tenant_id END; receiver:=a.partner_tenant_id;
 IF payer IS NULL OR payer<>p_tenant OR NOT coalesce(private.has_tenant_role_in(payer,ARRAY['owner','admin']::public.app_role[]),false) OR a.accepted_at IS NULL OR a.status<>'active' THEN RAISE EXCEPTION 'Chỉ quản trị bên chi được lập hoa hồng'; END IF;
 SELECT * INTO ct FROM public.contracts WHERE id=(p_data->>'contractId')::uuid AND tenant_id=payer AND deleted_at IS NULL AND status IN ('active','completed');
 IF NOT FOUND OR ct.net_price<=0 THEN RAISE EXCEPTION 'Chọn hợp đồng hiệu lực của bên chi'; END IF;
 IF lvl='master_agency' AND NOT EXISTS(SELECT 1 FROM public.agency_allocations WHERE agency_id=a.id AND product_id=ct.product_id) THEN RAISE EXCEPTION 'Hợp đồng phải thuộc căn đã cấp cho đại lý'; END IF;
 sale:=CASE WHEN lvl='agency_sale' THEN nullif(p_data->>'saleId','')::uuid END;
 IF lvl='agency_sale' AND NOT EXISTS(SELECT 1 FROM public.user_roles WHERE tenant_id=payer AND user_id=sale AND role IN ('agent','manager','owner','admin')) THEN RAISE EXCEPTION 'Sale không thuộc đại lý'; END IF;
 pct:=(p_data->>'rate')::numeric;
 IF pct IS NULL OR pct<=0 OR pct>100 THEN RAISE EXCEPTION 'Tỷ lệ không hợp lệ'; END IF;
 total:=round(ct.net_price*pct/100,2);
 INSERT INTO public.agency_commission_entries(agency_id,level,payer_tenant_id,receiver_tenant_id,sale_user_id,contract_id,contract_code,base_amount,rate,amount,currency,due_date,history)
 VALUES(a.id,lvl,payer,receiver,sale,ct.id,ct.code,ct.net_price,pct,total,ct.currency,nullif(p_data->>'dueDate','')::date,jsonb_build_array(jsonb_build_object('action','create','at',now(),'actor',auth.uid()))) RETURNING id INTO eid;
 ELSE
 SELECT * INTO e FROM public.agency_commission_entries WHERE id=(p_data->>'id')::uuid AND agency_id=p_agency FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy khoản hoa hồng'; END IF; eid:=e.id;
 is_payer:=p_tenant=e.payer_tenant_id AND coalesce(private.has_tenant_role_in(p_tenant,ARRAY['owner','admin']::public.app_role[]),false);
 is_receiver:=p_tenant=e.receiver_tenant_id AND CASE WHEN e.level='master_agency' THEN coalesce(private.has_tenant_role_in(p_tenant,ARRAY['owner','admin']::public.app_role[]),false) ELSE e.sale_user_id=auth.uid() END;
 IF p_action='submit' THEN
 IF NOT is_payer OR e.status NOT IN ('draft','disputed') THEN RAISE EXCEPTION 'Không thể gửi đối soát'; END IF;
 UPDATE public.agency_commission_entries SET status='submitted',dispute_note=NULL WHERE id=eid;
 ELSIF p_action IN ('confirm','dispute') THEN
 IF NOT coalesce(is_receiver,false) OR e.status<>'submitted' THEN RAISE EXCEPTION 'Chỉ bên nhận được xác nhận đối soát'; END IF;
 note:=trim(coalesce(p_data->>'note',''));
 IF p_action='dispute' AND char_length(note) NOT BETWEEN 2 AND 1000 THEN RAISE EXCEPTION 'Nhập lý do chênh lệch'; END IF;
 UPDATE public.agency_commission_entries SET status=CASE p_action WHEN 'confirm' THEN 'confirmed' ELSE 'disputed' END,dispute_note=CASE WHEN p_action='dispute' THEN note END WHERE id=eid;
 ELSIF p_action='cancel' THEN
 IF NOT is_payer OR e.status NOT IN ('draft','disputed') OR EXISTS(SELECT 1 FROM public.agency_commission_payments WHERE entry_id=eid) THEN RAISE EXCEPTION 'Không thể hủy khoản đã xác nhận hoặc thanh toán'; END IF;
 UPDATE public.agency_commission_entries SET status='cancelled' WHERE id=eid;
 ELSIF p_action='pay' THEN
 IF NOT is_payer OR e.status<>'confirmed' THEN RAISE EXCEPTION 'Cần bên nhận xác nhận đối soát trước'; END IF;
 total:=(p_data->>'amount')::numeric; note:=trim(coalesce(p_data->>'reference',''));
 IF total IS NULL OR total<=0 OR total<>round(total,2) OR char_length(note) NOT BETWEEN 1 AND 160 OR nullif(p_data->>'paidDate','') IS NULL THEN RAISE EXCEPTION 'Thông tin thanh toán không hợp lệ'; END IF;
 IF total+(SELECT coalesce(sum(amount),0) FROM public.agency_commission_payments WHERE entry_id=eid)>e.amount THEN RAISE EXCEPTION 'Vượt số tiền còn phải chi'; END IF;
 INSERT INTO public.agency_commission_payments(entry_id,amount,reference,paid_date,created_by) VALUES(eid,total,note,(p_data->>'paidDate')::date,auth.uid());
 ELSIF p_action='receive' THEN
 IF NOT coalesce(is_receiver,false) OR e.status<>'confirmed' THEN RAISE EXCEPTION 'Chỉ bên nhận được xác nhận nhận tiền'; END IF;
 UPDATE public.agency_commission_payments SET received_at=now() WHERE id=(p_data->>'paymentId')::uuid AND entry_id=eid AND received_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Thanh toán đã xác nhận hoặc không tồn tại'; END IF;
 ELSE RAISE EXCEPTION 'Thao tác không hợp lệ'; END IF;
 UPDATE public.agency_commission_entries SET history=history||jsonb_build_array(jsonb_build_object('action',p_action,'at',now(),'actor',auth.uid())) WHERE id=eid;
 END IF;
 INSERT INTO public.audit_logs(tenant_id,actor_user_id,action,entity,entity_id,diff) VALUES(p_tenant,auth.uid(),'agency.commission_'||p_action,'agency_commission',eid,jsonb_build_object('agency',a.id)); RETURN eid;
END $$;
REVOKE ALL ON FUNCTION public.agency_commission_command(uuid,uuid,text,jsonb) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.agency_commission_command(uuid,uuid,text,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.agency_commission_view(p_tenant uuid,p_agency uuid,p_level text,p_page integer DEFAULT 0) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.agencies; admin boolean; payer uuid; BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(private.is_tenant_member(p_tenant),false) OR p_level NOT IN ('master_agency','agency_sale') OR p_level IS NULL THEN RAISE EXCEPTION 'Không có quyền'; END IF;
 SELECT * INTO a FROM public.agencies WHERE id=p_agency;
 IF NOT FOUND OR a.partner_tenant_id IS NULL OR NOT coalesce(p_tenant IN (a.tenant_id,a.partner_tenant_id),false) OR (p_level='agency_sale' AND p_tenant<>a.partner_tenant_id) THEN RAISE EXCEPTION 'Không có quyền xem sổ hoa hồng'; END IF;
 admin:=coalesce(private.has_tenant_role_in(p_tenant,ARRAY['owner','admin']::public.app_role[]),false);
 IF p_level='master_agency' AND NOT admin THEN RAISE EXCEPTION 'Chỉ quản trị hai bên được xem'; END IF;
 payer:=CASE p_level WHEN 'master_agency' THEN a.tenant_id ELSE a.partner_tenant_id END;
 RETURN jsonb_build_object('canCreate',admin AND p_tenant=payer AND a.accepted_at IS NOT NULL AND a.status='active','canPay',admin AND p_tenant=payer,
 'contracts',CASE WHEN admin AND p_tenant=payer THEN coalesce((SELECT jsonb_agg(x) FROM(SELECT c.id,c.code,c.net_price,c.currency FROM public.contracts c WHERE c.tenant_id=payer AND c.deleted_at IS NULL AND c.status IN ('active','completed') AND (p_level='agency_sale' OR EXISTS(SELECT 1 FROM public.agency_allocations al WHERE al.agency_id=a.id AND al.product_id=c.product_id)) ORDER BY c.created_at DESC LIMIT 500)x),'[]') ELSE '[]'::jsonb END,
 'sales',CASE WHEN admin AND p_level='agency_sale' THEN coalesce((SELECT jsonb_agg(x) FROM(SELECT DISTINCT r.user_id,coalesce(p.full_name,p.email,'Sale') AS name FROM public.user_roles r LEFT JOIN public.profiles p ON p.user_id=r.user_id WHERE r.tenant_id=payer AND r.role IN ('agent','manager','owner','admin'))x),'[]') ELSE '[]'::jsonb END,
 'total',(SELECT count(*) FROM public.agency_commission_entries e WHERE e.agency_id=a.id AND e.level=p_level AND ((admin AND p_tenant=payer) OR (e.status<>'draft' AND ((p_level='master_agency' AND admin) OR (p_level='agency_sale' AND e.sale_user_id=auth.uid()))))),
 'entries',coalesce((SELECT jsonb_agg(x) FROM(SELECT e.id,e.level,e.contract_code,e.base_amount,e.rate,e.amount,e.currency,e.status,e.due_date,e.dispute_note,e.history,coalesce(p.full_name,'Sale') AS sale_name,
 (p_tenant=e.receiver_tenant_id AND CASE WHEN p_level='master_agency' THEN admin ELSE e.sale_user_id=auth.uid() END) AS "canConfirm",
 coalesce((SELECT jsonb_agg(jsonb_build_object('id',pay.id,'amount',pay.amount,'reference',pay.reference,'paid_date',pay.paid_date,'received_at',pay.received_at) ORDER BY pay.created_at) FROM public.agency_commission_payments pay WHERE pay.entry_id=e.id),'[]') AS payments
 FROM public.agency_commission_entries e LEFT JOIN public.profiles p ON p.user_id=e.sale_user_id WHERE e.agency_id=a.id AND e.level=p_level AND ((admin AND p_tenant=payer) OR (e.status<>'draft' AND ((p_level='master_agency' AND admin) OR (p_level='agency_sale' AND e.sale_user_id=auth.uid())))) ORDER BY e.created_at DESC,e.id LIMIT 50 OFFSET greatest(0,least(coalesce(p_page,0),10000))*50)x),'[]'));
END $$;
REVOKE ALL ON FUNCTION public.agency_commission_view(uuid,uuid,text,integer) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.agency_commission_view(uuid,uuid,text,integer) TO authenticated;
