CREATE OR REPLACE FUNCTION public.initialize_lead_entry() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cfg jsonb; mins integer;
BEGIN
 SELECT value INTO cfg FROM public.settings WHERE tenant_id=NEW.tenant_id AND key='lead_routing';
 cfg:=coalesce(cfg,'{}'::jsonb);
 mins:=CASE WHEN coalesce(cfg->>'slaMinutes','') ~ '^\d+$' THEN greatest(5,least(1440,(cfg->>'slaMinutes')::integer)) ELSE 30 END;
 NEW.meta:=coalesce(NEW.meta,'{}'::jsonb)||jsonb_build_object('sla_minutes',mins,'sla_due_at',coalesce(NEW.created_at,now())+make_interval(mins=>mins));
 RETURN NEW;
END $$;
COMMENT ON FUNCTION public.initialize_lead_entry() IS 'Initialize first-entry SLA on every ingress; preserve resolved owner so notifications and related records target the same Sale.';
REVOKE ALL ON FUNCTION public.initialize_lead_entry() FROM PUBLIC,anon,authenticated;