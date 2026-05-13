import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth, type Role } from "@/hooks/use-auth";
import { PageHeader, SectionCard, KpiCard } from "@/components/app/ui";
import {
  Crown, Plus, Trophy, Users2, Target, DollarSign,
  CheckCircle2, TrendingUp, Search, Filter, Calendar, Download, Star,
  Activity, ArrowRight, ShieldCheck, Mail, Pencil, Trash2, UserPlus, Copy, IdCard,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  listMembers, inviteMember, revokeInvitation, updateMemberRole, removeMember,
} from "@/lib/auth.functions";
import {
  getTeamPerformance, getTeamLeaderboard, getTeamActivity,
  assignCardsToMember, listTenantCards,
} from "@/lib/team.functions";

export const Route = createFileRoute("/_app/team")({ component: TeamPage });

const ROLE_OPTIONS: { value: Role; label: string; desc: string }[] = [
  { value: "owner", label: "Agency Owner", desc: "Toàn quyền hệ thống" },
  { value: "admin", label: "Agency Admin", desc: "Quản trị workspace" },
  { value: "manager", label: "Sales Manager", desc: "Quản lý đội sales" },
  { value: "agent", label: "Sales Agent", desc: "Sale tiêu chuẩn" },
  { value: "viewer", label: "Viewer", desc: "Chỉ xem" },
];
const tabs = ["Tổng quan", "Thành viên", "Phân quyền", "Phân công danh thiếp", "Hoạt động"];

function fmtMoney(n: number) {
  if (!n) return "0";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + " tỷ";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + " tr";
  return n.toLocaleString("vi-VN");
}
function pct(v: number) {
  return (v * 100).toFixed(1) + "%";
}

