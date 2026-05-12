
-- platform admin helper
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'platform_admin'::app_role
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin() FROM anon, public;

-- invitations
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  role app_role NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  invited_by uuid,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  accepted_by uuid
);
CREATE INDEX IF NOT EXISTS invitations_tenant_idx ON public.invitations(tenant_id);
CREATE INDEX IF NOT EXISTS invitations_email_idx ON public.invitations(lower(email));
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY invitations_select ON public.invitations FOR SELECT TO authenticated
  USING (has_tenant_role_in(tenant_id, ARRAY['owner','admin']::app_role[]) OR is_platform_admin());
CREATE POLICY invitations_insert ON public.invitations FOR INSERT TO authenticated
  WITH CHECK (has_tenant_role_in(tenant_id, ARRAY['owner','admin']::app_role[]));
CREATE POLICY invitations_update ON public.invitations FOR UPDATE TO authenticated
  USING (has_tenant_role_in(tenant_id, ARRAY['owner','admin']::app_role[]));
CREATE POLICY invitations_delete ON public.invitations FOR DELETE TO authenticated
  USING (has_tenant_role_in(tenant_id, ARRAY['owner','admin']::app_role[]));

-- atomic agency registration
CREATE OR REPLACE FUNCTION public.register_agency(_name text, _slug text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tenant_id uuid;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.tenants (name, slug) VALUES (_name, _slug) RETURNING id INTO _tenant_id;
  INSERT INTO public.user_roles (tenant_id, user_id, role) VALUES (_tenant_id, _uid, 'owner'::app_role);
  RETURN _tenant_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.register_agency(text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.register_agency(text, text) TO authenticated;

-- accept invite atomically
CREATE OR REPLACE FUNCTION public.accept_invitation(_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _inv public.invitations;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _inv FROM public.invitations WHERE token = _token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid invitation'; END IF;
  IF _inv.status <> 'pending' THEN RAISE EXCEPTION 'Invitation no longer pending'; END IF;
  IF _inv.expires_at < now() THEN
    UPDATE public.invitations SET status='expired' WHERE id=_inv.id;
    RAISE EXCEPTION 'Invitation expired';
  END IF;
  INSERT INTO public.user_roles (tenant_id, user_id, role)
  VALUES (_inv.tenant_id, _uid, _inv.role)
  ON CONFLICT DO NOTHING;
  UPDATE public.invitations
    SET status='accepted', accepted_at=now(), accepted_by=_uid
    WHERE id = _inv.id;
  RETURN _inv.tenant_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.accept_invitation(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated;

-- broaden tenants/user_roles select for platform admin
DROP POLICY IF EXISTS tenants_select ON public.tenants;
CREATE POLICY tenants_select ON public.tenants FOR SELECT TO authenticated
  USING (is_tenant_member(id) OR is_platform_admin());

DROP POLICY IF EXISTS user_roles_select ON public.user_roles;
CREATE POLICY user_roles_select ON public.user_roles FOR SELECT TO authenticated
  USING (is_tenant_member(tenant_id) OR is_platform_admin() OR user_id = auth.uid());
