ALTER TABLE public.lead_push_jobs ADD COLUMN referral_id uuid REFERENCES public.agency_lead_referrals(id) ON DELETE CASCADE;
ALTER TABLE public.lead_push_jobs DROP CONSTRAINT lead_push_jobs_kind_check;
ALTER TABLE public.lead_push_jobs ADD CONSTRAINT lead_push_jobs_kind_check CHECK(kind IN ('assigned','sla_warning','agency_assigned','agency_sla_warning'));
ALTER TABLE public.lead_push_jobs ADD CONSTRAINT lead_push_referral_kind_check CHECK ((referral_id IS NULL AND kind IN ('assigned','sla_warning')) OR (referral_id IS NOT NULL AND kind IN ('agency_assigned','agency_sla_warning')));
REVOKE ALL ON public.lead_push_jobs FROM anon,authenticated;
GRANT ALL ON public.lead_push_jobs TO service_role;
CREATE INDEX agency_push_referral_idx ON public.lead_push_jobs(referral_id) WHERE referral_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.agency_push_target(p_job uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT jsonb_build_object('user_id',f.sale_user_id,'tenant_id',f.partner_tenant_id,'sla_due_at',f.sla_due_at,'responded_at',f.responded_at,'status',f.status)
 FROM public.lead_push_jobs j JOIN public.agency_lead_referrals f ON f.id=j.referral_id
 JOIN public.agencies a ON a.id=f.agency_id AND a.tenant_id=f.tenant_id AND a.partner_tenant_id=f.partner_tenant_id
 JOIN public.leads l ON l.id=f.lead_id AND l.tenant_id=f.tenant_id AND l.deleted_at IS NULL
 JOIN public.tenants t ON t.id=f.partner_tenant_id AND t.deleted_at IS NULL AND t.status='active'
 WHERE j.id=p_job AND j.state='processing' AND j.kind IN ('agency_assigned','agency_sla_warning') AND j.lead_id=f.lead_id
 AND j.tenant_id=f.partner_tenant_id AND j.user_id=f.sale_user_id AND a.status='active' AND a.accepted_at IS NOT NULL
 AND f.status<>'closed' AND EXISTS(SELECT 1 FROM public.agency_sale_pool(a.id) p WHERE p.user_id=f.sale_user_id)
$$;
REVOKE ALL ON FUNCTION public.agency_push_target(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.agency_push_target(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.enqueue_agency_push() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE changed boolean; BEGIN
 changed:=TG_OP='INSERT';
 IF TG_OP='UPDATE' THEN
  changed:=NEW.sale_user_id IS DISTINCT FROM OLD.sale_user_id OR NEW.partner_tenant_id IS DISTINCT FROM OLD.partner_tenant_id OR NEW.agency_id IS DISTINCT FROM OLD.agency_id;
  IF NOT changed AND NEW.status IS NOT DISTINCT FROM OLD.status AND NEW.responded_at IS NOT DISTINCT FROM OLD.responded_at AND NEW.sla_due_at IS NOT DISTINCT FROM OLD.sla_due_at THEN RETURN NEW; END IF;
 END IF;
 PERFORM pg_advisory_xact_lock(78120326);
 UPDATE public.lead_push_jobs SET state='cancelled',finished_at=now() WHERE referral_id=NEW.id AND state IN ('pending','processing') AND (changed OR NEW.status='closed' OR (kind='agency_sla_warning' AND (NEW.responded_at IS NOT NULL OR NEW.status<>'assigned' OR deadline IS DISTINCT FROM NEW.sla_due_at)));
 IF NEW.status<>'closed' THEN
  IF changed THEN INSERT INTO public.lead_push_jobs(tenant_id,lead_id,user_id,kind,referral_id,run_at) VALUES(NEW.partner_tenant_id,NEW.lead_id,NEW.sale_user_id,'agency_assigned',NEW.id,now()); END IF;
  IF NEW.status='assigned' AND NEW.responded_at IS NULL AND NEW.sla_due_at>now() AND NOT EXISTS(SELECT 1 FROM public.lead_push_jobs WHERE referral_id=NEW.id AND user_id=NEW.sale_user_id AND tenant_id=NEW.partner_tenant_id AND kind='agency_sla_warning' AND deadline=NEW.sla_due_at AND state<>'cancelled') THEN
   INSERT INTO public.lead_push_jobs(tenant_id,lead_id,user_id,kind,referral_id,deadline,run_at) VALUES(NEW.partner_tenant_id,NEW.lead_id,NEW.sale_user_id,'agency_sla_warning',NEW.id,NEW.sla_due_at,greatest(now(),NEW.sla_due_at-interval '5 minutes'));
  END IF;
 END IF;
 PERFORM public.refresh_lead_push_schedule();
 IF changed THEN PERFORM public.dispatch_lead_push(); END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enqueue_agency_push() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER enqueue_agency_push AFTER INSERT OR UPDATE ON public.agency_lead_referrals FOR EACH ROW EXECUTE FUNCTION public.enqueue_agency_push();
-- The original lead trigger must never cancel independent partner referral jobs.
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
 IF changed THEN UPDATE public.lead_push_jobs SET state='cancelled',finished_at=now() WHERE lead_id=NEW.id AND referral_id IS NULL AND state IN ('pending','processing'); END IF;
 IF NEW.owner_user_id IS NULL OR NEW.deleted_at IS NOT NULL THEN
  UPDATE public.lead_push_jobs SET state='cancelled',finished_at=now() WHERE lead_id=NEW.id AND state IN ('pending','processing') AND (referral_id IS NULL OR NEW.deleted_at IS NOT NULL);
  PERFORM public.refresh_lead_push_schedule(); RETURN NEW;
 END IF;
 IF changed THEN INSERT INTO public.lead_push_jobs(tenant_id,lead_id,user_id,kind,run_at) VALUES(NEW.tenant_id,NEW.id,NEW.owner_user_id,'assigned',now()); END IF;
 BEGIN due:=(NEW.meta->>'sla_due_at')::timestamptz; EXCEPTION WHEN OTHERS THEN due:=NULL; END;
 UPDATE public.lead_push_jobs SET state='cancelled',finished_at=now() WHERE lead_id=NEW.id AND referral_id IS NULL AND kind='sla_warning' AND state IN ('pending','processing') AND (deadline IS DISTINCT FROM due OR NEW.meta->>'sla_response_at' IS NOT NULL OR NEW.status::text IN ('contacted','won','lost'));
 IF due>now() AND NEW.meta->>'sla_response_at' IS NULL AND NEW.status::text NOT IN ('contacted','won','lost') AND NOT EXISTS(SELECT 1 FROM public.lead_push_jobs WHERE lead_id=NEW.id AND referral_id IS NULL AND user_id=NEW.owner_user_id AND kind='sla_warning' AND deadline=due AND state<>'cancelled') THEN
  INSERT INTO public.lead_push_jobs(tenant_id,lead_id,user_id,kind,deadline,run_at) VALUES(NEW.tenant_id,NEW.id,NEW.owner_user_id,'sla_warning',due,greatest(now(),due-interval '5 minutes'));
 END IF;
 PERFORM public.refresh_lead_push_schedule(); IF changed THEN PERFORM public.dispatch_lead_push(); END IF; RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enqueue_lead_push() FROM PUBLIC,anon,authenticated;
