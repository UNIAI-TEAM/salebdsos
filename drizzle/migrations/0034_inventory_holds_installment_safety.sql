ALTER TABLE public.products ADD COLUMN hold_owner_user_id uuid;
CREATE INDEX products_timed_hold_idx ON public.products(hold_expires_at) WHERE listing_status IN ('locked','reserved');
CREATE TABLE public.installment_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, contract_id uuid NOT NULL,
 installment_id uuid NOT NULL, action text NOT NULL, before_row jsonb, after_row jsonb,
 actor_user_id uuid, occurred_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
GRANT SELECT ON public.installment_history TO authenticated;
GRANT ALL ON public.installment_history TO service_role;
ALTER TABLE public.installment_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY installment_history_read ON public.installment_history FOR SELECT TO authenticated USING (
 EXISTS(SELECT 1 FROM public.contracts c JOIN public.user_roles r ON r.tenant_id=c.tenant_id
 WHERE c.id=installment_history.contract_id AND c.tenant_id=installment_history.tenant_id AND r.user_id=auth.uid()
 AND (r.role IN ('owner','admin','platform_admin','manager') OR c.owner_user_id=auth.uid()))
);
CREATE INDEX installment_history_contract_idx ON public.installment_history(contract_id,occurred_at);
CREATE OR REPLACE FUNCTION public.guard_product_hold() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE active_old boolean;
BEGIN
 IF TG_OP='UPDATE' THEN
  IF NEW.listing_status IS NOT DISTINCT FROM OLD.listing_status AND NEW.hold_expires_at IS NOT DISTINCT FROM OLD.hold_expires_at
   AND NEW.hold_owner_user_id IS NOT DISTINCT FROM OLD.hold_owner_user_id AND NEW.deal_id IS NOT DISTINCT FROM OLD.deal_id THEN RETURN NEW; END IF;
  active_old := OLD.listing_status IN ('locked','reserved') AND (OLD.hold_expires_at IS NULL OR OLD.hold_expires_at>clock_timestamp());
  IF active_old AND auth.uid() IS NOT NULL AND (OLD.hold_owner_user_id IS NULL OR OLD.hold_owner_user_id<>auth.uid()) THEN
   RAISE EXCEPTION 'Căn đang được giữ bởi người khác; không thể ghi đè giữ chỗ';
  END IF;
  IF NEW.listing_status IN ('locked','reserved') AND OLD.listing_status NOT IN ('available','locked','reserved') THEN
   RAISE EXCEPTION 'Căn không còn trống để giữ chỗ';
  END IF;
 END IF;
 IF NEW.listing_status IN ('locked','reserved') THEN
  IF NEW.hold_expires_at IS NULL OR NEW.hold_expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'Cần chọn hạn giữ chỗ trong tương lai'; END IF;
  IF TG_OP='INSERT' OR NOT active_old THEN NEW.hold_owner_user_id:=auth.uid();
  ELSIF NEW.hold_owner_user_id IS DISTINCT FROM OLD.hold_owner_user_id THEN RAISE EXCEPTION 'Không thể thay người giữ căn'; END IF;
 ELSE NEW.hold_owner_user_id:=NULL; NEW.hold_expires_at:=NULL;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_guard_product_hold BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.guard_product_hold();