function TeamPage() {
  const { currentTenant, hasRole, user } = useAuth();
  const tenantId = currentTenant?.id;
  const canManage = hasRole(["owner", "admin"]);
  const qc = useQueryClient();

  const fetchMembers = useServerFn(listMembers);
  const fetchPerf = useServerFn(getTeamPerformance);
  const fetchLb = useServerFn(getTeamLeaderboard);
  const fetchAct = useServerFn(getTeamActivity);
  const fetchCards = useServerFn(listTenantCards);
  const invite = useServerFn(inviteMember);
  const revoke = useServerFn(revokeInvitation);
  const updateRole = useServerFn(updateMemberRole);
  const remove = useServerFn(removeMember);
  const assignCards = useServerFn(assignCardsToMember);

  const membersQ = useQuery({
    queryKey: ["team-members", tenantId],
    queryFn: () => fetchMembers({ data: { tenantId: tenantId! } }),
    enabled: !!tenantId,
  });
  const perfQ = useQuery({
    queryKey: ["team-perf", tenantId],
    queryFn: () => fetchPerf({ data: { tenantId: tenantId!, days: 30 } }),
    enabled: !!tenantId,
  });
  const lbQ = useQuery({
    queryKey: ["team-lb", tenantId],
    queryFn: () => fetchLb({ data: { tenantId: tenantId!, metric: "revenue", limit: 10 } }),
    enabled: !!tenantId,
  });
  const actQ = useQuery({
    queryKey: ["team-act", tenantId],
    queryFn: () => fetchAct({ data: { tenantId: tenantId!, limit: 10 } }),
    enabled: !!tenantId,
  });
  const cardsQ = useQuery({
    queryKey: ["team-cards", tenantId],
    queryFn: () => fetchCards({ data: { tenantId: tenantId! } }),
    enabled: !!tenantId,
  });

  const [tab, setTab] = useState(0);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [inviteOpen, setInviteOpen] = useState(false);

  const inviteMu = useMutation({
    mutationFn: (v: { email: string; role: Role }) =>
      invite({ data: { tenantId: tenantId!, email: v.email, role: v.role } }),
    onSuccess: (row) => {
      toast.success("Đã tạo lời mời");
      const link = `${window.location.origin}/accept-invite/${row.token}`;
      navigator.clipboard?.writeText(link).catch(() => {});
      toast.message("Link đã sao chép", { description: link });
      qc.invalidateQueries({ queryKey: ["team-members", tenantId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Không gửi được lời mời"),
  });
  const updateMu = useMutation({
    mutationFn: (v: { roleRowId: string; role: Role }) => updateRole({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team-members", tenantId] }),
  });
  const removeMu = useMutation({
    mutationFn: (roleRowId: string) => remove({ data: { roleRowId } }),
    onSuccess: () => {
      toast.success("Đã xoá thành viên");
      qc.invalidateQueries({ queryKey: ["team-members", tenantId] });
    },
  });
  const revokeMu = useMutation({
    mutationFn: (id: string) => revoke({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team-members", tenantId] }),
  });
  const assignCardMu = useMutation({
    mutationFn: (v: { cardIds: string[]; ownerUserId: string }) =>
      assignCards({ data: { tenantId: tenantId!, ...v } }),
    onSuccess: (r) => {
      toast.success(`Đã phân công ${r.count} danh thiếp`);
      qc.invalidateQueries({ queryKey: ["team-cards", tenantId] });
      qc.invalidateQueries({ queryKey: ["team-perf", tenantId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Lỗi phân công"),
  });

  if (!tenantId) {
    return <div className="text-sm text-muted-foreground">Chọn workspace trước.</div>;
  }

  const members = membersQ.data?.members ?? [];
  const invitations = membersQ.data?.invitations ?? [];
  const perf = perfQ.data;
  const perfMap = new Map(perf?.members.map((m) => [m.userId, m]) ?? []);

  const merged = members.map((m) => ({
    ...m,
    perf: perfMap.get(m.userId),
  }));
  const filtered = merged.filter((m) => {
    if (roleFilter !== "all" && m.role !== roleFilter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (m.fullName ?? "").toLowerCase().includes(q) ||
      (m.email ?? "").toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q);
  });

  const totals = perf?.totals;
  const revShare = perf?.members
    .filter((m) => m.revenue > 0)
    .slice(0, 5)
    .map((m, i) => ({
      name: m.fullName || m.email || "—",
      value: m.revenue,
      color: ["hsl(244 75% 60%)", "hsl(199 89% 55%)", "hsl(160 64% 45%)", "hsl(346 77% 60%)", "hsl(38 92% 50%)"][i % 5],
    })) ?? [];

  // Time series: last 7 buckets aggregated synthetically from leads/deals would require more queries.
  // Provide a flat preview using totals split equally.
  const series = Array.from({ length: 7 }).map((_, i) => ({
    d: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"][i],
    rev: ((totals?.revenue ?? 0) / 7) / 1e9,
    deals: Math.round((totals?.dealsWon ?? 0) / 7),
    leads: Math.round((totals?.leads ?? 0) / 7),
  }));

  const kpis = [
    { icon: Users2, label: "Tổng thành viên", value: String(totals?.memberCount ?? members.length), delta: 0, tone: "primary" as const },
    { icon: CheckCircle2, label: "Đang hoạt động", value: String(totals?.activeMembers ?? 0), delta: 0, tone: "blue" as const },
    { icon: DollarSign, label: "Doanh thu thắng", value: fmtMoney(totals?.revenue ?? 0), delta: 0, tone: "green" as const },
    { icon: Crown, label: "Deals thắng", value: String(totals?.dealsWon ?? 0), delta: 0, tone: "amber" as const },
    { icon: TrendingUp, label: "Conversion TB", value: pct(totals?.avgConversion ?? 0), delta: 0, tone: "indigo" as const },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
      <div className="space-y-6 min-w-0">
        <PageHeader
          title="Team Management"
          sub="Quản lý đội nhóm, phân quyền và hiệu suất"
          action={
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const csv = ["Họ tên,Email,Vai trò,Leads,Deals thắng,Doanh thu,Tỷ lệ chuyển đổi,NFC/QR"].concat(
                    merged.map((m) =>
                      [m.fullName ?? "", m.email ?? "", m.role,
                      m.perf?.leadsTotal ?? 0, m.perf?.dealsWon ?? 0,
                      m.perf?.revenue ?? 0, ((m.perf?.conversionRate ?? 0) * 100).toFixed(1) + "%",
                      m.perf?.nfcQrInteractions ?? 0].join(","),
                    ),
                  ).join("\n");
                  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a"); a.href = url; a.download = "team-performance.csv"; a.click();
                  URL.revokeObjectURL(url);
                }}
                className="h-9 px-3 rounded-xl border border-border bg-card text-[12.5px] font-semibold inline-flex items-center gap-1.5 hover:bg-muted/50">
                <Download className="h-4 w-4" /> Xuất báo cáo
              </button>
              {canManage && (
                <button onClick={() => setInviteOpen(true)} className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold inline-flex items-center gap-1.5">
                  <UserPlus className="h-4 w-4" /> Mời thành viên
                </button>
              )}
            </div>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {kpis.map((k) => <KpiCard key={k.label} {...k} deltaLabel="30 ngày qua" />)}
        </div>

        <div className="border-b border-border">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin">
            {tabs.map((t, i) => (
              <button key={t} onClick={() => setTab(i)}
                className={[
                  "px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 -mb-px transition",
                  tab === i ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                ].join(" ")}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {(tab === 0 || tab === 1) && (
          <div className="flex flex-wrap items-center gap-2">
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
              className="h-9 px-3 rounded-xl border border-border bg-card text-[12.5px] outline-none focus:ring-2 focus:ring-primary/30">
              <option value="all">Tất cả vai trò</option>
              {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <button className="h-9 px-3 rounded-xl border border-border bg-card text-[12.5px] inline-flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" /> 30 ngày qua
            </button>
            <div className="ml-auto relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm theo tên, email..."
                className="h-9 pl-8 pr-3 rounded-xl border border-border bg-card text-[12.5px] w-64 outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
        )}

        {tab === 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SectionCard title="Hiệu suất 7 ngày" className="lg:col-span-2">
              <div className="h-[260px] -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="d" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                    <Line type="monotone" dataKey="rev" name="Doanh thu (tỷ)" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="deals" name="Deals" stroke="hsl(199 89% 55%)" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="leads" name="Leads" stroke="hsl(160 64% 45%)" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title="Top doanh thu thành viên">
              {revShare.length === 0 ? (
                <div className="py-10 text-center text-[12.5px] text-muted-foreground">Chưa có doanh thu thắng.</div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="h-[200px] w-[180px] relative shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={revShare} dataKey="value" innerRadius={56} outerRadius={82} paddingAngle={2}>
                          {revShare.map((d) => <Cell key={d.name} fill={d.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 grid place-items-center pointer-events-none">
                      <div className="text-center">
                        <div className="text-[16px] font-bold leading-tight">{fmtMoney(totals?.revenue ?? 0)}</div>
                        <div className="text-[10.5px] text-muted-foreground">tổng doanh thu</div>
                      </div>
                    </div>
                  </div>
                  <ul className="flex-1 space-y-2 text-[12px] min-w-0">
                    {revShare.map((d) => (
                      <li key={d.name} className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
                        <span className="flex-1 truncate">{d.name}</span>
                        <span className="font-semibold">{fmtMoney(d.value)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </SectionCard>
          </div>
        )}

        {(tab === 0 || tab === 1) && (
          <SectionCard title="Hiệu suất thành viên">
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    {["Thành viên", "Vai trò", "Leads", "Deals thắng", "Doanh thu", "Conversion", "NFC/QR", "Pipeline", ""].map((h, i) => (
                      <th key={i} className="font-medium px-2 py-2.5 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => {
                    const initials = (m.fullName || m.email || "?").slice(0, 2).toUpperCase();
                    const isMe = m.userId === user?.id;
                    return (
                      <tr key={m.roleRowId} className="border-b border-border/60 hover:bg-muted/30">
                        <td className="px-2 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-indigo-500 grid place-items-center text-white text-[11px] font-semibold">{initials}</div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold">{m.fullName ?? m.email ?? "—"}</span>
                                {isMe && <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-md bg-primary-soft text-primary">Bạn</span>}
                              </div>
                              <div className="text-[10.5px] text-muted-foreground truncate">{m.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-2.5">
                          {canManage && !isMe ? (
                            <select
                              value={m.role}
                              onChange={(e) => updateMu.mutate({ roleRowId: m.roleRowId, role: e.target.value as Role })}
                              className="h-7 rounded-md border border-border bg-card px-1.5 text-[11.5px]"
                            >
                              {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                          ) : (
                            <span className="text-[11.5px] px-2 py-0.5 rounded-md bg-muted">{ROLE_OPTIONS.find((r) => r.value === m.role)?.label ?? m.role}</span>
                          )}
                        </td>
                        <td className="px-2 py-2.5 font-semibold">{m.perf?.leadsTotal ?? 0}</td>
                        <td className="px-2 py-2.5 font-semibold">{m.perf?.dealsWon ?? 0}</td>
                        <td className="px-2 py-2.5 font-semibold text-primary">{fmtMoney(m.perf?.revenue ?? 0)}</td>
                        <td className="px-2 py-2.5">{pct(m.perf?.conversionRate ?? 0)}</td>
                        <td className="px-2 py-2.5">{m.perf?.nfcQrInteractions ?? 0}</td>
                        <td className="px-2 py-2.5 text-muted-foreground">{fmtMoney(m.perf?.pipelineValue ?? 0)}</td>
                        <td className="px-2 py-2.5">
                          {canManage && !isMe && (
                            <button onClick={() => { if (confirm(`Xoá ${m.fullName ?? m.email}?`)) removeMu.mutate(m.roleRowId); }}
                              title="Xoá" className="h-7 w-7 grid place-items-center rounded-md text-muted-foreground hover:text-rose-600 hover:bg-rose-50">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {!membersQ.isLoading && filtered.length === 0 && (
                    <tr><td colSpan={9} className="px-2 py-10 text-center text-muted-foreground text-[12.5px]">Không có thành viên phù hợp.</td></tr>
                  )}
                  {membersQ.isLoading && (
                    <tr><td colSpan={9} className="px-2 py-10 text-center text-muted-foreground text-[12.5px]">Đang tải...</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {invitations.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="text-[12px] font-semibold text-muted-foreground mb-2">Lời mời ({invitations.length})</div>
                <div className="space-y-1.5">
                  {invitations.map((inv: any) => {
                    const link = `${typeof window !== "undefined" ? window.location.origin : ""}/accept-invite/${inv.token}`;
                    return (
                      <div key={inv.id} className="flex items-center gap-2 text-[12px] py-1.5 px-2 rounded-md hover:bg-muted/40">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium truncate flex-1">{inv.email}</span>
                        <span className="text-[11px] text-muted-foreground">{ROLE_OPTIONS.find((r) => r.value === inv.role)?.label ?? inv.role}</span>
                        <span className={[
                          "text-[10.5px] px-1.5 py-0.5 rounded-md font-semibold",
                          inv.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-muted text-muted-foreground",
                        ].join(" ")}>{inv.status}</span>
                        {canManage && inv.status === "pending" && (
                          <>
                            <button onClick={() => { navigator.clipboard.writeText(link); toast.success("Đã sao chép link"); }}
                              className="h-7 w-7 grid place-items-center rounded-md hover:bg-muted">
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => revokeMu.mutate(inv.id)}
                              className="h-7 px-2 rounded-md hover:bg-muted text-[11px] text-rose-600">Thu hồi</button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </SectionCard>
        )}

        {tab === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {ROLE_OPTIONS.map((r) => {
              const count = members.filter((m) => m.role === r.value).length;
              return (
                <SectionCard key={r.value}>
                  <div className="rounded-xl bg-gradient-to-br from-primary/5 to-transparent p-4 -m-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-foreground/70" />
                        <div className="text-[15px] font-bold">{r.label}</div>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-card border border-border font-semibold">{count} người</span>
                    </div>
                    <div className="text-[12px] text-muted-foreground">{r.desc}</div>
                  </div>
                </SectionCard>
              );
            })}
          </div>
        )}

        {tab === 3 && (
          <SectionCard title="Phân công danh thiếp">
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    {["Danh thiếp", "Chủ sở hữu", "Trạng thái", ""].map((h, i) => (
                      <th key={i} className="font-medium px-2 py-2.5 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(cardsQ.data?.cards ?? []).map((c: any) => {
                    const owner = members.find((m) => m.userId === c.owner_user_id);
                    return (
                      <tr key={c.id} className="border-b border-border/60 hover:bg-muted/30">
                        <td className="px-2 py-2.5">
                          <div className="flex items-center gap-2">
                            <IdCard className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">{c.display_name}</span>
                            <span className="text-[11px] text-muted-foreground">/{c.slug}</span>
                          </div>
                        </td>
                        <td className="px-2 py-2.5">{owner?.fullName ?? owner?.email ?? <span className="text-muted-foreground">Chưa gán</span>}</td>
                        <td className="px-2 py-2.5">
                          <span className={["text-[10.5px] px-1.5 py-0.5 rounded-md font-semibold",
                            c.is_published ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"].join(" ")}>
                            {c.is_published ? "Published" : "Draft"}
                          </span>
                        </td>
                        <td className="px-2 py-2.5">
                          {canManage && (
                            <select
                              value={c.owner_user_id ?? ""}
                              onChange={(e) => assignCardMu.mutate({ cardIds: [c.id], ownerUserId: e.target.value })}
                              className="h-7 rounded-md border border-border bg-card px-1.5 text-[11.5px]"
                            >
                              {members.map((m) => (
                                <option key={m.userId} value={m.userId}>{m.fullName ?? m.email}</option>
                              ))}
                            </select>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {(cardsQ.data?.cards.length ?? 0) === 0 && (
                    <tr><td colSpan={4} className="px-2 py-10 text-center text-muted-foreground">Chưa có danh thiếp nào.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

        {tab === 4 && (
          <SectionCard title="Hoạt động gần đây">
            <div className="space-y-3">
              {(actQ.data?.activities ?? []).map((a) => (
                <div key={a.kind + a.id} className="flex items-start gap-2.5 py-1.5 border-b border-border/50 last:border-0">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-indigo-500 grid place-items-center text-white text-[11px] font-semibold shrink-0">
                    {(a.ownerName ?? "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px]">
                      <span className="font-semibold">{a.ownerName ?? "Chưa gán"}</span>{" "}
                      <span className="text-muted-foreground">
                        {a.kind === "lead" ? "cập nhật lead" : "cập nhật deal"} ({a.status})
                      </span>
                    </div>
                    <div className="text-[11.5px] text-muted-foreground truncate">{a.title}</div>
                    <div className="text-[10.5px] text-muted-foreground mt-0.5">{new Date(a.occurredAt).toLocaleString("vi-VN")}</div>
                  </div>
                  {a.value ? <span className="text-[10.5px] px-1.5 py-0.5 rounded-md font-semibold bg-emerald-50 text-emerald-700 whitespace-nowrap">{fmtMoney(a.value)}</span> : null}
                </div>
              ))}
              {(actQ.data?.activities.length ?? 0) === 0 && (
                <div className="py-10 text-center text-[12.5px] text-muted-foreground">Chưa có hoạt động.</div>
              )}
            </div>
          </SectionCard>
        )}
      </div>

      <aside className="space-y-4">
        <SectionCard title="Bảng xếp hạng" action={<span className="text-[11px] text-muted-foreground">Theo doanh thu</span>}>
          <div className="space-y-2">
            {(lbQ.data?.rows ?? []).map((r, i) => (
              <div key={r.userId} className="flex items-center gap-3 py-1.5">
                <div className="w-5 text-center text-[12px] font-bold text-muted-foreground">{i + 1}</div>
                {i === 0 ? <Crown className="h-5 w-5 text-amber-500" /> :
                  i === 1 ? <Trophy className="h-5 w-5 text-slate-400" /> :
                  i === 2 ? <Trophy className="h-5 w-5 text-amber-700" /> :
                  <div className="h-5 w-5" />}
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] truncate font-medium">{r.fullName ?? r.email ?? "—"}</div>
                  <div className="text-[10.5px] text-muted-foreground">{r.dealsWon} deals · {r.leads} leads</div>
                </div>
                <div className="text-[12px] font-semibold text-primary">{fmtMoney(r.revenue)}</div>
              </div>
            ))}
            {(lbQ.data?.rows.length ?? 0) === 0 && (
              <div className="py-6 text-center text-[12px] text-muted-foreground">Chưa có dữ liệu xếp hạng.</div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Hoạt động">
          <div className="space-y-3">
            {(actQ.data?.activities ?? []).slice(0, 5).map((a) => (
              <div key={"r" + a.kind + a.id} className="flex items-start gap-2">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-indigo-500 grid place-items-center text-white text-[10px] font-semibold shrink-0">
                  {(a.ownerName ?? "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px]"><span className="font-semibold">{a.ownerName ?? "—"}</span> <span className="text-muted-foreground">{a.kind === "lead" ? "lead" : "deal"} · {a.status}</span></div>
                  <div className="text-[11px] text-muted-foreground truncate">{a.title}</div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setTab(4)} className="mt-3 w-full text-[12px] font-semibold text-primary inline-flex items-center justify-center gap-1">
            Xem tất cả <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </SectionCard>

        <SectionCard title="Pipeline đội">
          <div className="flex items-end justify-between mb-1">
            <div>
              <div className="text-[20px] font-bold">{fmtMoney(totals?.pipeline ?? 0)}</div>
              <div className="text-[11px] text-muted-foreground">Giá trị đang mở</div>
            </div>
            <div className="text-right">
              <div className="text-[14px] font-bold">{totals?.dealsOpen ?? 0}</div>
              <div className="text-[11px] text-muted-foreground">Deals mở</div>
            </div>
          </div>
          <div className="text-[11.5px] text-muted-foreground mt-2 inline-flex items-center gap-1">
            <Activity className="h-3 w-3" /> Tổng leads {totals?.leads ?? 0} · NFC/QR {totals?.nfcQr ?? 0}
          </div>
        </SectionCard>
      </aside>

      <InviteDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSubmit={(email, role) => { inviteMu.mutate({ email, role }); setInviteOpen(false); }}
        pending={inviteMu.isPending}
      />
    </div>
  );
}

function InviteDialog({
  open, onClose, onSubmit, pending,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (email: string, role: Role) => void;
  pending: boolean;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("agent");

  function submit() {
    const v = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      toast.error("Email không hợp lệ"); return;
    }
    onSubmit(v, role);
    setEmail("");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" /> Mời thành viên
          </DialogTitle>
          <DialogDescription>
            Gửi lời mời tham gia workspace. Link sẽ được sao chép vào clipboard.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <div>
            <label className="text-[12px] font-medium text-muted-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@congty.com"
              className="mt-1 w-full h-10 rounded-lg border border-border bg-card px-3 text-[13px] outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-muted-foreground">Vai trò</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="mt-1 w-full h-10 rounded-lg border border-border bg-card px-3 text-[13px]"
            >
              {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>)}
            </select>
          </div>
        </div>
        <DialogFooter>
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-card text-[12.5px] font-semibold">Huỷ</button>
          <button onClick={submit} disabled={pending} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-semibold disabled:opacity-60">
            {pending ? "Đang gửi..." : "Gửi lời mời"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
