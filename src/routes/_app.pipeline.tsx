import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { Plus, Filter, MoreHorizontal, GripVertical, TrendingUp, DollarSign } from "lucide-react";

export const Route = createFileRoute("/_app/pipeline")({ component: PipelinePage });

const STAGES = [
  { key: "new", label: "Mới", color: "bg-slate-500", count: 28, value: "8.6 tỷ" },
  { key: "consult", label: "Đang tư vấn", color: "bg-blue-500", count: 36, value: "12.4 tỷ" },
  { key: "qualified", label: "Đủ điều kiện", color: "bg-cyan-500", count: 22, value: "11.2 tỷ" },
  { key: "negotiation", label: "Đàm phán", color: "bg-amber-500", count: 18, value: "9.5 tỷ" },
  { key: "deposit", label: "Chốt cọc", color: "bg-violet-500", count: 8, value: "4.8 tỷ" },
  { key: "won", label: "Thành công", color: "bg-emerald-500", count: 12, value: "16.2 tỷ" },
];

const SAMPLE_DEALS: Record<string, { name: string; value: string; project: string; owner: string }[]> = {
  new: [
    { name: "Trần Minh Đức", value: "2.8 tỷ", project: "Vinhomes Ocean Park 2", owner: "NA" },
    { name: "Lê Thu Hương", value: "3.6 tỷ", project: "Masteri Waterfront", owner: "MH" },
    { name: "Đỗ Quốc Bảo", value: "1.9 tỷ", project: "Eaton Park", owner: "TL" },
  ],
  consult: [
    { name: "Phạm Tuấn Anh", value: "4.2 tỷ", project: "Lumi Hanoi", owner: "NA" },
    { name: "Nguyễn Văn Tùng", value: "3.9 tỷ", project: "The Global City", owner: "MH" },
  ],
  qualified: [
    { name: "Vũ Thị Lan", value: "5.5 tỷ", project: "Vinhomes Ocean Park 2", owner: "NA" },
  ],
  negotiation: [
    { name: "Đỗ Quốc Bảo", value: "6.8 tỷ", project: "Eaton Park", owner: "TL" },
    { name: "Trần Hoài Nam", value: "4.5 tỷ", project: "Masteri Waterfront", owner: "MH" },
  ],
  deposit: [
    { name: "Đinh Quang Huy", value: "7.2 tỷ", project: "Lumi Hanoi", owner: "NA" },
    { name: "Lưu Thanh Tâm", value: "5.6 tỷ", project: "Eaton Park", owner: "TL" },
  ],
  won: [
    { name: "Hoàng Minh Long", value: "8.6 tỷ", project: "The Global City", owner: "MH" },
    { name: "Bùi Thị Ngọc", value: "6.3 tỷ", project: "Vinhomes Ocean Park 2", owner: "NA" },
  ],
};

function PipelinePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Sales Pipeline" sub="Kéo thả để cập nhật giai đoạn deal — đồng bộ realtime với team."
        action={<div className="flex gap-2">
          <button className="h-9 px-3 rounded-xl border border-border bg-card text-[12.5px] font-medium hover:bg-muted inline-flex items-center gap-1.5"><Filter className="h-4 w-4" /> Lọc team</button>
          <button className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold inline-flex items-center gap-1.5"><Plus className="h-4 w-4" /> Thêm deal</button>
        </div>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SectionCard><div className="text-[12px] text-muted-foreground">Tổng giá trị pipeline</div><div className="text-[24px] font-bold mt-1">62.7 tỷ</div><div className="text-[11.5px] text-emerald-600 font-semibold mt-1 inline-flex items-center gap-1"><TrendingUp className="h-3 w-3" /> +18.2%</div></SectionCard>
        <SectionCard><div className="text-[12px] text-muted-foreground">Doanh thu dự kiến</div><div className="text-[24px] font-bold mt-1">38.4 tỷ</div><div className="text-[11.5px] text-emerald-600 font-semibold mt-1 inline-flex items-center gap-1"><DollarSign className="h-3 w-3" /> Dự báo Q2</div></SectionCard>
        <SectionCard><div className="text-[12px] text-muted-foreground">Số deal mở</div><div className="text-[24px] font-bold mt-1">124</div><div className="text-[11.5px] text-muted-foreground mt-1">Trung bình 5.2 tỷ/deal</div></SectionCard>
        <SectionCard><div className="text-[12px] text-muted-foreground">Tỷ lệ thắng (60d)</div><div className="text-[24px] font-bold mt-1">38.4%</div><div className="text-[11.5px] text-emerald-600 font-semibold mt-1">+4.6%</div></SectionCard>
      </div>

      <div className="overflow-x-auto -mx-4 lg:-mx-8 px-4 lg:px-8 pb-4 scrollbar-thin">
        <div className="grid grid-flow-col auto-cols-[280px] gap-4">
          {STAGES.map((s) => (
            <div key={s.key} className="rounded-2xl bg-muted/50 border border-border flex flex-col">
              <div className="px-4 pt-3.5 pb-3 border-b border-border bg-card rounded-t-2xl">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={["h-2 w-2 rounded-full", s.color].join(" ")} />
                    <span className="text-[12.5px] font-semibold">{s.label}</span>
                    <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-bold">{s.count}</span>
                  </div>
                  <button className="text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></button>
                </div>
                <div className="text-[11px] text-muted-foreground">Tổng: <span className="font-semibold text-foreground">{s.value}</span></div>
              </div>
              <div className="p-2.5 space-y-2 flex-1 min-h-[200px]">
                {(SAMPLE_DEALS[s.key] ?? []).map((d, i) => (
                  <div key={i} className="rounded-xl bg-card border border-border p-3 hover:border-primary/40 hover:shadow-soft transition cursor-grab group">
                    <div className="flex items-start gap-2 mb-2">
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground mt-0.5 opacity-0 group-hover:opacity-100" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12.5px] font-semibold truncate">{d.name}</div>
                        <div className="text-[10.5px] text-muted-foreground truncate">{d.project}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[12.5px] font-bold text-primary">{d.value}</span>
                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary to-indigo-500 grid place-items-center text-white text-[9.5px] font-bold">{d.owner}</div>
                    </div>
                  </div>
                ))}
                <button className="w-full text-[11.5px] text-muted-foreground hover:text-primary py-2 rounded-lg border border-dashed border-border hover:border-primary inline-flex items-center justify-center gap-1">
                  <Plus className="h-3.5 w-3.5" /> Thêm deal
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
