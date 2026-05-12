import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/ui";
import {
  ArrowLeft, Sparkles, Phone, MessageCircle, Mail, BadgeCheck, Star,
  Send, Copy, RefreshCw, Wand2, Calendar, CheckSquare, Plus, Clock,
  ChevronRight, ChevronDown, Target, ThumbsUp, ThumbsDown, Edit3,
  CalendarClock, FileText, Bell, Users2, AlertCircle, Zap, X, Check,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_app/ai-followup/$customerId")({
  component: CustomerFollowupPage,
});

const CUSTOMER = {
  name: "Trần Minh Đức",
  tier: "VIP",
  status: "Khách hàng tiềm năng",
  project: "Vinhomes Ocean Park 2",
  phone: "0987 654 321",
  email: "duc.tran@gmail.com",
  score: 86,
  budget: "3 - 5 tỷ",
  need: "Mua để ở",
  timing: "Q3/2024",
  lastContact: "1 giờ trước",
};

type Channel = "Zalo" | "Email" | "SMS" | "Messenger";
const CHANNEL_TONE: Record<Channel, string> = {
  Zalo: "bg-cyan-50 text-cyan-700 ring-cyan-100",
  Email: "bg-violet-50 text-violet-700 ring-violet-100",
  SMS: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  Messenger: "bg-blue-50 text-blue-700 ring-blue-100",
};

const SCRIPTS: {
  channel: Channel; tone: string; title: string; preview: string; body: string;
  predictedOpen: number; predictedReply: number; recommended?: boolean;
}[] = [
  {
    channel: "Zalo", tone: "Thân thiện",
    title: "Mời tham quan nhà mẫu cuối tuần",
    preview: "Anh Đức ơi, em là Hằng bên ABC Real Estate. Cuối tuần này nhà mẫu Vinhomes Ocean Park 2 sẽ mở cửa…",
    body:
`Chào anh Đức,

Em là Hằng bên ABC Real Estate. Em thấy anh đang quan tâm tới căn 2PN view hồ tại Vinhomes Ocean Park 2. Cuối tuần này CĐT mở cửa nhà mẫu kèm chương trình ưu đãi đặt cọc giảm 2%.

Anh sắp xếp được khung 9h-11h sáng Chủ nhật để em đặt lịch dẫn anh tham quan và tư vấn trực tiếp không ạ?

Cảm ơn anh, mong sớm nhận phản hồi từ anh.`,
    predictedOpen: 78, predictedReply: 41, recommended: true,
  },
  {
    channel: "Email", tone: "Chuyên nghiệp",
    title: "Gửi bảng giá & chính sách thanh toán mới",
    preview: "Em xin gửi anh tài liệu cập nhật chính sách thanh toán T6/2024 cho dự án Vinhomes Ocean Park 2…",
    body:
`Kính gửi anh Trần Minh Đức,

Theo trao đổi tuần trước, em xin gửi anh bộ tài liệu cập nhật T6/2024:
1. Bảng giá căn 2PN tầng 12-25 (PDF đính kèm)
2. Chính sách ân hạn nợ gốc 24 tháng
3. Mô phỏng dòng tiền cho gói vay 60%

Em sẵn sàng book một buổi 30 phút online để cùng anh review chi tiết trước khi quyết định.

Trân trọng,`,
    predictedOpen: 64, predictedReply: 22,
  },
  {
    channel: "SMS", tone: "Ngắn gọn",
    title: "Nhắc lịch hẹn tư vấn",
    preview: "ABC Real Estate xin nhắc lịch hẹn tư vấn 15h ngày 03/06 tại VP Hà Nội. Phản hồi 1 để xác nhận.",
    body: `ABC Real Estate xin nhắc lịch hẹn tư vấn 15h ngày 03/06 tại VP Hà Nội. Phản hồi 1 để xác nhận, 2 để đổi lịch. Hotline 0987 654 321.`,
    predictedOpen: 92, predictedReply: 18,
  },
];

