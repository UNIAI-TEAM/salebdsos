import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRightLeft, History } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getHandoverData, runHandover } from "@/lib/handover.functions";

export const Route = createFileRoute("/_app/handover")({
  head: () => ({
    meta: [
      { title: "Bàn giao khách hàng — SaleBDS OS" },
      { name: "description", content: "Bàn giao khách của Sale nghỉ việc cho Sale khác, có lịch sử đầy đủ." },
      { property: "og:title", content: "Bàn giao khách hàng — SaleBDS OS" },
      { property: "og:description", content: "Bàn giao khách của Sale nghỉ việc cho Sale khác, có lịch sử đầy đủ." },
    ],
  }),
  component: HandoverPage,
});

const LABELS: Record<string, string> = { leads: "khách", customers: "hồ sơ", deals: "cơ hội", conversations: "hội thoại", appointments: "lịch hẹn" };

function HandoverPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const qc = useQueryClient();
  const fGet = useServerFn(getHandoverData);
  const fRun = useServerFn(runHandover);
  const q = useQuery({ queryKey: ["handover", tenantId], queryFn: () => fGet({ data: { tenantId: tenantId! } }), enabled: !!tenantId });
  const [from, setFrom] = useState("");
  const [to, setTo] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const run = useMutation({
    mutationFn: () => fRun({ data: { tenantId: tenantId!, fromUserId: from, toUserIds: to, reason } }),
    onSuccess: (r) => {
      toast.success(`Đã bàn giao ${r.counts.leads} khách`);
      setFrom(""); setTo([]); setReason("");
      qc.invalidateQueries({ queryKey: ["handover", tenantId] });
      qc.invalidateQueries({ queryKey: ["departments", tenantId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Không bàn giao được"),
  });

  const d = q.data;
  const people = d?.people ?? [];
  const src = people.find((p) => p.user_id === from);

  return (
    <div className="space-y-6">
      <PageHeader title="Bàn giao khách hàng" sub="Chuyển khách đang theo của Sale nghỉ việc sang Sale khác. Hợp đồng và hoa hồng đã có vẫn giữ cho Sale cũ." />
      {q.isLoading && <div className="text-sm text-muted-foreground">Đang tải…</div>}
      {d && !d.allowed && <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Chỉ quản trị viên hoặc trưởng phòng mới bàn giao được khách.</div>}

      {d?.allowed && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <div>
              <div className="mb-1.5 text-sm font-medium">Sale nghỉ / bàn giao</div>
              <Select value={from} onValueChange={(v) => { setFrom(v); setTo((t) => t.filter((x) => x !== v)); }}>
                <SelectTrigger><SelectValue placeholder="Chọn Sale" /></SelectTrigger>
                <SelectContent>
                  {people.map((p) => <SelectItem key={p.user_id} value={p.user_id}>{p.name} · {p.openLeads} khách đang theo</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="mb-1.5 text-sm font-medium">Sale nhận (chọn 1 hoặc nhiều — chia đều theo khối lượng)</div>
              <div className="flex flex-wrap gap-2">
                {people.filter((p) => p.user_id !== from).map((p) => {
                  const on = to.includes(p.user_id);
                  return (
                    <button key={p.user_id} type="button" onClick={() => setTo((t) => on ? t.filter((x) => x !== p.user_id) : [...t, p.user_id])}
                      className={`rounded-full border px-3 py-2 text-sm ${on ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
                      {p.name} <span className="text-muted-foreground">({p.openLeads})</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <Textarea placeholder="Lý do (VD: nghỉ việc từ 01/11)" value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="text-xs text-muted-foreground">Chuyển: khách đang theo, hồ sơ khách, cơ hội đang mở, hội thoại và lịch hẹn sắp tới.</div>
            <Button className="w-full" disabled={!from || !to.length || run.isPending}
              onClick={() => confirm(`Bàn giao ${src?.openLeads ?? 0} khách của ${src?.name}?`) && run.mutate()}>
              <ArrowRightLeft className="h-4 w-4" />{run.isPending ? "Đang bàn giao…" : "Bàn giao"}
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2 font-medium"><History className="h-4 w-4" />Lịch sử bàn giao</div>
            {d.history.length === 0 && <div className="text-sm text-muted-foreground">Chưa có lần bàn giao nào.</div>}
            <ul className="space-y-2">
              {d.history.map((h: any) => (
                <li key={h.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium">{h.from_name} → {h.to_names.join(", ")}</div>
                    <div className="text-[11px] text-muted-foreground shrink-0 tabular-nums">{new Date(h.created_at).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}</div>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {Object.entries(h.counts ?? {}).filter(([, v]) => Number(v) > 0).map(([k, v]) => `${v} ${LABELS[k] ?? k}`).join(" · ") || "Không có dữ liệu cần chuyển"}
                  </div>
                  {h.reason && <div className="mt-1 text-xs">{h.reason}</div>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
