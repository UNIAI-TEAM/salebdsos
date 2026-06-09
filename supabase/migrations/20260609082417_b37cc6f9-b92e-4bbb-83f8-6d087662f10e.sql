
CREATE TABLE public.auth_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  allowed_email_domains text[] NOT NULL DEFAULT '{}',
  google_oauth_mode text NOT NULL DEFAULT 'managed' CHECK (google_oauth_mode IN ('managed','custom')),
  enforce_domain_allowlist boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.auth_settings TO authenticated;
GRANT ALL ON public.auth_settings TO service_role;

ALTER TABLE public.auth_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_settings readable by authenticated"
  ON public.auth_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_settings writable by platform admin"
  ON public.auth_settings FOR ALL TO authenticated
  USING (private.is_platform_admin())
  WITH CHECK (private.is_platform_admin());

INSERT INTO public.auth_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

CREATE TRIGGER set_auth_settings_updated_at
  BEFORE UPDATE ON public.auth_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
