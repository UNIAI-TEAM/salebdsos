import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/ui";
import {
  Radio, Wifi, Smartphone, Laptop, Tablet, Watch, RefreshCw, Settings2, Shield,
  Check, X, Clock, Send, Inbox, BadgeCheck, Eye, EyeOff, Users2,
  AlertCircle, IdCard, Trash2, ExternalLink, Copy, Ruler, StickyNote, User2,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import {
  listAirdropShares, airdropStats, createAirdropShare, deleteAirdropShare, getAirdropCards,
} from "@/lib/airdrop.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/airdrop")({ component: AirdropPage });

type CardBrief = {
  id: string; slug: string; display_name: string | null;
  title: string | null; company: string | null;
  avatar_url: string | null; is_published: boolean | null;
} | null;

type ShareRow = {
  id: string; device_name: string; device_kind: DeviceKind;
  direction: "sent" | "received"; status: "pending" | "delivered" | "declined" | "canceled";
  recipient_name: string | null; created_at: string;
  distance_m: number | null; notes: string | null; card_id: string | null;
  card?: CardBrief;
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s trước`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

type DeviceKind = "phone" | "tablet" | "laptop" | "watch";
type Device = {
  id: string; name: string; owner: string; kind: DeviceKind;
  distance: string; tone: string;
};

const DEVICES: Device[] = [
  { id: "d1", name: "iPhone của Linh", owner: "Nguyễn Thuỳ Linh", kind: "phone", distance: "0.5 m", tone: "from-rose-400 to-pink-500" },
  { id: "d2", name: "MacBook Pro", owner: "Trần Quang Huy", kind: "laptop", distance: "1.2 m", tone: "from-blue-400 to-indigo-500" },
  { id: "d3", name: "iPad Air", owner: "Lê Minh Châu", kind: "tablet", distance: "1.8 m", tone: "from-amber-400 to-orange-500" },
  { id: "d4", name: "Galaxy S24", owner: "Phạm Hoài Nam", kind: "phone", distance: "2.4 m", tone: "from-emerald-400 to-teal-500" },
  { id: "d5", name: "Apple Watch", owner: "Đặng Quỳnh Anh", kind: "watch", distance: "3.0 m", tone: "from-violet-400 to-purple-500" },
  { id: "d6", name: "Pixel 8 Pro", owner: "Hoàng Bảo Long", kind: "phone", distance: "3.7 m", tone: "from-cyan-400 to-blue-500" },
];

const DEVICE_ICON: Record<DeviceKind, typeof Smartphone> = {
  phone: Smartphone, tablet: Tablet, laptop: Laptop, watch: Watch,
};

type Status = "idle" | "requesting" | "sending" | "delivered" | "declined";
type Transfer = { id: string; device: Device; status: Status; progress: number; startedAt: number };

const STATUS_TEXT: Record<Status, string> = {
  idle: "Chờ", requesting: "Đang chờ chấp nhận…", sending: "Đang gửi danh thiếp…",
  delivered: "Đã nhận", declined: "Bị từ chối",
};
const STATUS_TONE: Record<Status, string> = {
  idle: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  requesting: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  sending: "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
  delivered: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  declined: "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
};


const HISTORY_EMPTY: ShareRow[] = [];

function AirdropPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const [discovering, setDiscovering] = useState(true);
  const [visibility, setVisibility] = useState<"all" | "contacts" | "off">("all");
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [history, setHistory] = useState<ShareRow[]>(HISTORY_EMPTY);
  const [stats, setStats] = useState({ sent: 0, received: 0, delivered: 0, total: 0, rate: 0 });
  const [filter, setFilter] = useState<"all" | "sent" | "received">("all");
  const [cardMap, setCardMap] = useState<Record<string, NonNullable<CardBrief>>>({});
  const [detailId, setDetailId] = useState<string | null>(null);

  const list = useServerFn(listAirdropShares);
  const statsFn = useServerFn(airdropStats);
  const create = useServerFn(createAirdropShare);
  const remove = useServerFn(deleteAirdropShare);
  const fetchCards = useServerFn(getAirdropCards);

  const refresh = useCallback(async () => {
    if (!tenantId) return;
    try {
      const [h, s] = await Promise.all([
        list({ data: { tenantId, direction: filter, pageSize: 30 } }),
        statsFn({ data: { tenantId } }),
      ]);
      const rows = (h.items ?? []) as ShareRow[];
      setHistory(rows);
      setStats(s);
      const ids = Array.from(new Set(rows.map((r) => r.card_id).filter((x): x is string => !!x && !cardMap[x])));
      if (ids.length) {
        const res = await fetchCards({ data: { tenantId, ids } });
        setCardMap((prev) => {
          const next = { ...prev };
          for (const c of (res.items ?? []) as NonNullable<CardBrief>[]) next[c.id] = c;
          return next;
        });
      }
    } catch (e) {
      console.error(e);
    }
  }, [tenantId, filter, list, statsFn, fetchCards, cardMap]);

  useEffect(() => { refresh(); }, [refresh]);

  const persistShare = useCallback(async (d: Device, status: "delivered" | "declined") => {
    if (!tenantId) return;
    try {
      await create({
        data: {
          tenantId, device_name: d.name, device_kind: d.kind,
          direction: "sent", status, recipient_name: d.owner, distance_m: parseFloat(d.distance),
        },
      });
      refresh();
    } catch (e) {
      toast.error("Không thể lưu lịch sử chia sẻ");
      console.error(e);
    }
  }, [tenantId, create, refresh]);

  // Animate transfer progress
  useEffect(() => {
    const t = setInterval(() => {
      setTransfers((prev) =>
        prev.map((tr) => {
          if (tr.status === "requesting" && Date.now() - tr.startedAt > 1500) {
            return { ...tr, status: "sending", progress: 8 };
          }
          if (tr.status === "sending") {
            const np = Math.min(100, tr.progress + 7 + Math.random() * 6);
            const nextStatus: Status = np >= 100 ? "delivered" : "sending";
            if (nextStatus === "delivered") {
              persistShare(tr.device, "delivered");
            }
            return { ...tr, progress: np, status: nextStatus };
          }
          return tr;
        })
      );
    }, 350);
    return () => clearInterval(t);
  }, [persistShare]);

  const sendTo = (d: Device) => {
    if (transfers.some((t) => t.device.id === d.id && t.status !== "delivered" && t.status !== "declined")) return;
    setTransfers((p) => [
      { id: `${d.id}-${Date.now()}`, device: d, status: "requesting", progress: 0, startedAt: Date.now() },
      ...p,
    ]);
  };

  const cancel = (id: string) => setTransfers((p) => p.map((t) => {
    if (t.id === id) {
      persistShare(t.device, "declined");
      return { ...t, status: "declined" };
    }
    return t;
  }));

  const removeHistory = async (id: string) => {
    try { await remove({ data: { id } }); refresh(); }
    catch { toast.error("Không xoá được"); }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="AirDrop chia sẻ"
        sub="Gửi nhanh danh thiếp số tới thiết bị lân cận trong vài giây."
        action={
          <div className="flex items-center gap-2">
            <button className="h-9 px-3 rounded-xl border border-border bg-card text-[12.5px] font-semibold inline-flex items-center gap-1.5 hover:bg-muted/40">
              <Settings2 className="h-4 w-4" /> Cài đặt
            </button>
            <button onClick={() => setDiscovering((s) => !s)}
              className={["h-9 px-3 rounded-xl text-[12.5px] font-semibold inline-flex items-center gap-1.5 shadow-soft",
                discovering ? "bg-primary text-primary-foreground" : "bg-card border border-border"].join(" ")}>
              <RefreshCw className={["h-4 w-4", discovering ? "animate-spin" : ""].join(" ")} />
              {discovering ? "Đang quét…" : "Quét lại"}
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
        {/* Radar + devices */}
        <div className="space-y-5 min-w-0">
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-card overflow-hidden relative">
            <div className="px-6 pt-6 pb-2 flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-white/60 font-bold">Nearby Sharing</div>
                <h3 className="text-[18px] font-bold mt-1">Thiết bị lân cận</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className={["inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-2.5 py-1 rounded-full",
                  discovering ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/70"].join(" ")}>
                  <span className={["h-1.5 w-1.5 rounded-full", discovering ? "bg-emerald-400 animate-pulse" : "bg-white/50"].join(" ")} />
                  {discovering ? "Đang phát hiện" : "Tạm dừng"}
                </span>
              </div>
            </div>

            <Radar devices={DEVICES} active={discovering} onPick={sendTo} />

            <div className="px-6 pb-5 grid grid-cols-3 gap-3 text-center text-[11.5px]">
              <Stat label="Phát hiện" value={DEVICES.length.toString()} />
              <Stat label="Đã gửi hôm nay" value={stats.sent.toString()} />
              <Stat label="Tỷ lệ nhận" value={`${stats.rate}%`} />
            </div>
          </div>

          {/* Devices list */}
          <div className="rounded-2xl bg-card border border-border shadow-soft">
            <div className="p-4 flex items-center justify-between border-b border-border">
              <div>
                <h3 className="text-[14px] font-semibold">Thiết bị có thể gửi</h3>
                <p className="text-[11.5px] text-muted-foreground mt-0.5">Chạm vào thiết bị để gửi danh thiếp ngay lập tức</p>
              </div>
              <div className="inline-flex rounded-xl border border-border p-0.5 bg-muted/30 text-[11.5px] font-semibold">
                {[
                  { v: "all", l: "Mọi người", i: Eye },
                  { v: "contacts", l: "Liên hệ", i: Users2 },
                  { v: "off", l: "Tắt", i: EyeOff },
                ].map((o) => (
                  <button key={o.v} onClick={() => setVisibility(o.v as typeof visibility)}
                    className={["h-7 px-2.5 rounded-lg inline-flex items-center gap-1.5", visibility === o.v ? "bg-card shadow-soft text-foreground" : "text-muted-foreground"].join(" ")}>
                    <o.i className="h-3.5 w-3.5" /> {o.l}
                  </button>
                ))}
              </div>
            </div>

            <ul className="divide-y divide-border">
              {DEVICES.map((d) => {
                const Icon = DEVICE_ICON[d.kind];
                const inflight = transfers.find((t) => t.device.id === d.id && (t.status === "requesting" || t.status === "sending"));
                const done = transfers.find((t) => t.device.id === d.id && t.status === "delivered");
                return (
                  <li key={d.id} className="px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition">
                    <div className={["h-11 w-11 rounded-2xl bg-gradient-to-br grid place-items-center shrink-0 shadow-soft", d.tone].join(" ")}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-[13.5px] truncate">{d.name}</span>
                        <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="text-[11.5px] text-muted-foreground">{d.owner} · cách {d.distance}</div>
                    </div>
                    {inflight ? (
                      <div className="flex items-center gap-2">
                        <div className="w-32">
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-primary to-indigo-400 transition-all" style={{ width: `${inflight.progress}%` }} />
                          </div>
                          <div className="text-[10.5px] text-muted-foreground mt-0.5 text-right">{STATUS_TEXT[inflight.status]}</div>
                        </div>
                        <button onClick={() => cancel(inflight.id)} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></button>
                      </div>
                    ) : done ? (
                      <span className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg bg-emerald-50 text-emerald-700 text-[12px] font-semibold ring-1 ring-emerald-100">
                        <Check className="h-4 w-4" /> Đã nhận
                      </span>
                    ) : (
                      <button onClick={() => sendTo(d)} className="h-9 px-3.5 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold inline-flex items-center gap-1.5 hover:bg-primary/90 shadow-soft">
                        <Send className="h-3.5 w-3.5" /> Gửi
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Right: card to send + activity */}
        <div className="space-y-5">
          {/* Card preview */}
          <div className="rounded-2xl bg-card border border-border shadow-soft p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-semibold">Danh thiếp đang chia sẻ</h3>
              <button className="text-[11.5px] font-semibold text-primary hover:underline">Đổi</button>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 relative overflow-hidden">
              <div className="absolute -bottom-6 -right-6 h-28 w-28 rounded-full bg-primary/30 blur-2xl" />
              <div className="flex items-center gap-3 relative">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 grid place-items-center">
                  <IdCard className="h-6 w-6 text-white/80" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <div className="font-bold text-[14px]">Nguyễn Văn A</div>
                    <BadgeCheck className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-[11px] text-white/70">Chuyên viên tư vấn BĐS cao cấp</div>
                  <div className="text-[11px] text-primary font-semibold">ABC Real Estate</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-[10.5px] text-white/60 relative">
                <div><div className="text-white font-semibold text-[11.5px]">0987 654 321</div>Hotline</div>
                <div><div className="text-white font-semibold text-[11.5px]">nguyenvana.nfc.vn</div>Profile</div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[11.5px] text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-emerald-600" /> Mã hoá end-to-end · Không lưu lịch sử bên ngoài
            </div>
          </div>

          {/* Live transfers */}
          <div className="rounded-2xl bg-card border border-border shadow-soft p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-semibold inline-flex items-center gap-1.5"><Radio className="h-4 w-4 text-primary" /> Đang truyền</h3>
              <span className="text-[11px] text-muted-foreground">{transfers.filter(t => t.status !== "delivered" && t.status !== "declined").length} hoạt động</span>
            </div>
            {transfers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-5 text-center text-[12.5px] text-muted-foreground">
                <Wifi className="h-6 w-6 mx-auto mb-2 text-muted-foreground/60" />
                Chưa có lượt gửi nào. Chọn một thiết bị bên cạnh để bắt đầu.
              </div>
            ) : (
              <ul className="space-y-2.5">
                {transfers.slice(0, 5).map((t) => (
                  <li key={t.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-center gap-2.5">
                      <div className={["h-8 w-8 rounded-lg bg-gradient-to-br grid place-items-center shrink-0", t.device.tone].join(" ")}>
                        {(() => { const I = DEVICE_ICON[t.device.kind]; return <I className="h-4 w-4 text-white" />; })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12.5px] font-semibold truncate">{t.device.name}</div>
                        <div className="text-[11px] text-muted-foreground">{t.device.owner}</div>
                      </div>
                      <span className={["inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold", STATUS_TONE[t.status]].join(" ")}>
                        {STATUS_TEXT[t.status]}
                      </span>
                    </div>
                    {(t.status === "sending" || t.status === "requesting") && (
                      <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary to-indigo-400 transition-all" style={{ width: `${t.status === "requesting" ? 4 : t.progress}%` }} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* History */}
          <div className="rounded-2xl bg-card border border-border shadow-soft p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-semibold">Lịch sử chia sẻ</h3>
              <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/30 text-[10.5px] font-semibold">
                {(["all", "sent", "received"] as const).map((v) => (
                  <button key={v} onClick={() => setFilter(v)}
                    className={["h-6 px-2 rounded-md", filter === v ? "bg-card shadow-soft" : "text-muted-foreground"].join(" ")}>
                    {v === "all" ? "Tất cả" : v === "sent" ? "Gửi" : "Nhận"}
                  </button>
                ))}
              </div>
            </div>
            {history.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-5 text-center text-[12px] text-muted-foreground">
                Chưa có lịch sử chia sẻ.
              </div>
            ) : (
              <ul className="space-y-3">
                {history.slice(0, 12).map((h) => (
                  <li key={h.id} className="flex items-center gap-3 group">
                    <div className={["h-8 w-8 rounded-lg grid place-items-center shrink-0",
                      h.direction === "sent" ? "bg-primary-soft text-primary" : "bg-emerald-50 text-emerald-600"].join(" ")}>
                      {h.direction === "sent" ? <Send className="h-4 w-4" /> : <Inbox className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-semibold truncate">{h.recipient_name ?? h.device_name}</div>
                      <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {timeAgo(h.created_at)} · {h.device_name}
                      </div>
                    </div>
                    {h.status === "delivered" ? (
                      <span className="text-[11px] font-semibold text-emerald-600 inline-flex items-center gap-0.5"><Check className="h-3.5 w-3.5" /> Nhận</span>
                    ) : h.status === "declined" ? (
                      <span className="text-[11px] font-semibold text-rose-600 inline-flex items-center gap-0.5"><AlertCircle className="h-3.5 w-3.5" /> Từ chối</span>
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-500">{h.status}</span>
                    )}
                    <button onClick={() => removeHistory(h.id)}
                      className="opacity-0 group-hover:opacity-100 h-7 w-7 grid place-items-center rounded-lg text-muted-foreground hover:bg-muted transition">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 ring-1 ring-white/10 py-2.5">
      <div className="text-[18px] font-bold leading-none">{value}</div>
      <div className="text-[10.5px] text-white/60 mt-1 uppercase tracking-wider font-semibold">{label}</div>
    </div>
  );
}

function Radar({ devices, active, onPick }: { devices: Device[]; active: boolean; onPick: (d: Device) => void }) {
  // place devices in concentric rings
  const rings = [
    { count: 2, r: 28 },
    { count: 2, r: 44 },
    { count: 2, r: 60 },
  ];
  const positioned: { d: Device; x: number; y: number }[] = [];
  let idx = 0;
  rings.forEach((ring) => {
    for (let i = 0; i < ring.count && idx < devices.length; i++, idx++) {
      const angle = (i / ring.count) * Math.PI * 2 + (ring.r * 0.07);
      const x = 50 + Math.cos(angle) * (ring.r * 0.78);
      const y = 50 + Math.sin(angle) * (ring.r * 0.78);
      positioned.push({ d: devices[idx], x, y });
    }
  });

  return (
    <div className="relative mx-auto my-4 aspect-square max-w-[440px] w-full">
      {/* Rings */}
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className="absolute rounded-full border border-white/10"
          style={{ inset: `${n * 8}%` }} />
      ))}
      {/* Sweep */}
      {active && (
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div className="absolute left-1/2 top-1/2 origin-left h-[2px] w-1/2 bg-gradient-to-r from-primary/80 via-primary/30 to-transparent radar-sweep" />
        </div>
      )}
      {/* Pulses */}
      {active && [0, 1, 2].map((i) => (
        <div key={i} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/40 radar-pulse"
          style={{ animationDelay: `${i * 1.1}s`, width: 60, height: 60 }} />
      ))}
      {/* Me */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-gradient-to-br from-primary to-indigo-500 grid place-items-center shadow-glow ring-4 ring-primary/30">
        <IdCard className="h-5 w-5 text-white" />
      </div>
      {/* Devices */}
      {positioned.map(({ d, x, y }) => {
        const Icon = DEVICE_ICON[d.kind];
        return (
          <button key={d.id} onClick={() => onPick(d)}
            className="absolute -translate-x-1/2 -translate-y-1/2 group"
            style={{ left: `${x}%`, top: `${y}%` }}>
            <div className={["h-11 w-11 rounded-2xl bg-gradient-to-br grid place-items-center shadow-soft ring-2 ring-white/20 group-hover:scale-110 group-hover:ring-primary transition", d.tone].join(" ")}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div className="mt-1.5 text-center">
              <div className="text-[10.5px] font-semibold whitespace-nowrap">{d.name}</div>
              <div className="text-[9.5px] text-white/60">{d.distance}</div>
            </div>
          </button>
        );
      })}

      <style>{`
        @keyframes radar-sweep { from { transform: rotate(0); } to { transform: rotate(360deg); } }
        @keyframes radar-pulse { 0% { width:60px; height:60px; opacity:.7; } 100% { width:340px; height:340px; opacity:0; } }
        .radar-sweep { animation: radar-sweep 3.2s linear infinite; }
        .radar-pulse { animation: radar-pulse 3.3s ease-out infinite; }
      `}</style>
    </div>
  );
}
