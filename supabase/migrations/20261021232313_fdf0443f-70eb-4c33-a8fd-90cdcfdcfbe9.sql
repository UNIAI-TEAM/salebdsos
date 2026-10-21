CREATE OR REPLACE FUNCTION public.sync_lead_from_contract()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('active','completed') AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    IF NEW.lead_id IS NOT NULL THEN
      UPDATE public.leads SET status = 'won', updated_at = now() WHERE id = NEW.lead_id AND status <> 'won';
    END IF;
    IF NEW.deal_id IS NOT NULL THEN
      UPDATE public.pipeline_deals SET status = 'won', closed_at = COALESCE(closed_at, now()), last_activity_at = now()
      WHERE id = NEW.deal_id AND status <> 'won';
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.sync_lead_from_contract() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_contracts_sync_lead ON public.contracts;
CREATE TRIGGER trg_contracts_sync_lead AFTER INSERT OR UPDATE OF status, lead_id ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.sync_lead_from_contract();

CREATE OR REPLACE FUNCTION public.sync_lead_from_product()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _lead uuid;
BEGIN
  IF NEW.deal_id IS NULL OR NEW.listing_status NOT IN ('locked','reserved','negotiating','deposited') THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.listing_status IS NOT DISTINCT FROM NEW.listing_status AND OLD.deal_id IS NOT DISTINCT FROM NEW.deal_id THEN RETURN NEW; END IF;
  SELECT lead_id INTO _lead FROM public.pipeline_deals WHERE id = NEW.deal_id;
  IF _lead IS NOT NULL THEN
    UPDATE public.leads SET status = 'deposit', updated_at = now()
    WHERE id = _lead AND status NOT IN ('deposit','won');
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.sync_lead_from_product() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_products_sync_lead ON public.products;
CREATE TRIGGER trg_products_sync_lead AFTER INSERT OR UPDATE OF listing_status, deal_id ON public.products
FOR EACH ROW EXECUTE FUNCTION public.sync_lead_from_product();