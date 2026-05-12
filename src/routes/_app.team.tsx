import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, SectionCard, KpiCard } from "@/components/app/ui";
import {
  Crown, Plus, Trophy, Users2, Target, DollarSign, MoreHorizontal,
  CheckCircle2, TrendingUp, Search, Filter, Calendar, Download, Star,
  Activity, ArrowRight, ShieldCheck, Mail, Pencil, Trash2, UserPlus, Send, X, Check,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/team")({ component: TeamPage });

const DEPARTMENTS = ["Kinh doanh 1", "Kinh doanh 2", "Marketing", "Chăm sóc KH", "Hỗ trợ"] as const;
const ROLES = [
  { v: "Admin", desc: "Toàn quyền hệ thống" },
  { v: "Manager", desc: "Quản lý phòng ban" },
  { v: "Sales Manager", desc: "Quản lý đội sales" },
  { v: "Senior Sales", desc: "Sale cấp cao" },
  { v: "Sales", desc: "Sale tiêu chuẩn" },
  { v: "Sales Executive", desc: "Sale executive" },
  { v: "Marketing Leader", desc: "Trưởng nhóm marketing" },
  { v: "Digital Marketing", desc: "Digital marketing" },
  { v: "CSKH Leader", desc: "Trưởng CSKH" },
] as const;

type Member = {
  id: string;
  n: string; email: string; phone: string;
  dept: string; role: string;
  l: number; d: number; rev: string; cv: string; kpi: string; star: number;
  status: "active" | "invited" | "inactive";
};

const kpis = [
  { icon: Users2, label: "Tổng thành viên", value: "48", delta: 9.1, tone: "primary" as const },
  { icon: CheckCircle2, label: "Đang hoạt động", value: "42", delta: 11.3, tone: "blue" as const },
  { icon: DollarSign, label: "Tổng doanh thu", value: "128.6 tỷ", delta: 18.7, tone: "green" as const },
  { icon: Crown, label: "Tổng deals", value: "356", delta: 14.6, tone: "amber" as const },
  { icon: TrendingUp, label: "Tỷ lệ chuyển đổi TB", value: "7.94%", delta: 1.2, tone: "indigo" as const },
];

const tabs = ["Tổng quan", "Thành viên", "Phòng ban", "Vai trò & Phân quyền", "Mục tiêu (KPI)", "Báo cáo"];

const series = [
  { d: "01/05", rev: 18, deals: 42, leads: 110 },
  { d: "06/05", rev: 22, deals: 50, leads: 130 },
  { d: "11/05", rev: 19, deals: 46, leads: 120 },
  { d: "16/05", rev: 22.4, deals: 68, leads: 156 },
  { d: "21/05", rev: 26, deals: 60, leads: 148 },
  { d: "26/05", rev: 24, deals: 58, leads: 140 },
  { d: "31/05", rev: 28, deals: 72, leads: 162 },
];

const depts = [
  { name: "Kinh doanh", value: 68.4, color: "hsl(244 75% 60%)" },
  { name: "Marketing", value: 24.7, color: "hsl(199 89% 55%)" },
  { name: "Chăm sóc KH", value: 19.6, color: "hsl(160 64% 45%)" },
  { name: "Hỗ trợ", value: 15.9, color: "hsl(346 77% 60%)" },
];

const members: Member[] = [
  { id: "m1", n: "Trần Minh Đức", email: "duc.tm@abc.vn", phone: "0901 234 567", dept: "Kinh doanh 1", role: "Senior Sales", l: 156, d: 24, rev: "12.6 tỷ", cv: "15.4%", kpi: "120%", star: 5, status: "active" },
  { id: "m2", n: "Lê Thu Hương", email: "huong.lt@abc.vn", phone: "0902 345 678", dept: "Kinh doanh 1", role: "Sales Manager", l: 142, d: 18, rev: "9.8 tỷ", cv: "12.7%", kpi: "110%", star: 5, status: "active" },
  { id: "m3", n: "Phạm Tuấn Anh", email: "anh.pt@abc.vn", phone: "0903 456 789", dept: "Kinh doanh 2", role: "Senior Sales", l: 134, d: 16, rev: "8.7 tỷ", cv: "11.9%", kpi: "105%", star: 4, status: "active" },
  { id: "m4", n: "Nguyễn Hải Yến", email: "yen.nh@abc.vn", phone: "0904 567 890", dept: "Marketing", role: "Marketing Leader", l: 98, d: 12, rev: "6.4 tỷ", cv: "12.2%", kpi: "115%", star: 5, status: "active" },
  { id: "m5", n: "Đỗ Quốc Bảo", email: "bao.dq@abc.vn", phone: "0905 678 901", dept: "Kinh doanh 2", role: "Senior Sales", l: 108, d: 14, rev: "6.1 tỷ", cv: "13.0%", kpi: "102%", star: 4, status: "active" },
  { id: "m6", n: "Bùi Thị Ngọc", email: "ngoc.bt@abc.vn", phone: "0906 789 012", dept: "Chăm sóc KH", role: "CSKH Leader", l: 87, d: 10, rev: "4.3 tỷ", cv: "11.5%", kpi: "98%", star: 4, status: "active" },
  { id: "m7", n: "Hoàng Minh Long", email: "long.hm@abc.vn", phone: "0907 890 123", dept: "Marketing", role: "Digital Marketing", l: 76, d: 9, rev: "3.2 tỷ", cv: "11.8%", kpi: "95%", star: 3, status: "active" },
  { id: "m8", n: "Lưu Thanh Tâm", email: "tam.lt@abc.vn", phone: "0908 901 234", dept: "Kinh doanh 1", role: "Sales Executive", l: 69, d: 8, rev: "3.0 tỷ", cv: "11.6%", kpi: "92%", star: 3, status: "invited" },
];

const ranking = [
  { i: 1, n: "Phòng Kinh doanh 1", v: "68.4 tỷ", t: 21.5, badge: Crown, tone: "text-amber-500" },
  { i: 2, n: "Phòng Kinh doanh 2", v: "38.7 tỷ", t: 18.6, badge: Trophy, tone: "text-slate-400" },
  { i: 3, n: "Phòng Marketing", v: "12.9 tỷ", t: 15.3, badge: Trophy, tone: "text-amber-700" },
  { i: 4, n: "Phòng Chăm sóc KH", v: "5.6 tỷ", t: 11.2 },
  { i: 5, n: "Phòng Hỗ trợ", v: "2.9 tỷ", t: 8.7 },
];

const activities = [
  { n: "Trần Minh Đức", act: "vừa chốt deal", sub: "Vinhomes Ocean Park 2", time: "10 phút trước", tag: "+2.3 tỷ", tone: "bg-emerald-50 text-emerald-700" },
  { n: "Lê Thu Hương", act: "thêm mới lead", sub: "Masteri Waterfront", time: "30 phút trước" },
  { n: "Phạm Tuấn Anh", act: "cập nhật dự án", sub: "Lumi Hanoi", time: "1 giờ trước" },
  { n: "Nguyễn Hải Yến", act: "đạt KPI tháng 5", sub: "120% mục tiêu", time: "2 giờ trước" },
  { n: "Đỗ Quốc Bảo", act: "gửi email cho khách hàng", sub: "", time: "3 giờ trước" },
];

type DialogMode = { kind: "closed" } | { kind: "invite" } | { kind: "create" } | { kind: "edit"; member: Member };

function TeamPage() {
  const [tab, setTab] = useState(0);
  const [list, setList] = useState<Member[]>(members);
  const [dialog, setDialog] = useState<DialogMode>({ kind: "closed" });
  const [query, setQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((m) =>
      (deptFilter === "all" || m.dept === deptFilter) &&
      (!q || m.n.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.role.toLowerCase().includes(q))
    );
  }, [list, query, deptFilter]);

  function upsertMember(m: Member) {
    setList((cur) => {
      const idx = cur.findIndex((x) => x.id === m.id);
      if (idx === -1) return [m, ...cur];
      const next = [...cur]; next[idx] = m; return next;
    });
  }
  function removeMember(id: string) {
    setList((cur) => cur.filter((m) => m.id !== id));
    toast.success("Đã xoá thành viên");
  }
  function resendInvite(m: Member) {
    toast.success(`Đã gửi lại lời mời tới ${m.email}`);
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
      <div className="space-y-6 min-w-0">
        <PageHeader
          title="Team Management"
          sub="Quản lý đội nhóm và hiệu suất kinh doanh"
          action={
            <div className="flex items-center gap-2">
              <button className="h-9 px-3 rounded-xl border border-border bg-card text-[12.5px] font-semibold inline-flex items-center gap-1.5 hover:bg-muted/50">
                <Download className="h-4 w-4" /> Xuất báo cáo
              </button>
              <button onClick={() => setDialog({ kind: "invite" })} className="h-9 px-3 rounded-xl border border-border bg-card text-[12.5px] font-semibold inline-flex items-center gap-1.5 hover:bg-muted/50">
                <Mail className="h-4 w-4" /> Mời qua email
              </button>
              <button onClick={() => setDialog({ kind: "create" })} className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold inline-flex items-center gap-1.5">
                <Plus className="h-4 w-4" /> Thêm thành viên
              </button>
            </div>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {kpis.map((k) => <KpiCard key={k.label} {...k} deltaLabel="so với tháng trước" />)}
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin">
            {tabs.map((t, i) => (
              <button
                key={t}
                onClick={() => setTab(i)}
                className={[
                  "px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 -mb-px transition",
                  tab === i ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <button className="h-9 px-3 rounded-xl border border-border bg-card text-[12.5px] inline-flex items-center gap-2">
            Tất cả phòng ban <span className="text-muted-foreground">▾</span>
          </button>
          <button className="h-9 px-3 rounded-xl border border-border bg-card text-[12.5px] inline-flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5" /> 01/05/2024 – 31/05/2024
          </button>
          <button className="h-9 px-3 rounded-xl border border-border bg-card text-[12.5px] inline-flex items-center gap-2">
            <Filter className="h-3.5 w-3.5" /> Bộ lọc
          </button>
          <div className="ml-auto relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Tìm thành viên, phòng ban..." className="h-9 w-72 pl-9 pr-3 rounded-xl border border-border bg-card text-[12.5px] outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
          <SectionCard title="Hiệu suất đội nhóm"
            action={<button className="h-7 px-2.5 rounded-lg border border-border text-[11.5px] inline-flex items-center gap-1">Theo ngày ▾</button>}>
            <div className="flex items-center gap-4 mb-2 text-[11.5px]">
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" />Doanh thu</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" />Deals</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Leads</span>
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="d" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Line type="monotone" dataKey="rev" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="deals" stroke="hsl(199 89% 55%)" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="leads" stroke="hsl(160 64% 45%)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="Phân bổ theo phòng ban">
            <div className="flex items-center gap-3">
              <div className="h-[220px] w-[200px] relative shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={depts} dataKey="value" innerRadius={62} outerRadius={88} paddingAngle={2}>
                      {depts.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 grid place-items-center pointer-events-none">
                  <div className="text-center">
                    <div className="text-[18px] font-bold leading-tight">128.6</div>
                    <div className="text-[10.5px] text-muted-foreground">tỷ doanh thu</div>
                  </div>
                </div>
              </div>
              <ul className="flex-1 space-y-2 text-[12px]">
                {depts.map((d) => (
                  <li key={d.name} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                    <span className="flex-1 truncate">{d.name}</span>
                    <span className="font-semibold">{d.value} tỷ</span>
                  </li>
                ))}
              </ul>
            </div>
          </SectionCard>
        </div>

        {/* Members table */}
        <SectionCard title="Hiệu suất thành viên">
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  {["Thành viên", "Phòng ban", "Vị trí", "Leads", "Deals", "Doanh thu", "Tỷ lệ chuyển đổi", "KPI", "Hiệu suất"].map((h) => (
                    <th key={h} className="font-medium px-2 py-2.5 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.n} className="border-b border-border/60 hover:bg-muted/30">
                    <td className="px-2 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-indigo-500 grid place-items-center text-white text-[11px] font-semibold">{m.n.split(" ").pop()![0]}</div>
                        <span className="font-semibold">{m.n}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2.5">{m.dept}</td>
                    <td className="px-2 py-2.5 text-muted-foreground">{m.role}</td>
                    <td className="px-2 py-2.5 font-semibold">{m.l}</td>
                    <td className="px-2 py-2.5 font-semibold">{m.d}</td>
                    <td className="px-2 py-2.5 font-semibold text-primary">{m.rev}</td>
                    <td className="px-2 py-2.5">{m.cv}</td>
                    <td className="px-2 py-2.5">
                      <span className={["text-[11px] font-bold px-2 py-0.5 rounded-md", parseInt(m.kpi) >= 100 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"].join(" ")}>{m.kpi}</span>
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={["h-3.5 w-3.5", i < m.star ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"].join(" ")} />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between pt-3 text-[12px] text-muted-foreground">
            <span>Hiển thị 1 – 8 của 48 thành viên</span>
            <div className="flex items-center gap-1">
              <button className="h-7 px-2 rounded-md border border-border">10 / trang ▾</button>
              {[1, 2, 3, 4, 5].map((p) => (
                <button key={p} className={["h-7 w-7 rounded-md text-[12px]", p === 1 ? "bg-primary text-primary-foreground font-semibold" : "border border-border"].join(" ")}>{p}</button>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* Roles */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[
            { role: "Admin", count: 2, perms: ["Toàn quyền hệ thống", "Quản lý billing", "Quản lý team"], tone: "from-rose-500/10", icon: ShieldCheck },
            { role: "Manager", count: 4, perms: ["Quản lý sales team", "Báo cáo tổng", "Phê duyệt deal"], tone: "from-blue-500/10", icon: Target },
            { role: "Sales", count: 18, perms: ["Quản lý lead cá nhân", "Pipeline cá nhân", "Chia sẻ danh thiếp"], tone: "from-primary/10", icon: Users2 },
          ].map((r) => (
            <SectionCard key={r.role}>
              <div className={["rounded-xl bg-gradient-to-br to-transparent p-4 -m-1", r.tone].join(" ")}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <r.icon className="h-4 w-4 text-foreground/70" />
                    <div className="text-[15px] font-bold">{r.role}</div>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-card border border-border font-semibold">{r.count} người</span>
                </div>
                <ul className="space-y-1.5 text-[12px] text-muted-foreground">
                  {r.perms.map((p) => <li key={p}>• {p}</li>)}
                </ul>
              </div>
            </SectionCard>
          ))}
        </div>
      </div>

      {/* Right rail */}
      <aside className="space-y-4">
        <SectionCard title="Bảng xếp hạng đội nhóm"
          action={<button className="h-7 px-2 rounded-lg border border-border text-[11.5px]">Tháng này ▾</button>}>
          <div className="space-y-2">
            {ranking.map((r) => (
              <div key={r.n} className="flex items-center gap-3 py-1.5">
                <div className="w-5 text-center text-[12px] font-bold text-muted-foreground">{r.i}</div>
                {r.badge ? (
                  <r.badge className={["h-5 w-5", r.tone].join(" ")} />
                ) : (
                  <div className="h-5 w-5" />
                )}
                <div className="flex-1 min-w-0 text-[12.5px] truncate">{r.n}</div>
                <div className="text-[12px] font-semibold">{r.v}</div>
                <div className="text-[11px] font-bold text-emerald-600 w-10 text-right">↑{r.t}%</div>
              </div>
            ))}
          </div>
          <button className="mt-3 w-full text-[12px] font-semibold text-primary inline-flex items-center justify-center gap-1">
            Xem bảng xếp hạng chi tiết <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </SectionCard>

        <SectionCard title="Hoạt động gần đây">
          <div className="space-y-3">
            {activities.map((a, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-indigo-500 grid place-items-center text-white text-[11px] font-semibold shrink-0">{a.n.split(" ").pop()![0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px]"><span className="font-semibold">{a.n}</span> <span className="text-muted-foreground">{a.act}</span></div>
                  {a.sub && <div className="text-[11.5px] text-muted-foreground truncate">{a.sub}</div>}
                  <div className="text-[10.5px] text-muted-foreground mt-0.5">{a.time}</div>
                </div>
                {a.tag && <span className={["text-[10.5px] px-1.5 py-0.5 rounded-md font-semibold whitespace-nowrap", a.tone].join(" ")}>{a.tag}</span>}
              </div>
            ))}
          </div>
          <button className="mt-3 w-full text-[12px] font-semibold text-primary inline-flex items-center justify-center gap-1">
            Xem tất cả hoạt động <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </SectionCard>

        <SectionCard title="Mục tiêu tháng 5"
          action={<span className="text-[11px] text-muted-foreground">Còn 10 ngày</span>}>
          <div className="flex items-end justify-between mb-1">
            <div>
              <div className="text-[20px] font-bold">128.6 tỷ</div>
              <div className="text-[11px] text-muted-foreground">Doanh thu thực tế</div>
            </div>
            <div className="text-right">
              <div className="text-[14px] font-bold">150 tỷ</div>
              <div className="text-[11px] text-muted-foreground">Mục tiêu</div>
            </div>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden mt-2">
            <div className="h-full bg-gradient-to-r from-primary to-indigo-500" style={{ width: "85.7%" }} />
          </div>
          <div className="text-[11.5px] text-muted-foreground mt-2 inline-flex items-center gap-1">
            <Activity className="h-3 w-3" /> Đạt 85.7% mục tiêu
          </div>
        </SectionCard>

        <button className="w-full h-10 rounded-xl border border-border text-[12.5px] font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-muted/50">
          <MoreHorizontal className="h-4 w-4" /> Tuỳ chọn khác
        </button>
      </aside>
    </div>
  );
}
