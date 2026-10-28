/** A workspace administrator must not control a global identity outside that workspace. */
export async function assertLocalPasswordTarget(sb: any, tenantId: string, targetUserId: string) {
  const { data, error } = await sb.from("user_roles").select("tenant_id,role").eq("user_id", targetUserId);
  if (error || !Array.isArray(data) || !data.length || data.some((r: { tenant_id: string; role: string }) => r.tenant_id !== tenantId || r.role === "platform_admin" || r.role === "owner")) {
    throw new Error("Tài khoản này cần tự đặt lại mật khẩu qua email; quản trị sàn không được đổi mật khẩu tài khoản chủ sàn hoặc dùng ở nhiều sàn.");
  }
}