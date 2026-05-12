import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { CalendarClock, Video, Phone, MapPin } from "lucide-react";

export const Route = createFileRoute("/_app/appointments")({ component: AppointmentsPage });

const appts = [
  { t: "10:00 - 10:30", title: "Tư vấn Vinhomes OP2", who: "Trần Minh Đức", tone: "border-l-primary", icon: Phone },
  { t: "11:30 - 12:30", title: "Xem nhà mẫu Masteri", who: "Lê Thu Hương", tone: "border-l-blue-500", icon: MapPin },
  { t: "14:00 - 14:45", title: "Họp đội nhóm tuần", who: "Team Sales A", tone: "border-l-emerald-500", icon: Video },
  { t: "16:00 - 16:30", title: "Demo Wallet Card", who: "Phạm Tuấn Anh", tone: "border-l-amber-500", icon: Video },
];

function AppointmentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Lịch hẹn" sub="Quản lý lịch gặp khách & follow-up." />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard title="Hôm nay · 15/05" className="lg:col-span-2">
          <ul className="space-y-3">
            {appts.map((a, i) => (
              <li key={i} className={["rounded-xl bg-card border border-border border-l-4 p-4 flex items-center gap-3 hover:shadow-soft transition", a.tone].join(" ")}>
                <div className="h-10 w-10 rounded-xl bg-muted grid place-items-center"><a.icon className="h-4 w-4 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold">{a.title}</div>
                  <div className="text-[11.5px] text-muted-foreground">{a.who}</div>
                </div>
                <div className="text-[12px] font-semibold text-muted-foreground">{a.t}</div>
              </li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title="Mini calendar">
          <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
            {["T2","T3","T4","T5","T6","T7","CN"].map((d) => <div key={d} className="font-semibold text-muted-foreground py-1">{d}</div>)}
            {Array.from({length: 35}).map((_, i) => {
              const d = i - 2;
              const today = d === 15;
              return <div key={i} className={["aspect-square rounded-lg grid place-items-center text-[11px]",
                today ? "bg-primary text-primary-foreground font-bold" : d > 0 && d < 32 ? "hover:bg-muted" : "text-muted-foreground/40"
              ].join(" ")}>{d > 0 && d < 32 ? d : ""}</div>;
            })}
          </div>
          <div className="mt-4 rounded-xl bg-primary-soft p-3 flex items-start gap-2">
            <CalendarClock className="h-4 w-4 text-primary mt-0.5" />
            <div>
              <div className="text-[12px] font-semibold">12 lịch hẹn tuần này</div>
              <div className="text-[11px] text-muted-foreground">+3 so với tuần trước</div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
