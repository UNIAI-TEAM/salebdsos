import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard, KpiCard } from "@/components/app/ui";
import { Filter, Plus, Search, Star, MoreHorizontal, Phone, Mail, MessageCircle, Users2, Target, Sparkles, Tags, X, Building2 } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_app/leads")({ component: LeadsPage });

const ALL_LEADS = [
  { id: 1, name: "Trần Minh Đức", source: "NFC", project: "Vinhomes Ocean Park 2", value: "2.8 tỷ", score: 86, stage: "Đang tư vấn", time: "10p", tags: ["VIP", "Mua ở"] },
  { id: 2, name: "Lê Thu Hương", source: "QR", project: "Masteri Waterfront", value: "3.6 tỷ", score: 78, stage: "Mới", time: "15p", tags: ["Đầu tư"] },
  { id: 3, name: "Phạm Tuấn Anh", source: "Link", project: "Lumi Hanoi", value: "4.2 tỷ", score: 72, stage: "Đàm phán", time: "32p", tags: ["VIP"] },
  { id: 4, name: "Nguyễn Hải Yến", source: "NFC", project: "The Global City", value: "5.1 tỷ", score: 65, stage: "Mới", time: "1h", tags: ["Mua ở"] },
  { id: 5, name: "Đỗ Quốc Bảo", source: "QR", project: "Eaton Park", value: "6.8 tỷ", score: 60, stage: "Chốt cọc", time: "2h", tags: ["VIP", "Đầu tư"] },
  { id: 6, name: "Vũ Thị Lan", source: "NFC", project: "Vinhomes Ocean Park 2", value: "3.2 tỷ", score: 92, stage: "Thành công", time: "1d", tags: ["VIP"] },
  { id: 7, name: "Hoàng Minh Long", source: "Link", project: "Masteri Waterfront", value: "8.6 tỷ", score: 88, stage: "Đàm phán", time: "1d", tags: ["VIP", "Đầu tư"] },
  { id: 8, name: "Bùi Thị Ngọc", source: "QR", project: "The Global City", value: "6.3 tỷ", score: 70, stage: "Chốt cọc", time: "2d", tags: ["Mua ở"] },
];

