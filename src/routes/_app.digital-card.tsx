import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/app/ui";
import {
  Phone, MessageCircle, Mail, IdCard, Sparkles, Eye, Share2, Download,
  Smartphone, Globe, CheckCircle2, Wallet, QrCode, Plus, Edit3, Type, Image as ImageIcon, Palette, Layout,
} from "lucide-react";

export const Route = createFileRoute("/_app/digital-card")({ component: DigitalCard });

function DigitalCard() {
  return (
    <div className="space-y-6">
      <PageHeader title="Danh thiếp & Profile" sub="Tuỳ chỉnh danh thiếp số, xem trước và chia sẻ tức thì."
        action={<div className="flex gap-2">
          <button className="h-9 px-3 rounded-xl border border-border bg-card text-[12.5px] font-medium hover:bg-muted inline-flex items-center gap-1.5"><Eye className="h-4 w-4" /> Xem trước</button>
          <button className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold inline-flex items-center gap-1.5"><Share2 className="h-4 w-4" /> Chia sẻ</button>
        </div>} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Editor */}
        <div className="space-y-4">
          <SectionCard title="Thiết kế danh thiếp">
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[Layout, Palette, Type, ImageIcon].map((I, i) => (
                <button key={i} className={["rounded-xl p-3 text-center text-[11.5px] font-medium border", i === 0 ? "border-primary bg-primary-soft text-primary" : "border-border bg-card hover:bg-muted"].join(" ")}>
                  <I className="h-4 w-4 mx-auto mb-1" />
                  {["Bố cục", "Màu", "Chữ", "Ảnh"][i]}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {["Classic", "Luxury Dark", "Glass", "Gradient", "Minimal", "Bold"].map((t, i) => (
                <div key={t} className={["aspect-[1.6/1] rounded-xl cursor-pointer ring-2 transition", i === 1 ? "ring-primary" : "ring-transparent hover:ring-primary/40",
                  ["bg-white border border-border", "bg-gradient-to-br from-slate-900 to-indigo-900", "bg-white/60 backdrop-blur",
                   "bg-gradient-to-br from-primary to-indigo-500", "bg-muted", "bg-gradient-to-br from-slate-900 to-rose-900"][i]
                ].join(" ")} />
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Thông tin cá nhân">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                ["Họ và tên", "Nguyễn Văn A"], ["Chức vụ", "Chuyên viên tư vấn BĐS cao cấp"],
                ["Công ty", "ABC Real Estate"], ["Email", "nguyenvana@abcre.vn"],
                ["Số điện thoại", "0901 234 567"], ["Website", "abcre.vn/nguyenvana"],
              ].map(([l, v]) => (
                <label key={l} className="block">
                  <span className="text-[11.5px] font-medium text-muted-foreground">{l}</span>
                  <input defaultValue={v} className="mt-1 w-full h-10 rounded-xl border border-border bg-card px-3 text-[13px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                </label>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Liên kết & mạng xã hội"
            action={<button className="text-[12px] text-primary font-medium inline-flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Thêm liên kết</button>}>
            <ul className="divide-y divide-border">
              {[
                { i: Phone, l: "Điện thoại", v: "0901 234 567" },
                { i: MessageCircle, l: "Zalo", v: "zalo.me/0901234567" },
                { i: MessageCircle, l: "Messenger", v: "m.me/nguyenvana" },
                { i: Mail, l: "Email", v: "nguyenvana@abcre.vn" },
                { i: Globe, l: "Website", v: "abcre.vn/nguyenvana" },
              ].map((row) => (
                <li key={row.l} className="flex items-center gap-3 py-2.5">
                  <div className="h-9 w-9 rounded-lg bg-primary-soft text-primary grid place-items-center"><row.i className="h-4 w-4" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold">{row.l}</div>
                    <div className="text-[11.5px] text-muted-foreground truncate">{row.v}</div>
                  </div>
                  <button className="text-muted-foreground hover:text-foreground"><Edit3 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="AI tối ưu hồ sơ">
            <div className="rounded-xl bg-gradient-to-br from-primary-soft to-indigo-50 p-4 flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-brand-gradient grid place-items-center shrink-0"><Sparkles className="h-5 w-5 text-white" /></div>
              <div className="flex-1">
                <div className="text-[13px] font-semibold">Hồ sơ của bạn đạt 86/100</div>
                <p className="text-[12px] text-muted-foreground mt-1">AI gợi ý: thêm ảnh bìa, 2 dự án nổi bật và mô tả ngắn để tăng tỷ lệ lưu liên hệ lên 32%.</p>
                <button className="mt-2 text-[12px] font-semibold text-primary hover:underline">Áp dụng tự động →</button>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Live mobile preview */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <SectionCard title="Xem trước trên mobile">
            <div className="mx-auto w-[260px] rounded-[2.5rem] border-[10px] border-slate-900 bg-slate-900 shadow-xl overflow-hidden">
              <div className="h-5 bg-slate-900 grid place-items-center"><div className="h-1 w-12 bg-slate-700 rounded-full" /></div>
              <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white px-5 pt-6 pb-5">
                <div className="flex flex-col items-center text-center">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-indigo-500 grid place-items-center text-[20px] font-bold ring-4 ring-white/10">NA</div>
                  <div className="mt-3 flex items-center gap-1.5">
                    <div className="text-[15px] font-bold">Nguyễn Văn A</div>
                    <CheckCircle2 className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="text-[11px] text-white/70 mt-0.5">Chuyên viên tư vấn BĐS cao cấp</div>
                  <div className="text-[10.5px] text-white/50">ABC Real Estate</div>
                </div>
                <div className="grid grid-cols-5 gap-1.5 mt-4">
                  {[Phone, MessageCircle, MessageCircle, Mail, IdCard].map((I, i) => (
                    <div key={i} className="aspect-square rounded-lg bg-white/10 grid place-items-center"><I className="h-3.5 w-3.5" /></div>
                  ))}
                </div>
                <button className="mt-3 w-full rounded-xl bg-white text-slate-900 text-[12px] font-semibold py-2.5">Lưu liên hệ</button>
              </div>
              <div className="bg-white p-4 space-y-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Dự án nổi bật</div>
                {["Vinhomes Ocean Park 2", "Masteri Waterfront"].map((p) => (
                  <div key={p} className="rounded-lg bg-slate-50 p-2 flex items-center gap-2">
                    <div className="h-9 w-9 rounded bg-gradient-to-br from-blue-200 to-indigo-200" />
                    <div className="text-[11px] font-semibold text-slate-800">{p}</div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Chia sẻ">
            <div className="grid grid-cols-2 gap-2">
              {[
                { i: Smartphone, l: "Tap NFC" }, { i: QrCode, l: "Quét QR" },
                { i: Share2, l: "AirDrop" }, { i: Wallet, l: "Wallet" },
                { i: Globe, l: "Sao chép link" }, { i: Download, l: "Tải vCard" },
              ].map((b) => (
                <button key={b.l} className="rounded-xl border border-border bg-card hover:bg-muted hover:border-primary/40 p-3 flex flex-col items-center gap-1.5 transition">
                  <b.i className="h-4 w-4 text-primary" />
                  <span className="text-[11px] font-medium">{b.l}</span>
                </button>
              ))}
            </div>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
