-- Published older workers must not claim referral jobs before the new worker is deployed.
CREATE OR REPLACE FUNCTION public.claim_lead_push_jobs() RETURNS SETOF public.lead_push_jobs LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 WITH due AS (SELECT id FROM public.lead_push_jobs WHERE referral_id IS NULL AND ((state='pending' AND run_at<=now()) OR (state='processing' AND run_at<now()-interval '2 minutes')) ORDER BY run_at LIMIT 10 FOR UPDATE SKIP LOCKED)
 UPDATE public.lead_push_jobs j SET state='processing',attempts=j.attempts+1,run_at=now() FROM due WHERE j.id=due.id RETURNING j.*;
$$;
REVOKE ALL ON FUNCTION public.claim_lead_push_jobs() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_lead_push_jobs() TO service_role;
CREATE OR REPLACE FUNCTION public.claim_push_jobs_v2() RETURNS SETOF public.lead_push_jobs LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 WITH due AS (SELECT id FROM public.lead_push_jobs WHERE (state='pending' AND run_at<=now()) OR (state='processing' AND run_at<now()-interval '2 minutes') ORDER BY run_at LIMIT 10 FOR UPDATE SKIP LOCKED)
 UPDATE public.lead_push_jobs j SET state='processing',attempts=j.attempts+1,run_at=now() FROM due WHERE j.id=due.id RETURNING j.*;
$$;
REVOKE ALL ON FUNCTION public.claim_push_jobs_v2() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_push_jobs_v2() TO service_role;