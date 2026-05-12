import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard, KpiCard } from "@/components/app/ui";
import { Wallet, Apple, Smartphone, Plus, Radio, Sparkles, Eye, Download, Share2 } from "lucide-react";

export const Route = createFileRoute("/_app/wallet")({ component: WalletPage });

function WalletPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Wallet Card" sub="Danh thiếp luôn sẵn trong Apple Wallet & Google Wallet — cập nhật thời gian thực."
        action={<button className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold inline-flex items-center gap-1.5"><Plus className="h-4 w-4" /> Tạo Wallet Card</button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Wallet} label="Wallet đã cài" value="3,456" delta={28.4} tone="primary" />
        <KpiCard icon={Eye} label="Lượt mở thẻ" value="12,890" delta={19.2} tone="indigo" />
        <KpiCard icon={Radio} label="NFC tap (Wallet)" value="2,134" delta={32.1} tone="blue" />
        <KpiCard icon={Sparkles} label="Cập nhật tự động" value="86" delta={12.4} tone="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Apple Wallet"
          action={<button className="text-[12px] text-primary font-medium hover:underline">Tuỳ chỉnh</button>}>
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-5 text-white relative overflow-hidden shadow-glow">
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/30 blur-3xl" />
            <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-indigo-500/20 blur-3xl" />
            <div className="relative">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10.5px] uppercase tracking-widest text-white/60">ABC Real Estate</div>
                  <div className="text-[20px] font-bold mt-1">Nguyễn Văn A</div>
                  <div className="text-[12px] text-white/70">Chuyên viên tư vấn cao cấp</div>
                </div>
                <Apple className="h-7 w-7 text-white/80" />
              </div>
              <div className="mt-8 flex items-end justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-white/50">Liên hệ</div>
                  <div className="text-[13px] font-mono">+84 901 234 567</div>
                </div>
                <div className="h-14 w-14 rounded-lg bg-white p-1.5 grid place-items-center">
                  <div className="h-full w-full rounded" style={{
                    backgroundImage: "linear-gradient(45deg, #000 25%, transparent 25%), linear-gradient(-45deg, #000 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #000 75%), linear-gradient(-45deg, transparent 75%, #000 75%)",
                    backgroundSize: "8px 8px",
                  }} />
                </div>
              </div>
            </div>
          </div>
          <button className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-black text-white text-[13px] font-semibold py-3 hover:bg-black/90">
            <Apple className="h-4 w-4" /> Add to Apple Wallet
          </button>
        </SectionCard>

        <SectionCard title="Google Wallet"
          action={<button className="text-[12px] text-primary font-medium hover:underline">Tuỳ chỉnh</button>}>
          <div className="rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-5 text-white relative overflow-hidden shadow-glow">
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
            <div className="relative">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10.5px] uppercase tracking-widest text-white/70">ABC Real Estate</div>
                  <div className="text-[20px] font-bold mt-1">Nguyễn Văn A</div>
                  <div className="text-[12px] text-white/80">Chuyên viên tư vấn cao cấp</div>
                </div>
                <Smartphone className="h-7 w-7 text-white/80" />
              </div>
              <div className="mt-8 grid grid-cols-3 gap-3 text-[10.5px]">
                <div><div className="text-white/60">Hotline</div><div className="font-semibold">0901 234 567</div></div>
                <div><div className="text-white/60">Email</div><div className="font-semibold truncate">a@abcre.vn</div></div>
                <div><div className="text-white/60">Web</div><div className="font-semibold">abcre.vn</div></div>
              </div>
            </div>
          </div>
          <button className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white text-slate-900 border border-border text-[13px] font-semibold py-3 hover:bg-muted">
            <Wallet className="h-4 w-4" /> Add to Google Wallet
          </button>
        </SectionCard>
      </div>

      <SectionCard title="Smart campaign switching" action={<button className="text-[12px] text-primary font-medium hover:underline">Quản lý</button>}>
        <p className="text-[12.5px] text-muted-foreground mb-3">Tự động hoán đổi nội dung Wallet Card theo chiến dịch / sự kiện đang chạy.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { name: "Mở bán Vinhomes Ocean Park 2", state: "Đang chạy", color: "bg-emerald-100 text-emerald-700" },
            { name: "Sự kiện cuối năm ABC", state: "Lên lịch", color: "bg-blue-100 text-blue-700" },
            { name: "Promo Tết 2025", state: "Bản nháp", color: "bg-slate-100 text-slate-700" },
          ].map((c) => (
            <div key={c.name} className="rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition">
              <div className="flex items-center justify-between mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className={["text-[10.5px] px-2 py-0.5 rounded-md font-semibold", c.color].join(" ")}>{c.state}</span>
              </div>
              <div className="text-[13px] font-semibold">{c.name}</div>
              <div className="text-[11px] text-muted-foreground mt-1">Tự động cập nhật cho 3,456 wallet đã cài</div>
              <div className="flex gap-1.5 mt-3">
                <button className="text-[11px] px-2 py-1 rounded-md border border-border hover:bg-muted inline-flex items-center gap-1"><Download className="h-3 w-3" /> .pkpass</button>
                <button className="text-[11px] px-2 py-1 rounded-md border border-border hover:bg-muted inline-flex items-center gap-1"><Share2 className="h-3 w-3" /> Chia sẻ</button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
