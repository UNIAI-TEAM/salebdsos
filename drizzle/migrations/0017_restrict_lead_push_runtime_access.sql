REVOKE ALL ON public.lead_push_jobs FROM anon, authenticated;
REVOKE ALL ON public.lead_push_runtime FROM anon, authenticated;
COMMENT ON TABLE public.lead_push_jobs IS 'Private durable lead assignment and SLA notification outbox. Provider acceptance is not device display confirmation.';