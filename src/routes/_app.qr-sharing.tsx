// Sharing Center — pick a card and share via QR / Lock screen / AirDrop / Bio link / Wallet.
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/app/ui";
import {
  QrCode as QrIcon, Smartphone, Share2, Lock, Wifi, Download, Copy, Wallet, Send,
  ExternalLink, Loader2, Globe, Maximize2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { listShareableCards, getShareAnalytics } from "@/lib/sharing.functions";
import { QrCode } from "@/components/qr-code";

export const Route = createFileRoute("/_app/qr-sharing")({ component: SharingCenter });

const initials = (s: string | null) => (s || "?").trim().split(/\s+/).pop()!.charAt(0).toUpperCase();

function SharingCenter() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;

  const fnCards = useServerFn(listShareableCards);
  const fnStats = useServerFn(getShareAnalytics);

  const cardsQ = useQuery({
    queryKey: ["share-cards", tenantId],
    queryFn: () => fnCards({ data: { tenantId: tenantId! } }),
    enabled: !!tenantId,
  });

  const statsQ = useQuery({
    queryKey: ["share-analytics", tenantId, 30],
    queryFn: () => fnStats({ data: { tenantId: tenantId!, days: 30 } }),
    enabled: !!tenantId,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [airdropOpen, setAirdropOpen] = useState(false);
  const [discovered, setDiscovered] = useState<{ name: string; device: string }[]>([]);

  const cards = cardsQ.data ?? [];
  const selected = useMemo(
    () => cards.find((c) => c.id === selectedId) || cards[0] || null,
    [cards, selectedId]
  );

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const cardUrl = selected ? `${origin}/c/${selected.slug}` : "";

  const startAirdrop = () => {
    setAirdropOpen(true);
    setDiscovered([]);
    const peers = [
      { name: "Trần Minh", device: "iPhone 15 Pro" },
      { name: "Lê Hương", device: "MacBook Air" },
      { name: "Phạm Tuấn", device: "iPad" },
      { name: "Vũ Lan", device: "iPhone 14" },
    ];
    peers.forEach((p, i) => setTimeout(() => setDiscovered((d) => [...d, p]), 600 * (i + 1)));
  };

  const copy = (txt: string) => { navigator.clipboard.writeText(txt); toast.success("Đã copy vào clipboard"); };

  const shareNative = async () => {
    if (!selected) return;
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: selected.display_name, url: cardUrl });
      } catch {}
    } else {
      copy(cardUrl);
    }
  };

  const downloadVCard = () => {
    if (!selected) return;
    const v = `BEGIN:VCARD\nVERSION:3.0\nFN:${selected.display_name}\nORG:${selected.company || ""}\nTITLE:${selected.title || ""}\nURL:${cardUrl}\nEND:VCARD\n`;
    const blob = new Blob([v], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${selected.slug}.vcf`; a.click();
    URL.revokeObjectURL(url);
  };

  const stats = statsQ.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trung tâm chia sẻ"
        sub="Chia sẻ danh thiếp tức thì — QR, Lock screen, AirDrop, Wallet, Social bio."
      />

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: "Tổng tương tác (30d)", v: stats?.total ?? 0, i: Share2, t: "bg-primary-soft text-primary" },
          { l: "Lượt quét QR", v: (stats?.qr ?? 0) + (stats?.dynamicScans ?? 0), i: QrIcon, t: "bg-blue-50 text-blue-600" },
          { l: "NFC tap", v: stats?.nfc ?? 0, i: Smartphone, t: "bg-violet-50 text-violet-600" },
          { l: "Wallet đã cài", v: stats?.walletInstalls ?? 0, i: Wallet, t: "bg-emerald-50 text-emerald-600" },
        ].map((k) => (
          <div key={k.l} className="rounded-2xl border border-border bg-card p-4">
            <div className={["h-9 w-9 rounded-xl grid place-items-center mb-2", k.t].join(" ")}><k.i className="h-4 w-4" /></div>
            <div className="text-[20px] font-bold tabular-nums">{k.v.toLocaleString("vi-VN")}</div>
            <div className="text-[11.5px] text-muted-foreground">{k.l}</div>
          </div>
        ))}
      </div>

      {/* Card selector */}
      <SectionCard title="Chọn danh thiếp để chia sẻ">
        {cardsQ.isLoading ? (
          <div className="py-8 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : cards.length === 0 ? (
          <div className="py-10 text-center">
            <div className="text-[13px] font-semibold">Chưa có danh thiếp</div>
            <div className="text-[12px] text-muted-foreground mt-1">Tạo danh thiếp số trước khi chia sẻ.</div>
            <Link to="/digital-card" search={{}} className="inline-flex items-center gap-1 text-[12.5px] text-primary font-semibold mt-3 hover:underline">
              Tạo ngay <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {cards.map((c) => {
              const active = (selected?.id || cards[0]?.id) === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={["shrink-0 rounded-xl border-2 p-3 min-w-[180px] text-left transition",
                    active ? "border-primary bg-primary-soft/40" : "border-border bg-card hover:border-primary/40"].join(" ")}
                >
                  <div className="flex items-center gap-2.5">
                    {c.avatar_url ? (
                      <img src={c.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-indigo-500 grid place-items-center text-white font-bold">{initials(c.display_name)}</div>
                    )}
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-semibold truncate">{c.display_name}</div>
                      <div className="text-[10.5px] text-muted-foreground truncate">{c.title || c.company || "—"}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </SectionCard>

      {selected && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lock-screen preview */}
          <SectionCard title="Lock screen mode">
            <div className="aspect-[9/16] rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-grid-soft opacity-20" />
              <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/30 blur-3xl" />
              <div className="relative h-full flex flex-col">
                <div className="flex items-center justify-between text-[11px] text-white/60">
                  <span className="font-semibold tabular-nums">09:41</span>
                  <Wifi className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 grid place-items-center">
                  <div className="text-center">
                    <div className="bg-white rounded-2xl p-2.5 inline-block">
                      {origin && <QrCode value={`${cardUrl}?utm_source=lockscreen`} size={150} />}
                    </div>
                    <div className="mt-3 text-[14px] font-bold">{selected.display_name}</div>
                    <div className="text-[11px] text-white/70">Quét để lưu liên hệ</div>
                  </div>
                </div>
                <div className="text-center text-[10.5px] text-white/50 flex items-center justify-center gap-1.5">
                  <Lock className="h-3 w-3" /> Hoạt động trên màn hình khoá
                </div>
              </div>
            </div>
            <Link
              to="/share/$slug"
              params={{ slug: selected.slug }}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold py-3 hover:bg-primary/90"
            >
              <Maximize2 className="h-4 w-4" /> Mở chế độ toàn màn hình
            </Link>
          </SectionCard>

          {/* Sharing actions + AirDrop */}
          <div className="lg:col-span-2 space-y-4">
            <SectionCard title="Tuỳ chọn chia sẻ">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { i: Maximize2, t: "QR toàn màn hình", d: "Cho người khác quét trực tiếp", action: "lock" },
                  { i: Smartphone, t: "NFC tap", d: "Chạm điện thoại để chia sẻ", action: "nfc" },
                  { i: Send, t: "AirDrop / Nearby", d: "Khám phá thiết bị gần", action: "airdrop" },
                  { i: Wallet, t: "Apple/Google Wallet", d: "Lưu thẻ vào ví", action: "wallet" },
                  { i: Download, t: "Tải vCard", d: "File .vcf cho danh bạ", action: "vcard" },
                  { i: Copy, t: "Copy link", d: cardUrl.replace(origin + "/", ""), action: "copy" },
                  { i: Share2, t: "Chia sẻ hệ thống", d: "Native share sheet", action: "native" },
                  { i: Globe, t: "Social bio link", d: "Link cho Instagram/TikTok", action: "bio" },
                ].map((b) => (
                  <button
                    key={b.t}
                    onClick={() => {
                      if (b.action === "copy") copy(cardUrl);
                      else if (b.action === "vcard") downloadVCard();
                      else if (b.action === "native") shareNative();
                      else if (b.action === "airdrop") startAirdrop();
                      else if (b.action === "lock") window.open(`/share/${selected.slug}`, "_blank");
                      else if (b.action === "nfc") (window.location.href = "/nfc-codes");
                      else if (b.action === "wallet") (window.location.href = "/wallet");
                      else if (b.action === "bio") copy(cardUrl);
                    }}
                    className="rounded-2xl border border-border bg-card p-4 text-left hover:border-primary/40 hover:shadow-soft transition"
                  >
                    <div className="h-10 w-10 rounded-xl bg-primary-soft text-primary grid place-items-center mb-2.5"><b.i className="h-5 w-5" /></div>
                    <div className="text-[13px] font-semibold">{b.t}</div>
                    <div className="text-[11.5px] text-muted-foreground mt-0.5 truncate">{b.d}</div>
                  </button>
                ))}
              </div>
            </SectionCard>

            {/* Social Bio Link */}
            <SectionCard title="Social Bio Link" action={<button className="text-[12px] text-primary font-medium hover:underline" onClick={() => copy(cardUrl)}>Copy link</button>}>
              <div className="rounded-xl bg-muted/40 border border-border p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Globe className="h-4 w-4 text-primary shrink-0" />
                  <code className="text-[12px] font-mono truncate">{cardUrl}</code>
                </div>
                <button onClick={() => copy(cardUrl)} className="h-7 w-7 rounded-md hover:bg-muted grid place-items-center"><Copy className="h-3.5 w-3.5" /></button>
              </div>
              <p className="text-[11.5px] text-muted-foreground mt-2">Dán vào hồ sơ Instagram, TikTok, Facebook, Zalo OA — mỗi lượt nhấn được tính là tương tác.</p>
            </SectionCard>

            {/* AirDrop simulation */}
            {airdropOpen && (
              <SectionCard
                title="Nearby Networking"
                action={<button onClick={() => setAirdropOpen(false)} className="text-[12px] text-muted-foreground hover:text-foreground">Đóng</button>}
              >
                <div className="rounded-2xl bg-gradient-to-br from-primary-soft via-white to-indigo-50 p-6 relative overflow-hidden">
                  <div className="absolute inset-0 grid place-items-center pointer-events-none">
                    {[80, 140, 200, 260].map((s, i) => (
                      <div key={s} className="absolute rounded-full border border-primary/20 animate-pulse" style={{ width: s, height: s, opacity: 0.4 - i * 0.08, animationDelay: `${i * 0.3}s` }} />
                    ))}
                  </div>
                  <div className="relative grid place-items-center py-6">
                    <div className="h-14 w-14 rounded-full bg-brand-gradient grid place-items-center text-white shadow-glow">
                      <Send className="h-6 w-6" />
                    </div>
                    <div className="mt-3 text-[12.5px] font-semibold">Đang tìm thiết bị gần…</div>
                    <div className="text-[11px] text-muted-foreground">{discovered.length} thiết bị được phát hiện</div>
                  </div>
                  {discovered.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 relative">
                      {discovered.map((p) => (
                        <button
                          key={p.name}
                          onClick={() => toast.success(`Đã gửi danh thiếp đến ${p.name}`)}
                          className="rounded-xl bg-card border border-border p-3 text-center hover:border-primary cursor-pointer transition"
                        >
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-indigo-500 mx-auto mb-1.5 grid place-items-center text-white text-[11px] font-bold">{initials(p.name)}</div>
                          <div className="text-[11.5px] font-semibold truncate">{p.name}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{p.device}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-2 text-center">MVP: mô phỏng AirDrop bằng UI — phiên bản tiếp theo sẽ tích hợp Web NFC + BLE.</p>
              </SectionCard>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
