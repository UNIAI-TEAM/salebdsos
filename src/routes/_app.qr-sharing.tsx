import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { QrCode, Smartphone, Share2, Lock, Wifi, Download, Copy } from "lucide-react";

export const Route = createFileRoute("/_app/qr-sharing")({ component: QRSharing });

function QRSharing() {
  return (
    <div className="space-y-6">
      <PageHeader title="QR Sharing" sub="Chia sẻ danh thiếp tức thì qua QR — bao gồm chế độ màn hình khoá & AirDrop." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard title="Chế độ chia sẻ nhanh">
          <div className="aspect-[9/16] rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-soft opacity-30" />
            <div className="relative h-full flex flex-col">
              <div className="flex items-center justify-between text-[11px] text-white/60">
                <span>09:41</span>
                <Wifi className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 grid place-items-center">
                <div className="text-center">
                  <div className="h-44 w-44 mx-auto bg-white rounded-2xl p-3">
                    <div className="h-full w-full rounded-lg" style={{
                      backgroundImage: "linear-gradient(45deg, #000 25%, transparent 25%), linear-gradient(-45deg, #000 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #000 75%), linear-gradient(-45deg, transparent 75%, #000 75%)",
                      backgroundSize: "10px 10px",
                    }} />
                  </div>
                  <div className="mt-4 text-[15px] font-bold">Nguyễn Văn A</div>
                  <div className="text-[11px] text-white/70">Quét để lưu liên hệ</div>
                </div>
              </div>
              <div className="text-center text-[10.5px] text-white/50 flex items-center justify-center gap-1.5">
                <Lock className="h-3 w-3" /> Hoạt động ngay cả khi khoá màn hình
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="lg:col-span-2 space-y-4">
          <SectionCard title="Tuỳ chọn chia sẻ">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { i: QrCode, t: "QR toàn màn hình", d: "Chia sẻ qua QR siêu lớn" },
                { i: Smartphone, t: "NFC tap", d: "Chạm điện thoại để chia sẻ" },
                { i: Share2, t: "AirDrop / Nearby", d: "Khám phá thiết bị gần" },
                { i: Lock, t: "Lock screen", d: "Hiện QR ngay từ khoá màn" },
                { i: Download, t: "Tải vCard", d: "Lưu liên hệ về máy" },
                { i: Copy, t: "Copy link", d: "abcre.vn/nguyenvana" },
              ].map((b) => (
                <button key={b.t} className="rounded-2xl border border-border bg-card p-4 text-left hover:border-primary/40 hover:shadow-soft transition">
                  <div className="h-10 w-10 rounded-xl bg-primary-soft text-primary grid place-items-center mb-2.5"><b.i className="h-5 w-5" /></div>
                  <div className="text-[13px] font-semibold">{b.t}</div>
                  <div className="text-[11.5px] text-muted-foreground mt-0.5">{b.d}</div>
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="AirDrop-style — Nearby Networking">
            <div className="rounded-2xl bg-gradient-to-br from-primary-soft via-white to-indigo-50 p-6 relative overflow-hidden">
              <div className="absolute inset-0 grid place-items-center">
                {[80, 140, 200, 260].map((s, i) => (
                  <div key={s} className="absolute rounded-full border border-primary/20" style={{ width: s, height: s, opacity: 0.4 - i * 0.08 }} />
                ))}
              </div>
              <div className="relative grid place-items-center py-8">
                <div className="h-14 w-14 rounded-full bg-brand-gradient grid place-items-center text-white shadow-glow">
                  <Smartphone className="h-6 w-6" />
                </div>
                <div className="mt-3 text-[12px] font-semibold">Đang tìm thiết bị gần…</div>
                <div className="text-[11px] text-muted-foreground">3 thiết bị được phát hiện</div>
              </div>
              <div className="grid grid-cols-3 gap-2 relative">
                {["Trần M.", "Lê T.H", "Phạm T.A"].map((n) => (
                  <div key={n} className="rounded-xl bg-card border border-border p-3 text-center hover:border-primary cursor-pointer transition">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-indigo-500 mx-auto mb-1.5" />
                    <div className="text-[11.5px] font-semibold">{n}</div>
                    <div className="text-[10px] text-muted-foreground">iPhone</div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
