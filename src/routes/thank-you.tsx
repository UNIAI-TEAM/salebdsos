import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Calendar, Mail, Phone, Sparkles, ArrowRight, Play, BookOpen, MessageCircle } from "lucide-react";

type LeadSummary = {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  teamSize?: string;
  createdAt?: string;
};

const ROLE_LABEL: Record<string, string> = {
  sale: "Sale / Môi giới",
  leader: "Trưởng nhóm",
  manager: "Quản lý / Giám đốc Sales",
  owner: "Chủ doanh nghiệp",
  other: "Khác",
};

const SIZE_LABEL: Record<string, string> = {
  "1-10": "1 - 10 sale",
  "11-50": "11 - 50 sale",
  "51-200": "51 - 200 sale",
  "200+": "Trên 200 sale",
};

export const Route = createFileRoute("/thank-you")({
  head: () => ({
    meta: [
      { title: "Cảm ơn bạn — SaleBDS OS" },
      { name: "description", content: "Yêu cầu trải nghiệm demo của bạn đã được ghi nhận. Xem các bước tiếp theo để bắt đầu." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Cảm ơn bạn — SaleBDS OS" },
      { property: "og:description", content: "Yêu cầu trải nghiệm demo của bạn đã được ghi nhận." },
    ],
  }),
  component: ThankYouPage,
});

function ThankYouPage() {
  const [lead, setLead] = useState<LeadSummary | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("nfc_last_lead");
      if (raw) setLead(JSON.parse(raw));
    } catch {/* ignore */}
  }, []);

  const submittedAt = lead?.createdAt ? new Date(lead.createdAt) : new Date();

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-5 lg:px-8 py-14 lg:py-20">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/10 grid place-items-center ring-8 ring-emerald-500/5">
            <CheckCircle2 className="h-9 w-9 text-emerald-500" />
          </div>
          <div className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[11.5px] font-medium text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" /> Yêu cầu đã được ghi nhận
          </div>
          <h1 className="mt-4 text-[30px] lg:text-[40px] font-bold tracking-tight leading-tight">
            Cảm ơn {lead?.name ? <span className="text-brand-gradient">{lead.name}</span> : "bạn"}!
          </h1>
          <p className="mt-3 text-[15px] text-muted-foreground max-w-xl mx-auto">
            Chuyên gia của chúng tôi sẽ liên hệ trong vòng <span className="text-foreground font-semibold">24h làm việc</span> để kích hoạt môi trường demo cá nhân hoá cho đội Sales của bạn.
          </p>
        </div>

        {/* Summary card */}
        <section className="mt-10 rounded-2xl border border-border bg-card p-6 lg:p-7 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Tóm tắt yêu cầu</h2>
            <span className="text-[11.5px] text-muted-foreground">
              {submittedAt.toLocaleString("vi-VN")}
            </span>
          </div>
          <dl className="mt-5 grid sm:grid-cols-2 gap-x-6 gap-y-4 text-[13.5px]">
            <Field label="Họ tên" value={lead?.name} />
            <Field label="Email" value={lead?.email} icon={<Mail className="h-3.5 w-3.5" />} />
            <Field label="Số điện thoại" value={lead?.phone} icon={<Phone className="h-3.5 w-3.5" />} />
            <Field label="Vai trò" value={lead?.role ? ROLE_LABEL[lead.role] ?? lead.role : undefined} />
            <Field label="Quy mô đội ngũ" value={lead?.teamSize ? SIZE_LABEL[lead.teamSize] ?? lead.teamSize : undefined} />
            <Field label="Trạng thái" value="Đang xử lý" badge />
          </dl>
        </section>

        {/* Next steps */}
        <section className="mt-10">
          <h2 className="text-[15px] font-semibold">Các bước tiếp theo</h2>
          <ol className="mt-5 space-y-3">
            {[
              { t: "Kiểm tra hộp thư email", d: "Bạn sẽ nhận email xác nhận kèm liên kết tài liệu giới thiệu trong vài phút tới. Đừng quên kiểm tra thư mục Spam." },
              { t: "Chuyên gia liên hệ", d: "Trong 24h làm việc, đội ngũ tư vấn sẽ gọi điện theo SĐT bạn cung cấp để hiểu nhu cầu và lên lịch demo." },
              { t: "Trải nghiệm demo cá nhân hoá", d: "Buổi demo 30 phút với data mẫu sát thực tế đội Sales BĐS của bạn." },
            ].map((s, i) => (
              <li key={i} className="rounded-xl border border-border bg-card p-4 flex gap-4">
                <div className="h-8 w-8 shrink-0 rounded-full bg-brand-gradient text-white text-[13px] font-bold grid place-items-center shadow-glow">
                  {i + 1}
                </div>
                <div>
                  <div className="text-[14px] font-semibold">{s.t}</div>
                  <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Quick actions */}
        <section className="mt-10 grid sm:grid-cols-3 gap-3">
          <Link to="/dashboard" className="group rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition">
            <Play className="h-5 w-5 text-primary" />
            <div className="mt-3 text-[13.5px] font-semibold">Mở demo ngay</div>
            <div className="mt-1 text-[12px] text-muted-foreground">Khám phá dashboard với data mẫu</div>
            <div className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-primary">
              Vào dashboard <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
            </div>
          </Link>
          <a href="#" className="group rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition">
            <BookOpen className="h-5 w-5 text-primary" />
            <div className="mt-3 text-[13.5px] font-semibold">Đọc tài liệu</div>
            <div className="mt-1 text-[12px] text-muted-foreground">Hướng dẫn nhanh trong 5 phút</div>
            <div className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-primary">
              Xem hướng dẫn <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
            </div>
          </a>
          <a href="mailto:hello@nfcplatform.vn" className="group rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition">
            <MessageCircle className="h-5 w-5 text-primary" />
            <div className="mt-3 text-[13.5px] font-semibold">Cần hỗ trợ ngay?</div>
            <div className="mt-1 text-[12px] text-muted-foreground">Trò chuyện với đội ngũ của chúng tôi</div>
            <div className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-primary">
              Liên hệ <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
            </div>
          </a>
        </section>

        {/* Footer CTA */}
        <div className="mt-12 rounded-2xl bg-slate-950 text-white p-6 lg:p-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-[14.5px] font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> Muốn đặt lịch sớm hơn?
            </div>
            <p className="mt-1 text-[12.5px] text-white/70">Chọn khung giờ phù hợp để chuyên gia liên hệ ưu tiên.</p>
          </div>
          <Link to="/" hash="pricing" className="h-10 px-4 rounded-lg bg-white text-slate-900 text-[13px] font-semibold inline-flex items-center gap-2 self-start sm:self-auto">
            Đặt lịch tư vấn <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-8 text-center">
          <Link to="/" className="text-[12.5px] text-muted-foreground hover:text-foreground">← Quay lại trang chủ</Link>
        </div>
      </div>
    </main>
  );
}

function Field({ label, value, icon, badge }: { label: string; value?: string; icon?: React.ReactNode; badge?: boolean }) {
  return (
    <div>
      <dt className="text-[11.5px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 flex items-center gap-1.5 text-foreground font-medium">
        {icon}
        {badge ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 text-[11.5px] font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" /> {value}
          </span>
        ) : (
          <span>{value || <span className="text-muted-foreground italic">—</span>}</span>
        )}
      </dd>
    </div>
  );
}
