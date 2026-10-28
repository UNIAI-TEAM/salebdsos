import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createFileRecord, getFileSignedUrl } from "@/lib/file.functions";
import { toast } from "sonner";
import { Paperclip, Download } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  UserPlus, MessageSquare, Phone, FileSignature, Banknote, Landmark, Ticket,
  FileText, BellRing, CalendarClock, Wallet,
} from "lucide-react";
import { getCustomer360 } from "@/lib/customer-360.functions";
import type { C360Kind } from "@/lib/customer-360";
import { useAuth } from "@/hooks/use-auth";

const META: Record<C360Kind, { icon: any; label: string }> = {
  lead: { icon: UserPlus, label: "Gửi thông tin" },
  message: { icon: MessageSquare, label: "Tin nhắn" },
  call: { icon: Phone, label: "Cuộc gọi" },
  contract: { icon: FileSignature, label: "Hợp đồng" },
  installment: { icon: Banknote, label: "Thu tiền" },
  payment: { icon: Landmark, label: "Ngân hàng" },
  event: { icon: Ticket, label: "Sự kiện" },
  file: { icon: FileText, label: "Tài liệu" },
  nurture: { icon: BellRing, label: "Nhắc tự động" },
  appointment: { icon: CalendarClock, label: "Lịch gặp" },
  transaction: { icon: Wallet, label: "Giao dịch" },
};
const vnd = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n)) + " đ";
const dt = (s: string) => new Date(s).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });

export function Customer360({ tenantId, id }: { tenantId: string; id: string }) {
  const { user } = useAuth();
  const fn = useServerFn(getCustomer360);
  const q = useQuery({ queryKey: ["customer-360", tenantId, id], queryFn: () => fn({ data: { tenantId, id } }) });
  const [filter, setFilter] = useState<C360Kind | "all">("all");
  const qc = useQueryClient();
  const createRec = useServerFn(createFileRecord);
  const signUrl = useServerFn(getFileSignedUrl);
  const [busy, setBusy] = useState(false);
  const upload = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) return toast.error("Tệp vượt 20 MB");
    setBusy(true);
    try {
      if (!user) throw new Error("Cần đăng nhập");
      const path = `${tenantId}/${user.id}/customers/${id}/${crypto.randomUUID()}_${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const { error } = await supabase.storage.from("crm-private").upload(path, file, { contentType: file.type || undefined });
      if (error) throw error;
      await createRec({ data: { tenantId, bucket: "crm-private", path, name: file.name, size: file.size, mime: file.type || null, folder: "Khách hàng", related_type: "customer", related_id: id } as any });
      toast.success("Đã đính kèm tệp");
      qc.invalidateQueries({ queryKey: ["customer-360", tenantId, id] });
    } catch (e: any) { toast.error(e.message ?? "Không tải được tệp"); } finally { setBusy(false); }
  };
  const download = async (fid: string) => {
    try { const r = await signUrl({ data: { id: fid } }); window.open(r.url, "_blank", "noopener"); }
    catch (e: any) { toast.error(e.message ?? "Không tải được"); }
  };
  if (q.isLoading) return <div className="text-sm text-muted-foreground py-8 text-center">Đang tải hồ sơ 360°…</div>;
  if (q.error || !q.data) return <div className="text-sm text-destructive py-8 text-center">Không tải được hồ sơ 360°.</div>;
  const { summary: s, timeline } = q.data;
  const kinds = [...new Set(timeline.map((e) => e.kind))] as C360Kind[];
  const rows = filter === "all" ? timeline : timeline.filter((e) => e.kind === filter);
  const cells = [
    ["Giá trị HĐ", vnd(s.contractValue)], ["Đã thu", vnd(s.paid)], ["Còn phải thu", vnd(s.outstanding)],
    ["Lần gửi thông tin", String(s.leads)], ["Tin nhắn", String(s.messages)], ["Cuộc gọi", String(s.calls)],
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {cells.map(([l, v]) => (
          <div key={l} className="rounded-xl border border-border bg-card p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{l}</div>
            <div className="mt-1 font-semibold tabular-nums text-sm">{v}</div>
          </div>
        ))}
      </div>
      {s.sources.length > 0 && (
        <div className="text-xs text-muted-foreground">Nguồn: {s.sources.join(" · ")}
          {s.lastInboundAt && <> · Khách nhắn gần nhất {dt(s.lastInboundAt)}</>}</div>
      )}
      <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-1.5 overflow-x-auto pb-1">
        {(["all", ...kinds] as const).map((k) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${filter === k ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
            {k === "all" ? `Tất cả (${timeline.length})` : META[k].label}
          </button>
        ))}
      </div>
        <label className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs cursor-pointer hover:bg-muted ${busy ? "opacity-50 pointer-events-none" : ""}`}>
          <Paperclip className="h-3.5 w-3.5" />{busy ? "Đang tải…" : "Đính kèm tệp"}
          <input type="file" className="hidden" onChange={(ev) => { const f = ev.target.files?.[0]; if (f) upload(f); ev.target.value = ""; }} />
        </label>
      </div>
      <ol className="relative border-l border-border ml-3 space-y-3">
        {rows.length === 0 && <li className="pl-6 text-sm text-muted-foreground">Chưa có hoạt động.</li>}
        {rows.map((e) => {
          const M = META[e.kind];
          return (
            <li key={e.id} className="pl-6 relative">
              <span className="absolute -left-3 top-1 grid h-6 w-6 place-items-center rounded-full border border-border bg-card">
                <M.icon className="h-3.5 w-3.5 text-primary" />
              </span>
              <div className="rounded-lg border border-border bg-card px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium">{e.title}</div>
                  <div className="text-[11px] text-muted-foreground shrink-0 tabular-nums">{dt(e.at)}</div>
                </div>
                {e.amount ? <div className="text-sm tabular-nums text-primary">{vnd(e.amount)}</div> : null}
                {e.detail && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-3 whitespace-pre-line">{e.detail}</div>}
                {e.kind === "file" && e.link && (
                  <button onClick={() => { if (e.link) download(e.link); }} className="mt-1 inline-flex items-center gap-1 text-xs text-primary"><Download className="h-3.5 w-3.5" />Tải xuống</button>
                )}
                {e.kind === "call" && e.link && <audio controls src={e.link} className="mt-2 h-8 w-full" />}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
