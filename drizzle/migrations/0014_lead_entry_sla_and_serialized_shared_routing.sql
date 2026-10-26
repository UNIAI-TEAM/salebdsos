CREATE OR REPLACE FUNCTION public.initialize_lead_entry() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cfg jsonb; mins integer; pool jsonb; project_pool jsonb; selected_owner uuid;
BEGIN
 SELECT value INTO cfg FROM public.settings WHERE tenant_id=NEW.tenant_id AND key='lead_routing';
 cfg:=coalesce(cfg,'{}'::jsonb);
 mins:=CASE WHEN coalesce(cfg->>'slaMinutes','') ~ '^\d+$' THEN greatest(5,least(1440,(cfg->>'slaMinutes')::integer)) ELSE 30 END;
 NEW.meta:=coalesce(NEW.meta,'{}'::jsonb)||jsonb_build_object('sla_minutes',mins,'sla_due_at',coalesce(NEW.created_at,now())+make_interval(mins=>mins));
 IF cfg->>'enabled'='true' AND (NEW.owner_user_id IS NULL OR NEW.meta->>'auto_assigned'='true' OR NEW.meta->>'channel_identity'='true') THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.tenant_id::text,73));
  SELECT item->'userIds' INTO project_pool FROM jsonb_array_elements(coalesce(cfg->'projectRules','[]'::jsonb)) item WHERE item->>'projectId'=NEW.project_id::text LIMIT 1;
  pool:=CASE WHEN jsonb_array_length(coalesce(project_pool,'[]'::jsonb))>0 THEN project_pool ELSE coalesce(cfg->'fallbackUserIds','[]'::jsonb) END;
  SELECT r.user_id INTO selected_owner FROM jsonb_array_elements_text(pool) WITH ORDINALITY p(uid,ord) JOIN public.user_roles r ON r.tenant_id=NEW.tenant_id AND r.user_id::text=p.uid AND r.role::text IN ('owner','admin','manager','agent') ORDER BY (SELECT count(*) FROM public.leads l WHERE l.tenant_id=NEW.tenant_id AND l.owner_user_id=r.user_id AND l.deleted_at IS NULL AND l.created_at>=now()-interval '30 days'),p.ord LIMIT 1;
  NEW.owner_user_id:=selected_owner;
  NEW.meta:=NEW.meta||jsonb_build_object('auto_assigned',selected_owner IS NOT NULL);
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.initialize_lead_entry() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER initialize_lead_entry BEFORE INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION public.initialize_lead_entry();
CREATE OR REPLACE FUNCTION public.record_lead_first_response() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE lead_uuid uuid;
BEGIN
 IF NEW.direction::text='out' AND NEW.channel::text<>'note' AND NEW.delivery_status::text IN ('sent','delivered','read') AND NEW.sender_user_id IS NOT NULL THEN
  SELECT lead_id INTO lead_uuid FROM public.conversations WHERE id=NEW.conversation_id AND tenant_id=NEW.tenant_id;
  UPDATE public.leads SET meta=coalesce(meta,'{}'::jsonb)||jsonb_build_object('sla_response_at',NEW.created_at) WHERE id=lead_uuid AND tenant_id=NEW.tenant_id AND NOT coalesce(meta,'{}'::jsonb) ? 'sla_response_at';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.record_lead_first_response() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER record_lead_first_response AFTER INSERT OR UPDATE OF delivery_status ON public.conversation_messages FOR EACH ROW EXECUTE FUNCTION public.record_lead_first_response();