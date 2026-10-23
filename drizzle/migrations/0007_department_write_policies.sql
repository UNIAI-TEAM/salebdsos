DROP POLICY IF EXISTS teams_insert ON public.teams;
DROP POLICY IF EXISTS teams_update ON public.teams;
CREATE POLICY teams_insert ON public.teams FOR INSERT TO authenticated
  WITH CHECK (private.has_tenant_role_in(tenant_id, ARRAY['owner'::app_role,'admin'::app_role]));
CREATE POLICY teams_update ON public.teams FOR UPDATE TO authenticated
  USING (private.has_tenant_role_in(tenant_id, ARRAY['owner'::app_role,'admin'::app_role]))
  WITH CHECK (private.has_tenant_role_in(tenant_id, ARRAY['owner'::app_role,'admin'::app_role]));
DROP POLICY IF EXISTS team_members_insert ON public.team_members;
DROP POLICY IF EXISTS team_members_update ON public.team_members;
CREATE POLICY team_members_insert ON public.team_members FOR INSERT TO authenticated
  WITH CHECK (private.has_tenant_role_in(tenant_id, ARRAY['owner'::app_role,'admin'::app_role]));
CREATE POLICY team_members_update ON public.team_members FOR UPDATE TO authenticated
  USING (private.has_tenant_role_in(tenant_id, ARRAY['owner'::app_role,'admin'::app_role]))
  WITH CHECK (private.has_tenant_role_in(tenant_id, ARRAY['owner'::app_role,'admin'::app_role]));
CREATE UNIQUE INDEX IF NOT EXISTS team_members_team_user_uq ON public.team_members(team_id, user_id);