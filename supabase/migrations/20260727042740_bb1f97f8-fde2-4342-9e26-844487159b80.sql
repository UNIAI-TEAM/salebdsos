
DO $$
DECLARE
  v_user uuid;
  v_tenant uuid := '00000000-0000-0000-0000-000000000777';
  v_team uuid;
BEGIN
  SELECT id INTO v_user FROM auth.users WHERE email='admin@salebdsos.vn';
  IF v_user IS NULL THEN RAISE EXCEPTION 'no user'; END IF;

  -- ensure a team exists in tenant
  SELECT id INTO v_team FROM public.teams WHERE tenant_id = v_tenant LIMIT 1;
  IF v_team IS NULL THEN
    INSERT INTO public.teams (tenant_id, name) VALUES (v_tenant, 'Default Team') RETURNING id INTO v_team;
  END IF;

  -- membership
  INSERT INTO public.team_members (team_id, user_id, tenant_id, is_lead)
  VALUES (v_team, v_user, v_tenant, true)
  ON CONFLICT DO NOTHING;

  -- role scoped to tenant
  INSERT INTO public.user_roles (tenant_id, user_id, role)
  VALUES (v_tenant, v_user, 'owner')
  ON CONFLICT DO NOTHING;
END $$;
