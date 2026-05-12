import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { Sparkles, Star, TrendingUp, AlertCircle, Filter } from "lucide-react";

export const Route = createFileRoute("/_app/ai-lead-score")({ component: AILeadScore });

const distribution = [
  { label: "Hot (80-100)", count: 124, color: "bg-emerald-500", w: "32%" },
  { label: "Warm (60-79)", count: 286, color: "bg-amber-500", w: "48%" },
  { label: "Cold (40-59)", count: 142, color: "bg-blue-500", w: "16%" },
  { label: "Inactive (<40)", count: 48, color: "bg-slate-400", w: "4%" },
];

const top = [
  { n: "Trần Minh Đức", p: "Vinhomes Ocean Park 2", s: 96, signals: ["Xem 5+ lần", "Tải brochure", "Quét NFC 2 lần"] },
  { n: "Lê Thu Hương", p: "Masteri Waterfront", s: 92, signals: ["Liên hệ qua Zalo", "Đặt lịch xem"] },
  { n: "Phạm Tuấn Anh", p: "Lumi Hanoi", s: 88, signals: ["Mở email 3 lần", "Click ưu đãi"] },
  { n: "Vũ Thị Lan", p: "The Global City", s: 84, signals: ["Để lại số điện thoại"] },
];

function AILeadScore() {
  return (
    <div className="space-y-6">
      <PageHeader title="AI Lead Score" sub="Chấm điểm lead theo hành vi, nhân khẩu học và tín hiệu mua hàng."
        action={<button className="h-9 px-3 rounded-xl border border-border bg-card text-[12.5px] font-medium hover:bg-muted inline-flex items-center gap-1.5"><Filter className="h-4 w-4" /> Bộ lọc</button>} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard title="Phân bố Lead Score" className="lg:col-span-2">
          <ul className="space-y-3.5">
            {distribution.map((d) => (
              <li key={d.label}>
                <div className="flex items-center justify-between text-[12.5px] mb-1.5">
                  <span className="font-medium">{d.label}</span>
                  <span className="font-semibold">{d.count} leads · {d.w}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className={["h-full rounded-full", d.color].join(" ")} style={{ width: d.w }} />
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-5 rounded-xl bg-gradient-to-br from-primary-soft to-indigo-50 p-4 flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <div className="text-[13px] font-semibold">Mô hình AI hoạt động ổn định</div>
              <p className="text-[12px] text-muted-foreground mt-0.5">Độ chính xác dự đoán 94.6% — đã học từ 12,456 tín hiệu trong 30 ngày qua.</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Cảnh báo">
          <ul className="space-y-3 text-[12.5px]">
            {[
              { i: AlertCircle, t: "8 lead Hot chưa được gọi trong 24h", tone: "text-rose-600 bg-rose-50" },
              { i: TrendingUp, t: "Score trung bình tăng +6 điểm tuần này", tone: "text-emerald-600 bg-emerald-50" },
              { i: Star, t: "12 lead vừa đạt ngưỡng VIP (>90)", tone: "text-amber-600 bg-amber-50" },
            ].map((a, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <div className={["h-8 w-8 rounded-lg grid place-items-center shrink-0", a.tone].join(" ")}><a.i className="h-4 w-4" /></div>
                <span>{a.t}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard title="Top lead có điểm cao nhất">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {top.map((l) => (
            <div key={l.n} className="rounded-xl border border-border p-4 hover:border-primary/40 transition">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-[13.5px] font-semibold">{l.n}</div>
                  <div className="text-[11.5px] text-muted-foreground">{l.p}</div>
                </div>
                <div className="text-center">
                  <div className="text-[22px] font-bold text-emerald-600 leading-none">{l.s}</div>
                  <div className="text-[10px] text-muted-foreground">/ 100</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {l.signals.map((s) => (
                  <span key={s} className="text-[10.5px] px-2 py-0.5 rounded-md bg-primary-soft text-primary font-semibold">{s}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