CREATE OR REPLACE FUNCTION public.change_product_listing_status(p_id uuid,p_status public.listing_status,p_expected timestamptz,p_until timestamptz DEFAULT NULL,p_note text DEFAULT NULL)
RETURNS public.products LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v public.products; can_write boolean;
BEGIN
 SELECT * INTO v FROM public.products WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy căn'; END IF;
 SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE tenant_id=v.tenant_id AND user_id=auth.uid() AND role IN ('owner','admin','manager','platform_admin')) INTO can_write;
 IF NOT can_write THEN RAISE EXCEPTION 'Bạn không có quyền đổi trạng thái căn'; END IF;
 IF p_expected IS NULL OR v.updated_at IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'Căn vừa được cập nhật; tải lại trước khi thao tác'; END IF;
 IF p_status IN ('locked','reserved') AND v.listing_status IN ('locked','reserved') AND (v.hold_expires_at IS NULL OR v.hold_expires_at>clock_timestamp()) THEN
  RAISE EXCEPTION 'Căn đã được giữ; không thể giữ thêm lần nữa';
 END IF;
 IF p_status IN ('locked','reserved') AND EXISTS(SELECT 1 FROM public.contracts WHERE product_id=p_id AND deleted_at IS NULL AND status IN ('draft','active','completed')) THEN RAISE EXCEPTION 'Căn đã có hợp đồng'; END IF;
 UPDATE public.products SET listing_status=p_status,hold_expires_at=p_until WHERE id=p_id RETURNING * INTO v;
 IF nullif(btrim(p_note),'') IS NOT NULL THEN
  INSERT INTO public.audit_logs(tenant_id,actor_user_id,action,entity,entity_id,diff) VALUES(v.tenant_id,auth.uid(),'product.status_note','product',p_id,jsonb_build_object('status',p_status,'note',p_note));
 END IF;
 RETURN v;
