import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { Sparkles, Star, MapPin, Building2, ArrowRight, ShieldCheck, Eye, Wand2 } from "lucide-react";

export const Route = createFileRoute("/_app/ai-sales-page")({ component: AISalesPage });

function AISalesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="AI Sales Page" sub="Landing page bán hàng cá nhân hoá — AI tự đề xuất dự án, ưu đãi và CTA phù hợp."
        action={<div className="flex gap-2">
          <button className="h-9 px-3 rounded-xl border border-border bg-card text-[12.5px] font-medium hover:bg-muted inline-flex items-center gap-1.5"><Eye className="h-4 w-4" /> Xem trực tiếp</button>
          <button className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold inline-flex items-center gap-1.5"><Wand2 className="h-4 w-4" /> AI viết lại</button>
        </div>} />

      <div className="rounded-3xl overflow-hidden border border-border shadow-card bg-card">
        {/* Hero */}
        <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-8 lg:p-14">
          <div className="absolute inset-0 bg-grid-soft opacity-20" />
          <div className="relative max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[11px] font-semibold backdrop-blur"><Sparkles className="h-3 w-3 text-amber-300" /> AI cá nhân hoá cho bạn</div>
            <h1 className="mt-4 text-[36px] lg:text-[48px] font-bold leading-[1.05] tracking-tight">
              Sở hữu căn hộ <span className="text-brand-gradient">đẳng cấp</span> tại Vinhomes Ocean Park 2
            </h1>
            <p className="mt-4 text-[15px] text-white/70 max-w-xl">Ưu đãi giới hạn dành riêng cho bạn — chiết khấu lên đến 8%, quà tặng nội thất 200 triệu, vay 0% lãi suất 24 tháng.</p>
            <div className="mt-6 flex gap-3">
              <button className="h-11 px-5 rounded-xl bg-white text-slate-900 text-[13px] font-semibold inline-flex items-center gap-2">Đặt lịch xem dự án <ArrowRight className="h-4 w-4" /></button>
              <button className="h-11 px-5 rounded-xl bg-white/10 text-white text-[13px] font-semibold backdrop-blur hover:bg-white/15">Tải brochure</button>
            </div>
            <div className="mt-8 flex items-center gap-6 text-[11px] text-white/60">
              <div className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Đã xác thực</div>
              <div className="inline-flex items-center gap-1.5"><Star className="h-3.5 w-3.5 text-amber-400 fill-current" /> 4.9/5 · 2,340 đánh giá</div>
            </div>
          </div>
        </div>

        {/* AI recommendations */}
        <div className="p-6 lg:p-10">
          <div className="flex items-end justify-between mb-5">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-primary inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> AI gợi ý cho bạn</div>
              <h2 className="text-[22px] font-bold tracking-tight mt-1">Dự án phù hợp với nhu cầu</h2>
            </div>
            <button className="text-[12px] text-primary font-semibold">Xem tất cả →</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: "Vinhomes Ocean Park 2", price: "Từ 2.8 tỷ", area: "Hưng Yên", match: 96, tone: "from-blue-200 to-indigo-200" },
              { name: "Masteri Waterfront", price: "Từ 3.6 tỷ", area: "Hà Nội", match: 92, tone: "from-emerald-200 to-cyan-200" },
              { name: "Lumi Hanoi", price: "Từ 4.2 tỷ", area: "Hà Nội", match: 88, tone: "from-amber-200 to-rose-200" },
            ].map((p) => (
              <div key={p.name} className="rounded-2xl overflow-hidden border border-border bg-card hover:shadow-card hover:-translate-y-0.5 transition">
                <div className={["aspect-[16/10] bg-gradient-to-br relative", p.tone].join(" ")}>
                  <div className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/95 text-[10.5px] font-bold text-primary"><Sparkles className="h-3 w-3" /> {p.match}% phù hợp</div>
                  <div className="absolute bottom-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10.5px]"><MapPin className="h-3 w-3" /> {p.area}</div>
                </div>
                <div className="p-4">
                  <div className="text-[14px] font-bold">{p.name}</div>
                  <div className="text-[12px] text-muted-foreground mt-0.5">{p.price}</div>
                  <button className="mt-3 w-full h-9 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-semibold">Xem chi tiết</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Smart lead form */}
        <div className="p-6 lg:p-10 bg-muted/40 border-t border-border">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-[22px] font-bold tracking-tight">Để lại thông tin — AI sẽ liên hệ trong 60 giây</h3>
              <p className="text-[13px] text-muted-foreground mt-2">Chúng tôi sẽ tự động chọn chuyên viên phù hợp nhất với khu vực, ngân sách và nhu cầu của bạn.</p>
              <div className="mt-4 flex items-center gap-4 text-[12px] text-muted-foreground">
                <div className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Bảo mật tuyệt đối</div>
                <div className="inline-flex items-center gap-1.5"><Building2 className="h-4 w-4 text-primary" /> 200+ dự án</div>
              </div>
            </div>
            <form className="rounded-2xl bg-card border border-border p-5 shadow-soft space-y-2.5">
              {[["Họ và tên", "text"], ["Số điện thoại", "tel"], ["Ngân sách dự kiến", "text"]].map(([l, t]) => (
                <input key={l as string} type={t as string} placeholder={l as string} className="w-full h-11 rounded-xl border border-border bg-card px-3.5 text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
              ))}
              <button className="w-full h-11 rounded-xl bg-brand-gradient text-white text-[13px] font-semibold inline-flex items-center justify-center gap-2 shadow-glow">
                <Sparkles className="h-4 w-4" /> Nhận tư vấn cá nhân hoá
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