const SUGGESTED_TASKS: {
  icon: typeof CalendarClock; tone: string; title: string; desc: string;
  due: string; priority: "Cao" | "Trung bình" | "Thấp";
}[] = [
  { icon: CalendarClock, tone: "bg-primary-soft text-primary", title: "Gọi tư vấn căn 2PN view hồ", desc: "Khách đã xem brochure 3 lần, sẵn sàng tư vấn sâu", due: "Hôm nay, 16:00", priority: "Cao" },
  { icon: FileText, tone: "bg-amber-50 text-amber-700", title: "Gửi mô phỏng vay 60% trong 25 năm", desc: "Khách quan tâm phương án tài chính dài hạn", due: "Ngày mai", priority: "Trung bình" },
  { icon: Users2, tone: "bg-emerald-50 text-emerald-700", title: "Đặt lịch tham quan nhà mẫu", desc: "Slot Chủ nhật 9-11h còn 2 chỗ", due: "Cuối tuần", priority: "Cao" },
];

const TIMELINE = [
  { icon: Mail, tone: "bg-violet-50 text-violet-600", title: "Mở email chính sách bán hàng T5/2024", time: "Hôm nay, 09:15" },
  { icon: Phone, tone: "bg-emerald-50 text-emerald-600", title: "Cuộc gọi đến 4 phút 12 giây", time: "Hôm qua, 14:20" },
  { icon: MessageCircle, tone: "bg-cyan-50 text-cyan-600", title: "Phản hồi tin Zalo về tiến độ thanh toán", time: "27/05, 10:30" },
  { icon: FileText, tone: "bg-blue-50 text-blue-600", title: "Tải brochure dự án", time: "26/05, 19:42" },
];

const initials = (n: string) => n.split(" ").map((p) => p[0]).slice(-2).join("");