function LeadsPage() {
  const [open, setOpen] = useState<number | null>(1);
  const lead = ALL_LEADS.find((l) => l.id === open);

  return (
    <div className="space-y-6">
      <PageHeader title="Leads (CRM)" sub="Quản lý, phân loại và chăm sóc khách hàng tiềm năng."
        action={<div className="flex gap-2">
          <button className="h-9 px-3 rounded-xl border border-border bg-card text-[12.5px] font-medium hover:bg-muted inline-flex items-center gap-1.5"><Filter className="h-4 w-4" /> Bộ lọc</button>
          <button className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold inline-flex items-center gap-1.5"><Plus className="h-4 w-4" /> Thêm lead</button>
        </div>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Users2} label="Tổng leads" value="1,234" delta={18.2} tone="primary" />
        <KpiCard icon={Sparkles} label="Lead chất lượng cao" value="312" delta={24.6} tone="indigo" />
        <KpiCard icon={Target} label="Tỷ lệ phản hồi" value="68%" delta={6.4} tone="green" />
        <KpiCard icon={MessageCircle} label="Đang follow-up" value="184" delta={-3.2} tone="amber" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6">
        <SectionCard>
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input placeholder="Tìm theo tên, dự án, số điện thoại..." className="w-full h-10 rounded-xl bg-muted/60 pl-9 pr-3 text-[13px] outline-none border border-transparent focus:bg-card focus:border-border" />
            </div>
            <button className="text-[12px] px-2.5 py-1 rounded-lg bg-primary-soft text-primary font-semibold">Tất cả · 1,234</button>
            <button className="text-[12px] px-2.5 py-1 rounded-lg hover:bg-muted">VIP · 84</button>
            <button className="text-[12px] px-2.5 py-1 rounded-lg hover:bg-muted">Hot · 132</button>
          </div>
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="text-left text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="font-semibold py-2.5"><input type="checkbox" className="accent-primary" /></th>
                  <th className="font-semibold py-2.5">Khách hàng</th>
                  <th className="font-semibold py-2.5">Dự án</th>
                  <th className="font-semibold py-2.5">Giá trị</th>
                  <th className="font-semibold py-2.5">Nguồn</th>
                  <th className="font-semibold py-2.5">Trạng thái</th>
                  <th className="font-semibold py-2.5 text-right">AI Score</th>
                </tr>
              </thead>
              <tbody className="text-[12.5px]">
                {ALL_LEADS.map((l) => (
                  <tr key={l.id} onClick={() => setOpen(l.id)} className={["border-b border-border cursor-pointer transition", open === l.id ? "bg-primary-soft/40" : "hover:bg-muted/40"].join(" ")}>
                    <td className="py-3"><input type="checkbox" className="accent-primary" /></td>
                    <td className="py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/30 to-indigo-400/30 grid place-items-center text-[11px] font-semibold">{l.name.split(" ").pop()![0]}</div>
                        <div>
                          <div className="font-semibold">{l.name}</div>
                          <div className="text-[11px] text-muted-foreground">{l.time} trước</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-muted-foreground">{l.project}</td>
                    <td className="py-3 font-semibold">{l.value}</td>
                    <td className="py-3">
                      <span className={["text-[11px] px-2 py-0.5 rounded-md font-semibold",
                        l.source === "NFC" ? "bg-primary-soft text-primary" : l.source === "QR" ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
                      ].join(" ")}>{l.source}</span>
                    </td>
                    <td className="py-3">
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-muted font-medium">{l.stage}</span>
                    </td>
                    <td className="py-3 text-right">
                      <span className={["inline-flex items-center gap-1 font-bold", l.score >= 80 ? "text-emerald-600" : l.score >= 70 ? "text-amber-600" : "text-muted-foreground"].join(" ")}>
                        <Star className="h-3 w-3 fill-current" /> {l.score}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Slide-in detail */}
        {lead && (
          <aside className="rounded-2xl bg-card border border-border shadow-card overflow-hidden xl:sticky xl:top-20 xl:self-start">
            <div className="p-5 bg-gradient-to-br from-primary-soft to-indigo-50 relative">
              <button onClick={() => setOpen(null)} className="absolute right-3 top-3 p-1 rounded-lg hover:bg-white/60"><X className="h-4 w-4" /></button>
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-indigo-500 text-white grid place-items-center text-[16px] font-bold">{lead.name.split(" ").pop()![0]}</div>
                <div>
                  <div className="text-[16px] font-bold">{lead.name}</div>
                  <div className="text-[12px] text-muted-foreground">Quan tâm: {lead.project}</div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {lead.tags.map((t) => (
                  <span key={t} className="text-[10.5px] px-2 py-0.5 rounded-md bg-white border border-border font-semibold">{t}</span>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-1.5 mt-4">
                {[Phone, MessageCircle, Mail, MoreHorizontal].map((I, i) => (
                  <button key={i} className="aspect-square rounded-xl bg-white border border-border grid place-items-center hover:border-primary"><I className="h-4 w-4 text-primary" /></button>
                ))}
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-xl bg-gradient-to-br from-primary-soft to-transparent border border-primary/20 p-3">
                <div className="flex items-center gap-2 text-[11px] font-bold text-primary uppercase tracking-wider"><Sparkles className="h-3.5 w-3.5" /> AI gợi ý</div>
                <p className="text-[12.5px] mt-1.5">Lead đã xem dự án 3 lần trong 24h. Gợi ý gọi điện trong 1h tới và gửi báo giá Vinhomes Ocean Park 2 căn 3PN.</p>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Hoạt động</div>
                <ul className="space-y-3">
                  {[
                    { t: "Đã xem dự án Vinhomes Ocean Park 2", time: "10 phút trước" },
                    { t: "Đã quét QR danh thiếp", time: "15 phút trước" },
                    { t: "Đã tải brochure dự án", time: "30 phút trước" },
                    { t: "Lead được tạo từ NFC tap", time: "Hôm nay 09:24" },
                  ].map((a, i) => (
                    <li key={i} className="flex gap-2.5 text-[12px]">
                      <div className="relative">
                        <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                        {i < 3 && <div className="absolute left-1/2 top-3 -translate-x-1/2 h-6 w-px bg-border" />}
                      </div>
                      <div>
                        <div className="font-medium">{a.t}</div>
                        <div className="text-[10.5px] text-muted-foreground">{a.time}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Ghi chú</div>
                <textarea rows={3} placeholder="Thêm ghi chú nội bộ..." className="w-full rounded-xl border border-border bg-muted/40 p-3 text-[12.5px] outline-none focus:bg-card focus:border-primary" />
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
