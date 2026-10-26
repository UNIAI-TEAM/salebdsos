CREATE OR REPLACE FUNCTION public.guard_contract_product_hold() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.products;
BEGIN
 IF NEW.product_id IS NULL OR NEW.status='cancelled' OR NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND NEW.product_id IS NOT DISTINCT FROM OLD.product_id AND NEW.owner_user_id IS NOT DISTINCT FROM OLD.owner_user_id AND OLD.status<>'cancelled' THEN RETURN NEW; END IF;
 SELECT * INTO p FROM public.products WHERE id=NEW.product_id FOR UPDATE;
 IF NOT FOUND OR p.tenant_id<>NEW.tenant_id THEN RAISE EXCEPTION 'Căn không thuộc sàn của hợp đồng'; END IF;
 IF p.listing_status IN ('locked','reserved') AND (p.hold_expires_at IS NULL OR p.hold_expires_at>clock_timestamp())
 AND (p.hold_owner_user_id IS NULL OR p.hold_owner_user_id IS DISTINCT FROM NEW.owner_user_id) THEN
 RAISE EXCEPTION 'Căn đang được Sale khác giữ; cần giải phóng trước khi lập hợp đồng'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_guard_contract_product_hold BEFORE INSERT OR UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.guard_contract_product_hold();
REVOKE ALL ON FUNCTION public.guard_contract_product_hold() FROM PUBLIC,anon,authenticated;
