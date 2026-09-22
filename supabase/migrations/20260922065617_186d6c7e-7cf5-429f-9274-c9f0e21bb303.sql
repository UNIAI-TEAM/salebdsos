CREATE TABLE public.nurture_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  step_key text NOT NULL,
  channel text NOT NULL,
  body text,
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  owner_user_id uuid,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX nurture_messages_lead_step_idx ON public.nurture_messages (lead_id, step_key) WHERE lead_id IS NOT NULL;
CREATE INDEX nurture_messages_tenant_idx ON public.nurture_messages (tenant_id, sent_at DESC);

GRANT SELECT ON public.nurture_messages TO authenticated;
GRANT ALL ON public.nurture_messages TO service_role;
ALTER TABLE public.nurture_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nurture_messages tenant select" ON public.nurture_messages FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.tenant_id = nurture_messages.tenant_id AND ur.user_id = auth.uid()));

CREATE TABLE public.job_locks (
  key text NOT NULL PRIMARY KEY,
  locked_until timestamptz NOT NULL,
  locked_by text,
  note text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.job_locks TO authenticated;
GRANT ALL ON public.job_locks TO service_role;
ALTER TABLE public.job_locks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "job_locks read" ON public.job_locks FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.acquire_job_lock(_key text, _seconds integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ok boolean := false;
BEGIN
  INSERT INTO public.job_locks (key, locked_until)
  VALUES (_key, now() + make_interval(secs => _seconds))
  ON CONFLICT (key) DO UPDATE
    SET locked_until = now() + make_interval(secs => _seconds),
        updated_at = now()
    WHERE public.job_locks.locked_until < now()
  RETURNING true INTO ok;
  RETURN coalesce(ok, false);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.acquire_job_lock(text, integer) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.acquire_job_lock(text, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.release_job_lock(_key text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.job_locks SET locked_until = now() - interval '1 second', updated_at = now() WHERE key = _key;
$$;

REVOKE EXECUTE ON FUNCTION public.release_job_lock(text) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.release_job_lock(text) TO service_role;