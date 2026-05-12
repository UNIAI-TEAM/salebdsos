import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard, KpiCard } from "@/components/app/ui";
import { Sparkles, MessageCircle, Mail, Bot, CheckCircle2, Pause, Play, Plus, Phone } from "lucide-react";

export const Route = createFileRoute("/_app/ai-followup")({ component: AIFollowup });

function AIFollowup() {
  return (
    <div className="space-y-6">
      <PageHeader title="AI Follow-up" sub="AI tự động nuôi dưỡng lead qua đa kênh — Zalo, Email, SMS, gọi thử."
        action={<button className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold inline-flex items-center gap-1.5"><Plus className="h-4 w-4" /> Tạo workflow</button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Bot} label="Lead đang nurture" value="324" delta={18.6} tone="primary" />
        <KpiCard icon={CheckCircle2} label="Phản hồi tự động" value="86%" delta={12.4} tone="green" />
        <KpiCard icon={MessageCircle} label="Tin nhắn đã gửi" value="4,562" delta={32.1} tone="indigo" />
        <KpiCard icon={Sparkles} label="Lead chuyển hot" value="124" delta={22.8} tone="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Workflow đang chạy">
          <ul className="space-y-3">
            {[
              { name: "Welcome chuỗi 7 ngày", channels: ["Zalo", "Email"], leads: 142, status: "active" },
              { name: "Nurture VIP — Vinhomes Ocean Park 2", channels: ["Zalo", "SMS"], leads: 86, status: "active" },
              { name: "Re-engagement 30 ngày", channels: ["Email"], leads: 64, status: "active" },
              { name: "Promo Tết 2025", channels: ["Zalo", "Email", "SMS"], leads: 32, status: "paused" },
            ].map((w) => (
              <li key={w.name} className="rounded-xl border border-border p-3.5 flex items-center gap-3 hover:border-primary/40 transition">
                <div className="h-10 w-10 rounded-xl bg-brand-gradient grid place-items-center"><Bot className="h-5 w-5 text-white" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold">{w.name}</div>
                  <div className="text-[11px] text-muted-foreground">{w.leads} leads · {w.channels.join(" · ")}</div>
                </div>
                <button className={["h-8 w-8 rounded-lg grid place-items-center", w.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-muted text-muted-foreground"].join(" ")}>
                  {w.status === "active" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </button>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Cuộc hội thoại AI gần đây">
          <div className="space-y-4">
            {[
              { who: "Lê Thu Hương", channel: Mail, text: "Cảm ơn AI đã gửi báo giá, anh chị muốn xem nhà mẫu cuối tuần này.", tone: "from-emerald-500/10 to-transparent text-emerald-600" },
              { who: "Trần Minh Đức", channel: MessageCircle, text: "Em ơi cho a hỏi căn 2PN view biển còn không?", tone: "from-blue-500/10 to-transparent text-blue-600" },
              { who: "Phạm Tuấn Anh", channel: Phone, text: "AI đã đặt lịch hẹn 15:00 thứ 7 — đã đồng bộ Calendar.", tone: "from-amber-500/10 to-transparent text-amber-600" },
            ].map((c, i) => (
              <div key={i} className={["rounded-xl border border-border p-3.5 bg-gradient-to-br", c.tone].join(" ")}>
                <div className="flex items-center gap-2 mb-1.5">
                  <c.channel className="h-3.5 w-3.5" />
                  <div className="text-[12.5px] font-semibold text-foreground">{c.who}</div>
                  <span className="ml-auto text-[10.5px] px-1.5 py-0.5 rounded bg-card border border-border text-muted-foreground">AI</span>
                </div>
                <p className="text-[12.5px] text-muted-foreground">"{c.text}"</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
