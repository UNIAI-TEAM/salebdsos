CREATE TABLE public.social_comment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  page_id text NOT NULL,
  post_id text,
  comment_id text NOT NULL,
  author_id text,
  author_name text,
  message text,
  phone text,
  hidden boolean NOT NULL DEFAULT false,
  replied boolean NOT NULL DEFAULT false,
  messaged boolean NOT NULL DEFAULT false,
  lead_id uuid,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, comment_id)
);
CREATE INDEX social_comment_logs_tenant_idx ON public.social_comment_logs(tenant_id, created_at DESC);
GRANT SELECT ON public.social_comment_logs TO authenticated;
GRANT ALL ON public.social_comment_logs TO service_role;
ALTER TABLE public.social_comment_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "social_comment_logs tenant read" ON public.social_comment_logs
  FOR SELECT TO authenticated USING (private.is_tenant_member(tenant_id));