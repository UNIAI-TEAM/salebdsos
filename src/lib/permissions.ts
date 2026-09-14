import type { Database } from "@/integrations/supabase/types";

export type Role = Database["public"]["Enums"]["app_role"];

/** Quyền xem / chỉnh sửa theo vai trò trong workspace */
export const ROLE_PERMISSIONS: Record<Role, { view: boolean; edit: boolean; manageMembers: boolean }> = {
  platform_admin: { view: true, edit: true, manageMembers: true },
  owner: { view: true, edit: true, manageMembers: true },
  admin: { view: true, edit: true, manageMembers: true },
  manager: { view: true, edit: true, manageMembers: false },
  agent: { view: true, edit: true, manageMembers: false },
  viewer: { view: true, edit: false, manageMembers: false },
};

export const ROLE_LABELS: Record<Role, string> = {
  platform_admin: "Platform Admin",
  owner: "Agency Owner",
  admin: "Agency Admin",
  manager: "Sales Manager",
  agent: "Sales Agent",
  viewer: "Viewer",
};

export function permissionsFor(role: Role | null) {
  if (!role) return { view: false, edit: false, manageMembers: false };
  return ROLE_PERMISSIONS[role] ?? { view: false, edit: false, manageMembers: false };
}

export function permissionLabel(role: Role | null): string {
  const p = permissionsFor(role);
  if (p.manageMembers) return "Xem, sửa & quản trị";
  if (p.edit) return "Xem & sửa";
  if (p.view) return "Chỉ xem";
  return "Không có quyền";
}
