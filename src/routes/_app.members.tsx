import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth, type Role } from "@/hooks/use-auth";
import {
  listMembers, inviteMember, revokeInvitation, updateMemberRole, removeMember,
  createStaffAccount, resetStaffPassword,
} from "@/lib/auth.functions";
import { toast } from "sonner";
import { Mail, Trash2, Copy, ShieldCheck, UserPlus, KeyRound, BadgePlus } from "lucide-react";

export const Route = createFileRoute("/_app/members")({ component: MembersPage });

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "owner", label: "Agency Owner" },
  { value: "admin", label: "Agency Admin" },
  { value: "manager", label: "Sales Manager" },
  { value: "agent", label: "Sales Agent" },
  { value: "viewer", label: "Viewer" },
];

function MembersPage() {
  const { currentTenant, hasRole, user } = useAuth();
  const canManage = hasRole(["owner", "admin"]);
  const tenantId = currentTenant?.id;

  const fetchMembers = useServerFn(listMembers);
  const invite = useServerFn(inviteMember);
  const revoke = useServerFn(revokeInvitation);
  const updateRole = useServerFn(updateMemberRole);
  const remove = useServerFn(removeMember);
  const createStaff = useServerFn(createStaffAccount);
  const resetPass = useServerFn(resetStaffPassword);

  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["members", tenantId],
    queryFn: () => fetchMembers({ data: { tenantId: tenantId! } }),
    enabled: !!tenantId,
  });

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("agent");

  // Tạo tài khoản nhân viên thật (đăng nhập được ngay)
  const [staff, setStaff] = useState({
    fullName: "", email: "", phone: "", password: "", role: "agent" as Role,
  });

  const createStaffMu = useMutation({
    mutationFn: () =>
      createStaff({
        data: {
          tenantId: tenantId!,
          email: staff.email.trim(),
          password: staff.password,
          fullName: staff.fullName.trim(),
          phone: staff.phone.trim() || undefined,
          role: staff.role as "admin" | "manager" | "agent" | "viewer",
        },
      }),
    onSuccess: (res: any) => {
      toast.success(
        res.created
          ? `Đã tạo tài khoản ${res.email}, nhân viên có thể đăng nhập ngay`
          : `Email ${res.email} đã có tài khoản, đã gắn quyền vào workspace`,
      );
      setStaff({ fullName: "", email: "", phone: "", password: "", role: "agent" });
      qc.invalidateQueries({ queryKey: ["members", tenantId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Không tạo được tài khoản"),
  });

  const resetPassMu = useMutation({
    mutationFn: (v: { targetUserId: string; password: string }) =>
      resetPass({ data: { tenantId: tenantId!, ...v } }),
    onSuccess: () => toast.success("Đã đặt lại mật khẩu"),
    onError: (e: any) => toast.error(e.message ?? "Không đặt lại được mật khẩu"),
  });

  const inviteMu = useMutation({
    mutationFn: () => invite({ data: { tenantId: tenantId!, email, role } }),
    onSuccess: (row) => {
      toast.success("Đã tạo lời mời");
      const link = `${window.location.origin}/accept-invite/${row.token}`;
      navigator.clipboard?.writeText(link).catch(() => {});
      toast.message("Link đã sao chép vào clipboard", { description: link });
      setEmail("");
      qc.invalidateQueries({ queryKey: ["members", tenantId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Không gửi được lời mời"),
  });

  const revokeMu = useMutation({
    mutationFn: (id: string) => revoke({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members", tenantId] }),
  });
  const updateMu = useMutation({
    mutationFn: (v: { roleRowId: string; role: Role }) => updateRole({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members", tenantId] }),
  });
  const removeMu = useMutation({
    mutationFn: (roleRowId: string) => remove({ data: { roleRowId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members", tenantId] }),
  });

  if (!tenantId) {
    return <div className="text-sm text-muted-foreground">Chọn workspace trước.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Thành viên & Vai trò</h1>
          <p className="text-sm text-muted-foreground">Quản lý người dùng trong {currentTenant?.name}</p>
        </div>
      </div>

      {canManage && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-1">
            <BadgePlus className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Tạo tài khoản nhân viên</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Tài khoản có email và mật khẩu thật, đăng nhập được ngay với đúng vai trò trong workspace này.
          </p>
          <form
            onSubmit={(e) => { e.preventDefault(); createStaffMu.mutate(); }}
            className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
          >
            <input
              required minLength={2} placeholder="Họ và tên"
              value={staff.fullName}
              onChange={(e) => setStaff({ ...staff, fullName: e.target.value })}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <input
              required type="email" placeholder="email@congty.com"
              value={staff.email}
              onChange={(e) => setStaff({ ...staff, email: e.target.value })}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <input
              placeholder="Số điện thoại (tuỳ chọn)"
              value={staff.phone}
              onChange={(e) => setStaff({ ...staff, phone: e.target.value })}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <input
              required type="password" minLength={8} placeholder="Mật khẩu tạm (tối thiểu 8 ký tự)"
              value={staff.password}
              onChange={(e) => setStaff({ ...staff, password: e.target.value })}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <select
              value={staff.role}
              onChange={(e) => setStaff({ ...staff, role: e.target.value as Role })}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
            >
              {ROLE_OPTIONS.filter((r) => r.value !== "owner").map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={createStaffMu.isPending}
              className="h-10 rounded-lg bg-primary text-primary-foreground px-4 text-sm font-semibold disabled:opacity-60"
            >
              {createStaffMu.isPending ? "Đang tạo..." : "Tạo tài khoản"}
            </button>
          </form>
        </div>
      )}

      {canManage && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <UserPlus className="h-4 w-4" />
            <h2 className="font-semibold">Mời thành viên mới</h2>
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); inviteMu.mutate(); }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <input
              type="email"
              required
              placeholder="email@congty.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 h-10 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
            >
              {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <button
              type="submit"
              disabled={inviteMu.isPending}
              className="h-10 rounded-lg bg-primary text-primary-foreground px-4 text-sm font-semibold disabled:opacity-60"
            >
              {inviteMu.isPending ? "Đang mời..." : "Gửi lời mời"}
            </button>
          </form>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border font-semibold">Thành viên ({q.data?.members.length ?? 0})</div>
        <div className="divide-y divide-border">
          {q.data?.members.map((m) => (
            <div key={m.roleRowId} className="px-5 py-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-muted grid place-items-center text-xs font-semibold">
                {(m.fullName || m.email || "?").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{m.fullName || m.email || m.userId}</div>
                <div className="text-xs text-muted-foreground truncate">{m.email}</div>
              </div>
              {canManage && m.userId !== user?.id ? (
                <select
                  value={m.role}
                  onChange={(e) => updateMu.mutate({ roleRowId: m.roleRowId, role: e.target.value as Role })}
                  className="h-9 rounded-md border border-border bg-background px-2 text-xs"
                >
                  {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              ) : (
                <span className="text-xs px-2 py-1 rounded-md bg-muted">{ROLE_OPTIONS.find((r) => r.value === m.role)?.label ?? m.role}</span>
              )}
              {canManage && m.userId !== user?.id && (
                <button
                  onClick={() => {
                    const pw = prompt(`Mật khẩu mới cho ${m.email ?? "nhân viên"} (tối thiểu 8 ký tự)`);
                    if (!pw) return;
                    if (pw.length < 8) { toast.error("Mật khẩu tối thiểu 8 ký tự"); return; }
                    resetPassMu.mutate({ targetUserId: m.userId, password: pw });
                  }}
                  className="h-9 w-9 grid place-items-center rounded-md hover:bg-muted"
                  title="Đặt lại mật khẩu"
                >
                  <KeyRound className="h-4 w-4" />
                </button>
              )}
              {canManage && m.userId !== user?.id && (
                <button
                  onClick={() => { if (confirm("Xoá thành viên này?")) removeMu.mutate(m.roleRowId); }}
                  className="h-9 w-9 grid place-items-center rounded-md hover:bg-muted text-destructive"
                  title="Xoá"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          {q.isLoading && <div className="px-5 py-6 text-sm text-muted-foreground">Đang tải...</div>}
        </div>
      </div>

      {canManage && (q.data?.invitations?.length ?? 0) > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border font-semibold">Lời mời</div>
          <div className="divide-y divide-border">
            {q.data!.invitations.map((inv: any) => {
              const link = `${typeof window !== "undefined" ? window.location.origin : ""}/accept-invite/${inv.token}`;
              return (
                <div key={inv.id} className="px-5 py-3 flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{inv.email}</div>
                    <div className="text-xs text-muted-foreground">
                      {ROLE_OPTIONS.find((r) => r.value === inv.role)?.label} · {inv.status} · hết hạn {new Date(inv.expires_at).toLocaleDateString("vi-VN")}
                    </div>
                  </div>
                  {inv.status === "pending" && (
                    <>
                      <button
                        onClick={() => { navigator.clipboard.writeText(link); toast.success("Đã sao chép link"); }}
                        className="h-8 px-2 rounded-md hover:bg-muted text-xs flex items-center gap-1"
                      >
                        <Copy className="h-3.5 w-3.5" /> Sao chép link
                      </button>
                      <button
                        onClick={() => revokeMu.mutate(inv.id)}
                        className="h-8 px-2 rounded-md hover:bg-muted text-xs text-destructive"
                      >
                        Thu hồi
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
