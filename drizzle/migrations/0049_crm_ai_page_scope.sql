CREATE TRIGGER a_guard_crm_tenant_refs BEFORE INSERT OR UPDATE ON public.ai_sales_pages FOR EACH ROW EXECUTE FUNCTION public.guard_crm_tenant_refs();
DO $$ DECLARE p record;BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='ai_sales_pages' LOOP EXECUTE format('DROP POLICY %I ON public.ai_sales_pages',p.policyname);END LOOP;END $$;
CREATE POLICY crm_read ON public.ai_sales_pages FOR SELECT TO authenticated USING(private.crm_read(tenant_id,owner_user_id));
CREATE POLICY crm_insert ON public.ai_sales_pages FOR INSERT TO authenticated WITH CHECK(private.crm_write(tenant_id,owner_user_id));
CREATE POLICY crm_update ON public.ai_sales_pages FOR UPDATE TO authenticated USING(private.crm_write(tenant_id,owner_user_id)) WITH CHECK(private.crm_write(tenant_id,owner_user_id));
CREATE POLICY crm_delete ON public.ai_sales_pages FOR DELETE TO authenticated USING(private.crm_admin(tenant_id));
CREATE TRIGGER z_guard_crm_assignment BEFORE INSERT OR UPDATE ON public.ai_sales_pages FOR EACH ROW EXECUTE FUNCTION public.guard_crm_assignment();
-- Event guest identities follow the linked lead, not mere tenant membership.
DROP POLICY "tickets tenant all" ON public.event_tickets;
CREATE POLICY event_guest_read ON public.event_tickets FOR SELECT TO authenticated USING(private.crm_admin(tenant_id) OR private.crm_record_read(tenant_id,'lead',lead_id));
CREATE POLICY event_guest_insert ON public.event_tickets FOR INSERT TO authenticated WITH CHECK(private.crm_admin(tenant_id));
CREATE POLICY event_guest_update ON public.event_tickets FOR UPDATE TO authenticated USING(private.crm_admin(tenant_id)) WITH CHECK(private.crm_admin(tenant_id));
CREATE POLICY event_guest_delete ON public.event_tickets FOR DELETE TO authenticated USING(private.crm_admin(tenant_id));