function CustomerFollowupPage() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [body, setBody] = useState(SCRIPTS[0].body);
  const [tone, setTone] = useState<"Thân thiện" | "Chuyên nghiệp" | "Khẩn cấp">("Thân thiện");
  const [createdTasks, setCreatedTasks] = useState<number[]>([]);
  const active = SCRIPTS[activeIdx];

  const pickScript = (i: number) => {
    setActiveIdx(i);
    setBody(SCRIPTS[i].body);
    setTone(SCRIPTS[i].tone as typeof tone);
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
        <Link to="/ai-followup" className="hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> AI Follow-up
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Khách hàng · {CUSTOMER.name}</span>
      </div>

      <PageHeader
        title={`AI Follow-up · ${CUSTOMER.name}`}
        sub="Kịch bản tin nhắn cá nhân hoá và đề xuất hành động cho nhân viên."
        action={
          <div className="flex items-center gap-2">
            <button className="h-9 px-3 rounded-xl border border-border bg-card text-[12.5px] font-semibold inline-flex items-center gap-1.5 hover:bg-muted/40">
              <Bell className="h-4 w-4" /> Đặt nhắc nhở
            </button>
            <button className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold inline-flex items-center gap-1.5 shadow-soft">
              <Sparkles className="h-4 w-4" /> Tạo kịch bản mới
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr_340px] gap-5">
        {/* Left — customer summary */}
        <div className="space-y-5">
          <div className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
            <div className="bg-gradient-to-br from-primary/10 via-primary-soft to-transparent px-5 pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-300 to-indigo-500 grid place-items-center text-white font-bold">{initials(CUSTOMER.name)}</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold truncate">{CUSTOMER.name}</h3>
                    <BadgeCheck className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">{CUSTOMER.tier}</span>
                  </div>
                  <div className="text-[11.5px] text-muted-foreground">{CUSTOMER.status}</div>
                  <div className="text-[11.5px] text-primary font-semibold truncate">{CUSTOMER.project}</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                {[
                  { i: Phone, l: "Gọi", t: "bg-primary text-primary-foreground" },
                  { i: MessageCircle, l: "Zalo", t: "bg-card border border-border" },
                  { i: MessageCircle, l: "Mess", t: "bg-card border border-border" },
                  { i: Mail, l: "Email", t: "bg-card border border-border" },
                ].map((q) => (
                  <button key={q.l} className={["h-10 rounded-xl text-[11.5px] font-semibold inline-flex items-center justify-center gap-1.5", q.t].join(" ")}>
                    <q.i className="h-3.5 w-3.5" /> {q.l}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 space-y-3 text-[12.5px]">
              <Row label="SĐT" value={CUSTOMER.phone} />
              <Row label="Email" value={CUSTOMER.email} />
              <Row label="Ngân sách" value={CUSTOMER.budget} />
              <Row label="Nhu cầu" value={CUSTOMER.need} />
              <Row label="Thời điểm" value={CUSTOMER.timing} />
              <Row label="Liên hệ cuối" value={CUSTOMER.lastContact} />
            </div>

            <div className="px-5 pb-5">
              <div className="rounded-xl bg-emerald-50 ring-1 ring-emerald-100 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-[11.5px] font-semibold text-emerald-700 inline-flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5" /> AI Lead Score
                  </div>
                  <span className="text-[18px] font-bold text-emerald-700">{CUSTOMER.score}</span>
                </div>
                <div className="text-[11px] text-emerald-700/80 mt-1">Rất tốt · Khả năng chốt giao dịch trong 14 ngày: 64%</div>
              </div>
            </div>
          </div>

          {/* Insights */}
          <div className="rounded-2xl bg-card border border-border shadow-soft p-5">
            <div className="text-[13px] font-semibold mb-3 inline-flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-amber-500" /> AI insight về khách hàng
            </div>
            <ul className="space-y-2.5 text-[12px]">
              {[
                "Khách đã mở email 3 lần liên tiếp về căn 2PN view hồ.",
                "Tương tác mạnh nhất khung 19h-21h các ngày trong tuần.",
                "Có dấu hiệu so sánh với dự án Masteri Waterfront — cần nhấn USP riêng.",
                "Ngân sách phù hợp 80% rổ căn còn lại tầng 12-18.",
              ].map((t, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span className="leading-snug">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Center — script editor */}
        <div className="space-y-5 min-w-0">
          {/* Script chooser */}
          <div className="rounded-2xl bg-card border border-border shadow-soft p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[13px] font-semibold inline-flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-primary" /> Gợi ý kịch bản từ AI
                </div>
                <p className="text-[11.5px] text-muted-foreground mt-0.5">3 mẫu được cá nhân hoá theo hồ sơ và lịch sử tương tác</p>
              </div>
              <button className="h-8 px-2.5 rounded-lg border border-border text-[11.5px] font-semibold inline-flex items-center gap-1 hover:bg-muted/40">
                <RefreshCw className="h-3.5 w-3.5" /> Tạo lại
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {SCRIPTS.map((s, i) => {
                const sel = i === activeIdx;
                return (
                  <button key={s.title} onClick={() => pickScript(i)}
                    className={["text-left rounded-xl p-3.5 border-2 transition relative",
                      sel ? "border-primary bg-primary-soft/40" : "border-border hover:bg-muted/30"].join(" ")}>
                    {s.recommended && (
                      <span className="absolute top-2 right-2 text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 inline-flex items-center gap-0.5">
                        <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" /> AI chọn
                      </span>
                    )}
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className={["inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ring-1", CHANNEL_TONE[s.channel]].join(" ")}>{s.channel}</span>
                      <span className="text-[10px] text-muted-foreground">· {s.tone}</span>
                    </div>
                    <div className="text-[12.5px] font-semibold leading-snug mb-1.5">{s.title}</div>
                    <div className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">{s.preview}</div>
                    <div className="mt-2.5 flex items-center gap-2 text-[10.5px]">
                      <span className="text-emerald-600 font-semibold">Mở {s.predictedOpen}%</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-blue-600 font-semibold">Phản hồi {s.predictedReply}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Composer */}
          <div className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
            <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-border">
              <div className="inline-flex items-center gap-2">
                <span className={["inline-flex items-center px-2 py-1 rounded-md text-[11.5px] font-bold ring-1", CHANNEL_TONE[active.channel]].join(" ")}>{active.channel}</span>
                <span className="text-[13px] font-semibold">{active.title}</span>
              </div>
              <div className="flex items-center gap-1">
                <button className="h-8 w-8 grid place-items-center rounded-lg hover:bg-muted text-muted-foreground" title="Sao chép" onClick={() => navigator.clipboard?.writeText(body)}><Copy className="h-4 w-4" /></button>
                <button className="h-8 w-8 grid place-items-center rounded-lg hover:bg-muted text-muted-foreground"><Edit3 className="h-4 w-4" /></button>
              </div>
            </div>

            {/* Tone + variables */}
            <div className="px-5 py-3 flex flex-wrap items-center gap-2 border-b border-border bg-muted/20">
              <span className="text-[11.5px] text-muted-foreground font-medium">Tone:</span>
              {(["Thân thiện", "Chuyên nghiệp", "Khẩn cấp"] as const).map((t) => (
                <button key={t} onClick={() => setTone(t)}
                  className={["h-7 px-2.5 rounded-lg text-[11.5px] font-semibold border", tone === t ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-card"].join(" ")}>
                  {t}
                </button>
              ))}
              <span className="ml-auto text-[11.5px] text-muted-foreground inline-flex items-center gap-1.5">
                <Wand2 className="h-3.5 w-3.5" /> Biến: {`{tên}`} {`{dự_án}`} {`{căn_hộ}`}
              </span>
            </div>

            <textarea value={body} onChange={(e) => setBody(e.target.value)}
              className="w-full p-5 text-[13.5px] leading-relaxed outline-none resize-y min-h-[260px] font-sans bg-card" />

            <div className="px-5 py-3 border-t border-border flex flex-wrap items-center gap-2">
              <div className="text-[11.5px] text-muted-foreground inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Thời điểm gửi tốt nhất: <span className="font-semibold text-foreground">19:30 hôm nay</span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button className="h-9 px-3 rounded-xl border border-border text-[12.5px] font-semibold inline-flex items-center gap-1.5 hover:bg-muted/40">
                  <Calendar className="h-4 w-4" /> Hẹn giờ gửi
                </button>
                <button className="h-9 px-3 rounded-xl border border-border text-[12.5px] font-semibold inline-flex items-center gap-1.5 hover:bg-muted/40">
                  <RefreshCw className="h-4 w-4" /> AI viết lại
                </button>
                <button className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold inline-flex items-center gap-1.5 shadow-soft">
                  <Send className="h-4 w-4" /> Gửi qua {active.channel}
                </button>
              </div>
            </div>

            {/* Feedback */}
            <div className="px-5 pb-4 flex items-center gap-2 text-[11.5px] text-muted-foreground">
              Phản hồi gợi ý của AI:
              <button className="h-7 w-7 grid place-items-center rounded-lg border border-border hover:bg-emerald-50 hover:text-emerald-600"><ThumbsUp className="h-3.5 w-3.5" /></button>
              <button className="h-7 w-7 grid place-items-center rounded-lg border border-border hover:bg-rose-50 hover:text-rose-600"><ThumbsDown className="h-3.5 w-3.5" /></button>
            </div>
          </div>

          {/* Suggested tasks */}
          <div className="rounded-2xl bg-card border border-border shadow-soft p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[13px] font-semibold inline-flex items-center gap-1.5">
                  <CheckSquare className="h-4 w-4 text-primary" /> Tác vụ AI đề xuất cho nhân viên
                </div>
                <p className="text-[11.5px] text-muted-foreground mt-0.5">Bấm "Tạo tác vụ" để giao việc và đồng bộ vào lịch của bạn</p>
              </div>
              <button className="h-8 px-2.5 rounded-lg border border-border text-[11.5px] font-semibold inline-flex items-center gap-1 hover:bg-muted/40">
                <Plus className="h-3.5 w-3.5" /> Tác vụ tuỳ chỉnh
              </button>
            </div>
            <ul className="space-y-2.5">
              {SUGGESTED_TASKS.map((t, i) => {
                const created = createdTasks.includes(i);
                return (
                  <li key={t.title} className="rounded-xl border border-border p-3.5 hover:bg-muted/20 transition flex items-start gap-3">
                    <div className={["h-9 w-9 rounded-xl grid place-items-center shrink-0", t.tone].join(" ")}>
                      <t.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[12.5px] font-semibold">{t.title}</span>
                        <span className={["text-[10px] font-bold px-1.5 py-0.5 rounded ring-1",
                          t.priority === "Cao" ? "bg-rose-50 text-rose-700 ring-rose-100"
                            : t.priority === "Trung bình" ? "bg-amber-50 text-amber-700 ring-amber-100"
                            : "bg-slate-100 text-slate-600 ring-slate-200"].join(" ")}>{t.priority}</span>
                      </div>
                      <div className="text-[11.5px] text-muted-foreground mt-0.5">{t.desc}</div>
                      <div className="text-[11px] text-muted-foreground mt-1.5 inline-flex items-center gap-1"><Clock className="h-3 w-3" /> Hạn: {t.due}</div>
                    </div>
                    {created ? (
                      <span className="h-9 px-3 rounded-xl bg-emerald-50 text-emerald-700 text-[12px] font-semibold inline-flex items-center gap-1 ring-1 ring-emerald-100">
                        <Check className="h-3.5 w-3.5" /> Đã tạo
                      </span>
                    ) : (
                      <button onClick={() => setCreatedTasks((p) => [...p, i])}
                        className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-[12px] font-semibold inline-flex items-center gap-1 shadow-soft hover:bg-primary/90">
                        <Plus className="h-3.5 w-3.5" /> Tạo tác vụ
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Right — workflow + timeline */}
        <div className="space-y-5">
          <div className="rounded-2xl bg-card border border-border shadow-soft p-5">
            <div className="text-[13px] font-semibold mb-3">Tiến trình AI Follow-up</div>
            <ol className="space-y-3">
              {[
                { label: "Gửi tài liệu giới thiệu", state: "done" },
                { label: "Mở email & tải brochure", state: "done" },
                { label: "Gửi mô phỏng tài chính", state: "current" },
                { label: "Tư vấn 1-1 / Tham quan nhà mẫu", state: "todo" },
                { label: "Đề xuất chốt giao dịch", state: "todo" },
              ].map((s, i, arr) => (
                <li key={s.label} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={["h-6 w-6 rounded-full grid place-items-center text-[10px] font-bold",
                      s.state === "done" ? "bg-emerald-500 text-white"
                        : s.state === "current" ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                        : "bg-muted text-muted-foreground"].join(" ")}>
                      {s.state === "done" ? <Check className="h-3 w-3" /> : i + 1}
                    </div>
                    {i < arr.length - 1 && <div className={["w-px flex-1 mt-1", s.state === "done" ? "bg-emerald-300" : "bg-border"].join(" ")} style={{ minHeight: 22 }} />}
                  </div>
                  <div className="pb-2">
                    <div className={["text-[12.5px]", s.state === "current" ? "font-semibold" : ""].join(" ")}>{s.label}</div>
                    {s.state === "current" && <div className="text-[10.5px] text-primary font-semibold">Đang thực hiện</div>}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Timeline */}
          <div className="rounded-2xl bg-card border border-border shadow-soft p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[13px] font-semibold">Tương tác gần đây</div>
              <button className="text-[11.5px] font-semibold text-primary hover:underline">Tất cả</button>
            </div>
            <ul className="space-y-3">
              {TIMELINE.map((t, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <div className={["h-8 w-8 rounded-lg grid place-items-center shrink-0", t.tone].join(" ")}>
                    <t.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold">{t.title}</div>
                    <div className="text-[10.5px] text-muted-foreground">{t.time}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Risk alert */}
          <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-4">
            <div className="flex items-start gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-amber-500/20 grid place-items-center shrink-0">
                <AlertCircle className="h-4 w-4 text-amber-700" />
              </div>
              <div>
                <div className="text-[12.5px] font-bold text-amber-900">Cảnh báo: Lỡ thời điểm vàng</div>
                <p className="text-[11.5px] text-amber-800/90 mt-1 leading-snug">
                  Khách thường tương tác mạnh khung 19h-21h. Nếu không follow-up trong 24h, xác suất chuyển đổi giảm 28%.
                </p>
                <button className="mt-2 h-7 px-2.5 rounded-lg bg-amber-500 text-white text-[11.5px] font-semibold inline-flex items-center gap-1">
                  <Bell className="h-3 w-3" /> Đặt nhắc 19:30
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground text-right">{value}</span>
    </div>
  );
}
