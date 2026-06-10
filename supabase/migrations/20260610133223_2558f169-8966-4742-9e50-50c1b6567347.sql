
CREATE TABLE public.verification_resend_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip text,
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX verification_resend_log_email_sent_at_idx
  ON public.verification_resend_log (email, sent_at DESC);
CREATE INDEX verification_resend_log_ip_sent_at_idx
  ON public.verification_resend_log (ip, sent_at DESC);
GRANT ALL ON public.verification_resend_log TO service_role;
ALTER TABLE public.verification_resend_log ENABLE ROW LEVEL SECURITY;
