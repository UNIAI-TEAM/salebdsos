-- lovable-cron-fallback-reviewed: no delay-until provider; minute checks needed for five-minute SLA window; wake on enqueue, unschedule after drain, max 1440/day disclosed.
CREATE TABLE public.lead_push_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE, user_id uuid NOT NULL, kind text NOT NULL CHECK(kind IN ('assigned','sla_warning')), deadline timestamptz, run_at timestamptz NOT NULL, state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','processing','accepted','failed','skipped','cancelled')), attempts integer NOT NULL DEFAULT 0, last_error text, created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz
);
GRANT ALL ON public.lead_push_jobs TO service_role;
ALTER TABLE public.lead_push_jobs ENABLE ROW LEVEL SECURITY;
CREATE INDEX lead_push_pending_idx ON public.lead_push_jobs(run_at) WHERE state IN ('pending','processing');
CREATE TABLE public.lead_push_runtime (id boolean PRIMARY KEY DEFAULT true CHECK(id), callback_url text NOT NULL);
GRANT ALL ON public.lead_push_runtime TO service_role;
ALTER TABLE public.lead_push_runtime ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.dispatch_lead_push() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE dest text; secret text;
BEGIN
 SELECT callback_url INTO dest FROM public.lead_push_runtime WHERE id;
 SELECT token INTO secret FROM public.cron_tokens WHERE name='lead_push_run';
 IF dest IS NOT NULL AND secret IS NOT NULL THEN
  PERFORM net.http_post(url:=dest,headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',secret),body:='{}'::jsonb,timeout_milliseconds:=20000);
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.dispatch_lead_push() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_lead_push() TO service_role;
CREATE OR REPLACE FUNCTION public.refresh_lead_push_schedule() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE jid bigint;
BEGIN
 PERFORM pg_advisory_xact_lock(78120326);
 SELECT jobid INTO jid FROM cron.job WHERE jobname='lead-push-pending';
 IF EXISTS(SELECT 1 FROM public.lead_push_jobs WHERE state IN ('pending','processing')) AND EXISTS(SELECT 1 FROM public.lead_push_runtime) THEN
  IF jid IS NULL THEN PERFORM cron.schedule('lead-push-pending','* * * * *','SELECT public.dispatch_lead_push();'); END IF;
 ELSIF jid IS NOT NULL THEN PERFORM cron.unschedule(jid); END IF;
END $$;
REVOKE ALL ON FUNCTION public.refresh_lead_push_schedule() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_lead_push_schedule() TO service_role;
CREATE OR REPLACE FUNCTION public.enqueue_lead_push() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE changed boolean; due timestamptz; relevant boolean;
BEGIN
 changed:=TG_OP='INSERT';
 IF TG_OP='UPDATE' THEN
  changed:=NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id;
  relevant:=changed OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at OR NEW.status IS DISTINCT FROM OLD.status OR NEW.meta->>'sla_due_at' IS DISTINCT FROM OLD.meta->>'sla_due_at' OR NEW.meta->>'sla_response_at' IS DISTINCT FROM OLD.meta->>'sla_response_at';
  IF NOT relevant THEN RETURN NEW; END IF;
 END IF;
 PERFORM pg_advisory_xact_lock(78120326);
 IF changed THEN
  UPDATE public.lead_push_jobs SET state='cancelled',finished_at=now() WHERE lead_id=NEW.id AND state IN ('pending','processing');
 END IF;
 IF NEW.owner_user_id IS NULL OR NEW.deleted_at IS NOT NULL THEN
  UPDATE public.lead_push_jobs SET state='cancelled',finished_at=now() WHERE lead_id=NEW.id AND state IN ('pending','processing');
  PERFORM public.refresh_lead_push_schedule(); RETURN NEW;
 END IF;
 IF changed THEN
  INSERT INTO public.lead_push_jobs(tenant_id,lead_id,user_id,kind,run_at) VALUES(NEW.tenant_id,NEW.id,NEW.owner_user_id,'assigned',now());
 END IF;
 BEGIN due:=(NEW.meta->>'sla_due_at')::timestamptz; EXCEPTION WHEN OTHERS THEN due:=NULL; END;
 UPDATE public.lead_push_jobs SET state='cancelled',finished_at=now() WHERE lead_id=NEW.id AND kind='sla_warning' AND state IN ('pending','processing') AND (deadline IS DISTINCT FROM due OR NEW.meta->>'sla_response_at' IS NOT NULL OR NEW.status::text IN ('contacted','won','lost'));
 IF due>now() AND NEW.meta->>'sla_response_at' IS NULL AND NEW.status::text NOT IN ('contacted','won','lost') AND NOT EXISTS(SELECT 1 FROM public.lead_push_jobs WHERE lead_id=NEW.id AND user_id=NEW.owner_user_id AND kind='sla_warning' AND deadline=due AND state<>'cancelled') THEN
  INSERT INTO public.lead_push_jobs(tenant_id,lead_id,user_id,kind,deadline,run_at) VALUES(NEW.tenant_id,NEW.id,NEW.owner_user_id,'sla_warning',due,greatest(now(),due-interval '5 minutes'));
 END IF;
 PERFORM public.refresh_lead_push_schedule();
 IF changed THEN PERFORM public.dispatch_lead_push(); END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enqueue_lead_push() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER enqueue_lead_push AFTER INSERT OR UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.enqueue_lead_push();
CREATE OR REPLACE FUNCTION public.claim_lead_push_jobs() RETURNS SETOF public.lead_push_jobs LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 WITH due AS (SELECT id FROM public.lead_push_jobs WHERE (state='pending' AND run_at<=now()) OR (state='processing' AND run_at<now()-interval '2 minutes') ORDER BY run_at LIMIT 10 FOR UPDATE SKIP LOCKED)
 UPDATE public.lead_push_jobs j SET state='processing',attempts=j.attempts+1,run_at=now() FROM due WHERE j.id=due.id RETURNING j.*;
$$;
REVOKE ALL ON FUNCTION public.claim_lead_push_jobs() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_lead_push_jobs() TO service_role;