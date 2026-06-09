
-- 1) Tighten chat_leads INSERT policy
DROP POLICY IF EXISTS "Anyone can insert chat leads" ON public.chat_leads;
DROP POLICY IF EXISTS "Public can submit chat leads" ON public.chat_leads;
CREATE POLICY "Public can submit chat leads"
  ON public.chat_leads FOR INSERT TO anon, authenticated
  WITH CHECK (
    char_length(coalesce(name,'')) BETWEEN 1 AND 200
    AND (email IS NULL OR char_length(email) <= 254)
    AND (phone IS NULL OR char_length(phone) <= 32)
    AND (notes IS NULL OR char_length(notes) <= 4000)
    AND (source IS NULL OR char_length(source) <= 100)
  );

-- 2) private schema + helpers
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_tenant_role(_tenant uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles
    WHERE tenant_id = _tenant AND user_id = auth.uid() AND role = _role)
$$;

CREATE OR REPLACE FUNCTION private.has_tenant_role_in(_tenant uuid, _roles public.app_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles
    WHERE tenant_id = _tenant AND user_id = auth.uid() AND role = ANY(_roles))
$$;

CREATE OR REPLACE FUNCTION private.is_tenant_member(_tenant uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles
    WHERE tenant_id = _tenant AND user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION private.is_platform_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'platform_admin'::public.app_role)
$$;

CREATE OR REPLACE FUNCTION private.register_agency(_name text, _slug text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _tenant_id uuid; _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.tenants (name, slug) VALUES (_name, _slug) RETURNING id INTO _tenant_id;
  INSERT INTO public.user_roles (tenant_id, user_id, role) VALUES (_tenant_id, _uid, 'owner'::public.app_role);
  RETURN _tenant_id;
END $$;

CREATE OR REPLACE FUNCTION private.accept_invitation(_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _inv public.invitations; _uid uuid := auth.uid();
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
  VALUES (_inv.tenant_id, _uid, _inv.role) ON CONFLICT DO NOTHING;
  UPDATE public.invitations SET status='accepted', accepted_at=now(), accepted_by=_uid WHERE id = _inv.id;
  RETURN _inv.tenant_id;
END $$;

CREATE OR REPLACE FUNCTION private.ensure_default_pipeline_stages(_tenant uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _exists int;
BEGIN
  IF NOT private.is_tenant_member(_tenant) AND NOT private.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT COUNT(*) INTO _exists FROM public.pipeline_stages
    WHERE tenant_id = _tenant AND deleted_at IS NULL;
  IF _exists > 0 THEN RETURN; END IF;
  INSERT INTO public.pipeline_stages (tenant_id, name, position, win_probability) VALUES
    (_tenant, 'Mới', 0, 5),
    (_tenant, 'Đã liên hệ', 1, 15),
    (_tenant, 'Đang tư vấn', 2, 35),
    (_tenant, 'Đã báo giá', 3, 55),
    (_tenant, 'Đặt cọc', 4, 80),
    (_tenant, 'Thành công', 5, 100),
    (_tenant, 'Thất bại', 6, 0);
END $$;

REVOKE ALL ON FUNCTION private.has_tenant_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.has_tenant_role_in(uuid, public.app_role[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_tenant_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_platform_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.register_agency(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.accept_invitation(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.ensure_default_pipeline_stages(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION private.has_tenant_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_tenant_role_in(uuid, public.app_role[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_tenant_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_platform_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.register_agency(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION private.accept_invitation(text) TO service_role;
GRANT EXECUTE ON FUNCTION private.ensure_default_pipeline_stages(uuid) TO service_role;

-- 3) Rewrite ALL dependent policies (public + storage) to reference private.*
DO $$
DECLARE r record; new_qual text; new_check text; sql text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
    FROM pg_policies
    WHERE schemaname IN ('public','storage')
      AND (qual ~ '\m(has_tenant_role|has_tenant_role_in|is_tenant_member|is_platform_admin)\M'
        OR with_check ~ '\m(has_tenant_role|has_tenant_role_in|is_tenant_member|is_platform_admin)\M')
  LOOP
    new_qual := regexp_replace(r.qual,
      '(^|[^.\w])(has_tenant_role_in|has_tenant_role|is_tenant_member|is_platform_admin)\(',
      '\1private.\2(', 'g');
    new_check := regexp_replace(r.with_check,
      '(^|[^.\w])(has_tenant_role_in|has_tenant_role|is_tenant_member|is_platform_admin)\(',
      '\1private.\2(', 'g');

    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);

    sql := format('CREATE POLICY %I ON %I.%I FOR %s TO %s',
      r.policyname, r.schemaname, r.tablename, r.cmd,
      array_to_string(r.roles, ','));
    IF new_qual IS NOT NULL THEN sql := sql || ' USING ('||new_qual||')'; END IF;
    IF new_check IS NOT NULL THEN sql := sql || ' WITH CHECK ('||new_check||')'; END IF;
    EXECUTE sql;
  END LOOP;
END $$;

-- 4) Drop public versions
DROP FUNCTION IF EXISTS public.has_tenant_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.has_tenant_role_in(uuid, public.app_role[]);
DROP FUNCTION IF EXISTS public.is_tenant_member(uuid);
DROP FUNCTION IF EXISTS public.is_platform_admin();
DROP FUNCTION IF EXISTS public.register_agency(text, text);
DROP FUNCTION IF EXISTS public.accept_invitation(text);
DROP FUNCTION IF EXISTS public.ensure_default_pipeline_stages(uuid);
