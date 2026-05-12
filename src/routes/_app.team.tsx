import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard, KpiCard } from "@/components/app/ui";
import { Crown, Plus, Trophy, Medal, Users2, Target, DollarSign, MoreHorizontal } from "lucide-react";

export const Route = createFileRoute("/_app/team")({ component: TeamPage });

const ranking = [
  { n: "Nguyễn Văn A", role: "Sales Manager", l: 312, deals: 38, rev: "8.6 tỷ", trend: 24, badge: Crown, tone: "text-amber-500" },
  { n: "Lê Minh Hằng", role: "Senior Sales", l: 286, deals: 32, rev: "7.2 tỷ", trend: 18, badge: Trophy, tone: "text-slate-400" },
  { n: "Trần Thanh Long", role: "Senior Sales", l: 254, deals: 28, rev: "6.4 tỷ", trend: 12, badge: Medal, tone: "text-amber-700" },
  { n: "Phạm Quốc Anh", role: "Sales", l: 218, deals: 24, rev: "5.8 tỷ", trend: 8 },
  { n: "Vũ Hải Yến", role: "Sales", l: 198, deals: 22, rev: "5.2 tỷ", trend: 6 },
  { n: "Đỗ Quốc Bảo", role: "Sales", l: 184, deals: 18, rev: "4.6 tỷ", trend: -3 },
];

function TeamPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Team Management" sub="Theo dõi hiệu suất, phân quyền và quản lý đội ngũ bán hàng."
        action={<button className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold inline-flex items-center gap-1.5"><Plus className="h-4 w-4" /> Mời thành viên</button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Users2} label="Thành viên" value="24" delta={9.2} tone="primary" />
        <KpiCard icon={Target} label="KPI hoàn thành" value="86%" delta={12.4} tone="green" />
        <KpiCard icon={DollarSign} label="Doanh thu team" value="62.7 tỷ" delta={22.1} tone="amber" />
        <KpiCard icon={Trophy} label="Top performer" value="Nguyễn Văn A" delta={24.5} tone="indigo" />
      </div>

      <SectionCard title="Bảng xếp hạng tháng này">
        <div className="space-y-2">
          {ranking.map((r, i) => (
            <div key={r.n} className={["flex items-center gap-4 rounded-xl px-4 py-3 transition",
              i < 3 ? "bg-gradient-to-r from-primary-soft/60 to-transparent" : "hover:bg-muted/40"].join(" ")}>
              <div className="text-[18px] font-bold w-6 text-center text-muted-foreground">{i + 1}</div>
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-indigo-500 grid place-items-center text-white text-[12.5px] font-semibold">{r.n.split(" ").pop()![0]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <div className="text-[13.5px] font-semibold">{r.n}</div>
                  {r.badge && <r.badge className={["h-3.5 w-3.5", r.tone].join(" ")} />}
                </div>
                <div className="text-[11px] text-muted-foreground">{r.role}</div>
              </div>
              <div className="hidden md:grid grid-cols-3 gap-6 text-[12px] text-right">
                <div><div className="text-muted-foreground text-[10.5px]">Leads</div><div className="font-bold">{r.l}</div></div>
                <div><div className="text-muted-foreground text-[10.5px]">Deals</div><div className="font-bold">{r.deals}</div></div>
                <div><div className="text-muted-foreground text-[10.5px]">Doanh thu</div><div className="font-bold text-primary">{r.rev}</div></div>
              </div>
              <span className={["text-[11.5px] font-bold w-12 text-right", r.trend >= 0 ? "text-emerald-600" : "text-rose-600"].join(" ")}>{r.trend >= 0 ? "+" : ""}{r.trend}%</span>
              <button className="text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { role: "Admin", count: 2, perms: ["Toàn quyền hệ thống", "Quản lý billing", "Quản lý team"], tone: "from-rose-500/10" },
          { role: "Manager", count: 4, perms: ["Quản lý sales team", "Báo cáo tổng", "Phê duyệt deal"], tone: "from-blue-500/10" },
          { role: "Sales", count: 18, perms: ["Quản lý lead cá nhân", "Pipeline cá nhân", "Chia sẻ danh thiếp"], tone: "from-primary/10" },
        ].map((r) => (
          <SectionCard key={r.role}>
            <div className={["rounded-xl bg-gradient-to-br to-transparent p-4 -m-1", r.tone].join(" ")}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[15px] font-bold">{r.role}</div>
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
  );
}
