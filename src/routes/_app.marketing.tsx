import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard, KpiCard } from "@/components/app/ui";
import { Megaphone, Mail, MessageCircle, Send, Plus, TrendingUp, Eye, MousePointerClick } from "lucide-react";

export const Route = createFileRoute("/_app/marketing")({ component: MarketingPage });

function MarketingPage() {
  const campaigns = [
    { n: "Email open house Vinhomes OP2", ch: Mail, sent: 4562, open: "62%", click: "18%", st: "Đang chạy" },
    { n: "Zalo broadcast — Masteri", ch: MessageCircle, sent: 2860, open: "84%", click: "26%", st: "Đang chạy" },
    { n: "SMS Promo Tết 2025", ch: Send, sent: 1240, open: "92%", click: "12%", st: "Lên lịch" },
  ];
  return (
    <div className="space-y-6">
      <PageHeader title="Marketing & Campaign" sub="Triển khai chiến dịch đa kênh — Email, Zalo, SMS, Push."
        action={<button className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold inline-flex items-center gap-1.5"><Plus className="h-4 w-4" /> Tạo chiến dịch</button>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Megaphone} label="Chiến dịch active" value="12" delta={20} tone="primary" />
        <KpiCard icon={Eye} label="Lượt mở" value="42,140" delta={18.6} tone="indigo" />
        <KpiCard icon={MousePointerClick} label="CTR trung bình" value="14.8%" delta={6.4} tone="green" />
        <KpiCard icon={TrendingUp} label="ROI" value="3.2x" delta={12.4} tone="amber" />
      </div>
      <SectionCard title="Chiến dịch gần đây">
        <table className="w-full text-[12.5px]">
          <thead><tr className="text-left text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border">
            <th className="py-2.5 font-semibold">Tên</th><th className="py-2.5 font-semibold">Kênh</th>
            <th className="py-2.5 font-semibold">Đã gửi</th><th className="py-2.5 font-semibold">Open</th>
            <th className="py-2.5 font-semibold">Click</th><th className="py-2.5 font-semibold">Trạng thái</th>
          </tr></thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.n} className="border-b border-border last:border-0 hover:bg-muted/40">
                <td className="py-3 font-semibold">{c.n}</td>
                <td className="py-3"><c.ch className="h-4 w-4 text-primary" /></td>
                <td className="py-3">{c.sent.toLocaleString()}</td>
                <td className="py-3 font-semibold">{c.open}</td>
                <td className="py-3 font-semibold text-emerald-600">{c.click}</td>
                <td className="py-3"><span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold">{c.st}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}
