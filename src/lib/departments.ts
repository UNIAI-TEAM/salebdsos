// Pure: department-scoped access. Admins see all departments; a department head
// (team_members.is_lead) sees and reassigns leads only inside their own departments.
import { ADMIN_ROLES } from "./permissions";

export type Membership = { team_id: string; user_id: string; is_lead: boolean };

export function departmentScope(roles: string[], userId: string, members: Membership[], allTeamIds: string[]) {
  const isAdmin = roles.some((r) => ADMIN_ROLES.has(r));
  if (isAdmin) return { isAdmin, viewable: allTeamIds, manageable: allTeamIds };
  const led = members.filter((m) => m.user_id === userId && m.is_lead).map((m) => m.team_id);
  return { isAdmin, viewable: led, manageable: led };
}

/** A lead may be reassigned only to a member of the same department. */
export function canReassign(scope: { manageable: string[] }, teamId: string, toUserId: string, members: Membership[]) {
  return scope.manageable.includes(teamId) && members.some((m) => m.team_id === teamId && m.user_id === toUserId);
}
