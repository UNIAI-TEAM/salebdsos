import type { Database } from "@/integrations/supabase/types";

export type Role = Database["public"]["Enums"]["app_role"];

/**
 * Phân quyền chi tiết theo vai trò.
 * - platform_admin / owner / admin: quản trị toàn hệ thống (xem + sửa + cấu hình).
 * - manager (quản lý dự án): CHỈ XEM toàn sàn + phân phối lead cho chuyên viên.
 * - agent (chuyên viên bán hàng): làm việc với khách của mình, chỉ xem phễu & tổng quan của mình.
 * - viewer: chỉ xem dữ liệu cơ bản.
 */
export const CAPABILITIES = [
  // Quản trị hệ thống
  "system.settings", // cài đặt workspace, bảo mật, kênh liên lạc
  "system.members", // thành viên & vai trò, quản lý sale, team
  "system.automation", // chính sách hoa hồng, nhắc khách tự động, AI cấu hình
  // Dự án & sản phẩm
  "projects.view",
  "projects.edit",
  "inventory.view",
  "inventory.edit",
  // Khách hàng
  "leads.view.all", // xem toàn bộ lead của sàn
  "leads.edit", // tạo / sửa lead, khách hàng, pipeline, lịch hẹn
  "leads.assign", // phân phối lead + cấu hình luật phân phối
  // Hợp đồng
  "contracts.view.all",
  "contracts.edit", // lập hợp đồng, đợt thanh toán, duyệt hoa hồng
  // Báo cáo
  "reports.team", // xem báo cáo toàn sàn (dashboard, analytics, doanh thu)
  "reports.own", // xem phễu & tổng quan của mình
  // Marketing & danh thiếp
  "marketing.edit",
  "card.own",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

const ADMIN_CAPS: Capability[] = [...CAPABILITIES];

const MANAGER_CAPS: Capability[] = [
  "projects.view",
  "inventory.view",
  "leads.view.all",
  "leads.assign",
  "contracts.view.all",
  "reports.team",
  "reports.own",
  "card.own",
];

const AGENT_CAPS: Capability[] = [
  "projects.view",
  "inventory.view",
  "leads.edit",
  "reports.own",
  "card.own",
];

const VIEWER_CAPS: Capability[] = ["projects.view", "inventory.view", "reports.own"];

export const ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  platform_admin: ADMIN_CAPS,
  owner: ADMIN_CAPS,
  admin: ADMIN_CAPS,
  manager: MANAGER_CAPS,
  agent: AGENT_CAPS,
  viewer: VIEWER_CAPS,
};

export const ROLE_LABELS: Record<Role, string> = {
  platform_admin: "Platform Admin",
  owner: "Agency Owner",
  admin: "Agency Admin",
  manager: "Quản lý dự án",
  agent: "Chuyên viên bán hàng",
  viewer: "Chỉ xem",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  platform_admin: "Toàn quyền trên toàn bộ hệ thống.",
  owner: "Quản trị toàn hệ thống: dữ liệu, hợp đồng, hoa hồng, thành viên, cài đặt.",
  admin: "Quản trị toàn hệ thống: dữ liệu, hợp đồng, hoa hồng, thành viên, cài đặt.",
  manager: "Chỉ xem toàn sàn và phân phối lead cho chuyên viên (không sửa dữ liệu).",
  agent: "Làm việc với khách của mình; chỉ xem phễu và tổng quan của mình.",
  viewer: "Chỉ xem dự án, giỏ hàng và tổng quan cơ bản.",
};

/** Gộp quyền từ danh sách vai trò (một người có thể giữ nhiều vai trò). */
export function capabilitiesFor(roles: Array<Role | string> | null | undefined): Set<Capability> {
  const out = new Set<Capability>();
  for (const role of roles ?? []) {
    const caps = ROLE_CAPABILITIES[role as Role];
    if (caps) caps.forEach((c) => out.add(c));
  }
  return out;
}

export function roleCan(role: Role | null | undefined, cap: Capability): boolean {
  if (!role) return false;
  return (ROLE_CAPABILITIES[role] ?? []).includes(cap);
}

export function rolesCan(roles: Array<Role | string> | null | undefined, cap: Capability): boolean {
  return capabilitiesFor(roles).has(cap);
}

/** Vai trò quản trị (được sửa dữ liệu & cấu hình toàn hệ thống). */
export const ADMIN_ROLES = new Set(["owner", "admin", "platform_admin"]);
/** Vai trò xem được dữ liệu toàn sàn. */
export const TEAM_VIEW_ROLES = new Set(["owner", "admin", "manager", "platform_admin"]);
/** Vai trò thuộc khối kinh doanh. */
export const SALE_ROLES = new Set(["owner", "admin", "manager", "agent", "platform_admin"]);

/** Quyền cần có để vào từng trang trong app. Trang không khai báo = mọi thành viên. */
export const ROUTE_CAPABILITY: Record<string, Capability> = {
  "/settings": "system.settings",
  "/auth-settings": "system.settings",
  "/members": "system.members",
  "/team": "system.members",
  "/sales-directory": "system.members",
  "/commission-rules": "system.automation",
  "/nurture": "system.automation",
  "/lead-capture": "leads.edit",
  "/lead-routing": "leads.assign",
  "/marketing": "marketing.edit",
  "/campaigns": "marketing.edit",
  "/ai-sales-page": "marketing.edit",
  "/ai-lead-score": "reports.team",
  "/analytics": "reports.team",
  "/dashboard": "reports.team",
  "/revenue-report": "reports.team",
};

export function capabilityForPath(pathname: string): Capability | null {
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (ROUTE_CAPABILITY[clean]) return ROUTE_CAPABILITY[clean];
  const parent = Object.keys(ROUTE_CAPABILITY).find((p) => clean === p || clean.startsWith(`${p}/`));
  return parent ? ROUTE_CAPABILITY[parent] : null;
}

/* ------- Tương thích ngược với code cũ (view / edit / manageMembers) -------- */

export const ROLE_PERMISSIONS: Record<Role, { view: boolean; edit: boolean; manageMembers: boolean }> = {
  platform_admin: { view: true, edit: true, manageMembers: true },
  owner: { view: true, edit: true, manageMembers: true },
  admin: { view: true, edit: true, manageMembers: true },
  manager: { view: true, edit: false, manageMembers: false },
  agent: { view: true, edit: true, manageMembers: false },
  viewer: { view: true, edit: false, manageMembers: false },
};

export function permissionsFor(role: Role | null) {
  if (!role) return { view: false, edit: false, manageMembers: false };
  return ROLE_PERMISSIONS[role] ?? { view: false, edit: false, manageMembers: false };
}

export function permissionLabel(role: Role | null): string {
  if (!role) return "Không có quyền";
  const caps = ROLE_CAPABILITIES[role] ?? [];
  if (caps.includes("system.settings")) return "Quản trị toàn hệ thống";
  if (caps.includes("leads.assign")) return "Xem toàn sàn & phân phối lead";
  if (caps.includes("leads.edit")) return "Bán hàng — dữ liệu của mình";
  return "Chỉ xem";
}