END $$;
REVOKE ALL ON FUNCTION public.change_product_listing_status(uuid,public.listing_status,timestamptz,timestamptz,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.change_product_listing_status(uuid,public.listing_status,timestamptz,timestamptz,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.release_expired_product_holds() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n integer;
BEGIN
 WITH expired AS (SELECT p.id FROM public.products p WHERE p.listing_status IN ('locked','reserved') AND p.hold_expires_at<=clock_timestamp()
 AND NOT EXISTS(SELECT 1 FROM public.contracts c WHERE c.product_id=p.id AND c.deleted_at IS NULL AND c.status IN ('draft','active','completed'))
 ORDER BY p.hold_expires_at LIMIT 500 FOR UPDATE OF p SKIP LOCKED)
 UPDATE public.products p SET listing_status='available',hold_expires_at=NULL,hold_owner_user_id=NULL,deal_id=NULL FROM expired e WHERE p.id=e.id;
 GET DIAGNOSTICS n=ROW_COUNT; RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.release_expired_product_holds() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.release_expired_product_holds() TO service_role;
CREATE OR REPLACE FUNCTION public.guard_installment_changes() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.contracts; target uuid;
BEGIN
 IF TG_OP='DELETE' THEN target:=OLD.contract_id; ELSE target:=NEW.contract_id; END IF;
 SELECT * INTO c FROM public.contracts WHERE id=target FOR UPDATE;
 IF auth.uid() IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.user_roles WHERE tenant_id=c.tenant_id AND user_id=auth.uid() AND role IN ('owner','admin','platform_admin')) THEN
  RAISE EXCEPTION 'Chỉ quản trị viên được sửa đợt thu';
 END IF;
 IF TG_OP='DELETE' THEN
  IF OLD.paid_amount>0 OR OLD.paid_at IS NOT NULL OR OLD.status='paid'
   OR EXISTS(SELECT 1 FROM public.payment_reminders WHERE installment_id=OLD.id)
   OR EXISTS(SELECT 1 FROM public.bank_transactions WHERE matched_contract_id=OLD.contract_id AND allocation::text LIKE '%'||OLD.id::text||'%') THEN
    RAISE EXCEPTION 'Không thể xóa đợt thu đã có thanh toán hoặc lịch sử nhắc'; END IF;
  RETURN OLD;
 END IF;
 IF NEW.tenant_id IS DISTINCT FROM c.tenant_id THEN RAISE EXCEPTION 'Đợt thu không thuộc hợp đồng'; END IF;
 IF TG_OP='UPDATE' AND (NEW.contract_id IS DISTINCT FROM OLD.contract_id OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id OR NEW.id IS DISTINCT FROM OLD.id) THEN RAISE EXCEPTION 'Không thể đổi định danh đợt thu'; END IF;
 IF NEW.amount<0 OR NEW.paid_amount<0 THEN RAISE EXCEPTION 'Số tiền không hợp lệ'; END IF;
 IF TG_OP='UPDATE' AND NEW.amount IS DISTINCT FROM OLD.amount AND NEW.amount<OLD.paid_amount THEN RAISE EXCEPTION 'Số tiền đợt thu không được thấp hơn số đã thu'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_guard_installment_changes BEFORE INSERT OR UPDATE OR DELETE ON public.contract_installments FOR EACH ROW EXECUTE FUNCTION public.guard_installment_changes();
CREATE OR REPLACE FUNCTION public.record_installment_history() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='DELETE' THEN
 INSERT INTO public.installment_history(tenant_id,contract_id,installment_id,action,before_row,actor_user_id) VALUES(OLD.tenant_id,OLD.contract_id,OLD.id,TG_OP,to_jsonb(OLD),auth.uid()); RETURN OLD;
 ELSE
 INSERT INTO public.installment_history(tenant_id,contract_id,installment_id,action,before_row,after_row,actor_user_id) VALUES(NEW.tenant_id,NEW.contract_id,NEW.id,TG_OP,CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE NULL END,to_jsonb(NEW),auth.uid()); RETURN NEW;
 END IF;
END $$;
CREATE TRIGGER z_record_installment_history AFTER INSERT OR UPDATE OR DELETE ON public.contract_installments FOR EACH ROW EXECUTE FUNCTION public.record_installment_history();
CREATE OR REPLACE FUNCTION public.save_contract_installments(p_contract uuid,p_rows jsonb) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.contracts; r jsonb; prior public.contract_installments; ids uuid[]:=ARRAY[]::uuid[]; rid uuid; i integer:=0;
BEGIN
 SELECT * INTO c FROM public.contracts WHERE id=p_contract AND deleted_at IS NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy hợp đồng'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE tenant_id=c.tenant_id AND user_id=auth.uid() AND role IN ('owner','admin','platform_admin')) THEN RAISE EXCEPTION 'Chỉ quản trị viên được sửa đợt thu'; END IF;
 IF jsonb_typeof(p_rows)<>'array' OR jsonb_array_length(p_rows)>24 THEN RAISE EXCEPTION 'Danh sách đợt thu không hợp lệ'; END IF;
 FOR r IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
  rid:=nullif(r->>'id','')::uuid;
  IF rid IS NOT NULL THEN
   IF rid=ANY(ids) THEN RAISE EXCEPTION 'Đợt thu bị trùng'; END IF;
   SELECT * INTO prior FROM public.contract_installments WHERE id=rid AND contract_id=p_contract FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Đợt thu không thuộc hợp đồng'; END IF;
   IF nullif(r->>'expected_updated_at','')::timestamptz IS DISTINCT FROM prior.updated_at THEN RAISE EXCEPTION 'Đợt thu vừa thay đổi; tải lại để không ghi đè thanh toán'; END IF;
   IF (r->>'amount')::numeric<prior.paid_amount THEN RAISE EXCEPTION 'Số tiền đợt thu không được thấp hơn số đã thu'; END IF;
   UPDATE public.contract_installments SET name=btrim(r->>'name'),position=i,percent=nullif(r->>'percent','')::numeric,amount=(r->>'amount')::numeric,due_date=nullif(r->>'due_date','')::date,
    status=CASE WHEN prior.paid_amount>0 AND prior.paid_amount>=(r->>'amount')::numeric THEN 'paid' ELSE 'pending' END WHERE id=rid;
  ELSE
   INSERT INTO public.contract_installments(tenant_id,contract_id,name,position,percent,amount,due_date) VALUES(c.tenant_id,p_contract,btrim(r->>'name'),i,nullif(r->>'percent','')::numeric,(r->>'amount')::numeric,nullif(r->>'due_date','')::date) RETURNING id INTO rid;
  END IF;
  ids:=array_append(ids,rid); i:=i+1;
 END LOOP;
 DELETE FROM public.contract_installments WHERE contract_id=p_contract AND NOT(id=ANY(ids));
 RETURN i;
END $$;
REVOKE ALL ON FUNCTION public.save_contract_installments(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_contract_installments(uuid,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.guard_product_hold(),public.guard_installment_changes(),public.record_installment_history() FROM PUBLIC,anon,authenticated;
