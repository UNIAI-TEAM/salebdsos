CREATE TABLE public.tenant_email_domains (
 tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
 domain text NOT NULL UNIQUE,
 provider_domain_id uuid NOT NULL,
 sender_name text NOT NULL,
 sender_email text NOT NULL,
 reply_to text,
 status text NOT NULL DEFAULT 'pending',
 dns_records jsonb NOT NULL DEFAULT '[]',
 enabled boolean NOT NULL DEFAULT false,
 checked_at timestamptz,
 updated_by uuid,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.tenant_email_domains TO service_role;
ALTER TABLE public.tenant_email_domains ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.tenant_email_send_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 recipient text NOT NULL,
 subject text NOT NULL,
 status text NOT NULL,
 provider_id text,
 error text,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.tenant_email_send_logs TO service_role;
ALTER TABLE public.tenant_email_send_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX tenant_email_logs_recent ON public.tenant_email_send_logs(tenant_id,created_at DESC);