import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard, KpiCard } from "@/components/app/ui";
import {
  Radio, QrCode as QrIcon, Plus, MousePointerClick, Eye, BarChart3,
  Edit3, Copy, Trash2, ExternalLink, Loader2, Power, PowerOff,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  listDynamicQRs, upsertDynamicQR, deleteDynamicQR, getShareAnalytics,
} from "@/lib/sharing.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { QrCode } from "@/components/qr-code";

export const Route = createFileRoute("/_app/dynamic-qr")({ component: DynamicQRPage });

type Row = Awaited<ReturnType<typeof listDynamicQRs>>[number];

function DynamicQRPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const qc = useQueryClient();

  const fnList = useServerFn(listDynamicQRs);
  const fnUpsert = useServerFn(upsertDynamicQR);
  const fnDelete = useServerFn(deleteDynamicQR);
  const fnStats = useServerFn(getShareAnalytics);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Row> | null>(null);
  const [previewCode, setPreviewCode] = useState<string | null>(null);

  const listQ = useQuery({
    queryKey: ["dynamic-qrs", tenantId],
    queryFn: () => fnList({ data: { tenantId: tenantId! } }),
    enabled: !!tenantId,
  });

  const statsQ = useQuery({
    queryKey: ["share-analytics", tenantId, 30],
    queryFn: () => fnStats({ data: { tenantId: tenantId!, days: 30 } }),
    enabled: !!tenantId,
  });

  const upsertM = useMutation({
    mutationFn: (p: any) => fnUpsert({ data: { ...p, tenant_id: tenantId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dynamic-qrs", tenantId] });
      setEditorOpen(false);
      setEditing(null);
      toast.success("Đã lưu QR động");
    },
    onError: (e: any) => toast.error(e?.message || "Lỗi khi lưu"),
  });

  const delM = useMutation({
    mutationFn: (id: string) => fnDelete({ data: { id, tenantId: tenantId! } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dynamic-qrs", tenantId] });
      toast.success("Đã xoá");
    },
  });

  const toggleM = useMutation({
    mutationFn: (r: Row) => fnUpsert({ data: {
      id: r.id, tenant_id: tenantId!, label: r.label || "", target_url: r.target_url, is_active: !r.is_active,
    }}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dynamic-qrs", tenantId] }),
  });

  const total = listQ.data?.length || 0;
  const active = listQ.data?.filter((r) => r.is_active).length || 0;
  const totalScans = listQ.data?.reduce((s, r) => s + (r.scan_count || 0), 0) || 0;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const linkOf = (code: string) => `${origin}/api/public/q/${code}`;
  const previewRow = useMemo(
    () => listQ.data?.find((r) => r.short_code === previewCode) || null,
    [listQ.data, previewCode]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dynamic QR"
        sub="Tạo QR động — đổi điểm đến bất kỳ lúc nào, đo lường theo chiến dịch."
        action={
          <Button size="sm" onClick={() => { setEditing({}); setEditorOpen(true); }}>
            <Plus className="h-4 w-4" /> Tạo QR động
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={QrIcon} label="QR đang chạy" value={String(active)} delta={0} tone="primary" />
        <KpiCard icon={MousePointerClick} label="Tổng lượt quét" value={totalScans.toLocaleString("vi-VN")} delta={0} tone="blue" />
        <KpiCard icon={Eye} label="Tương tác (30d)" value={(statsQ.data?.total ?? 0).toLocaleString("vi-VN")} delta={0} tone="indigo" />
        <KpiCard icon={BarChart3} label="Tổng QR" value={String(total)} delta={0} tone="green" />
      </div>

      <SectionCard title="Danh sách QR động">
        {listQ.isLoading ? (
          <div className="py-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : total === 0 ? (
          <div className="py-12 text-center">
            <div className="h-12 w-12 mx-auto rounded-2xl bg-primary-soft text-primary grid place-items-center mb-3"><QrIcon className="h-6 w-6" /></div>
            <div className="text-[14px] font-semibold">Chưa có QR động nào</div>
            <div className="text-[12.5px] text-muted-foreground mt-1">Tạo QR đầu tiên để chia sẻ link và đo lường lượt quét.</div>
            <Button size="sm" className="mt-4" onClick={() => { setEditing({}); setEditorOpen(true); }}>
              <Plus className="h-4 w-4" /> Tạo QR động
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="text-left text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-2.5 font-semibold">Nhãn</th>
                  <th className="py-2.5 font-semibold">Mã ngắn</th>
                  <th className="py-2.5 font-semibold">Đích đến</th>
                  <th className="py-2.5 font-semibold text-right">Lượt quét</th>
                  <th className="py-2.5 font-semibold">Trạng thái</th>
                  <th className="py-2.5 font-semibold text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="text-[12.5px]">
                {listQ.data!.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-primary-soft text-primary grid place-items-center"><Radio className="h-4 w-4" /></div>
                        <div className="font-semibold">{r.label || "—"}</div>
                      </div>
                    </td>
                    <td className="py-3 font-mono text-[11.5px]">{r.short_code}</td>
                    <td className="py-3 text-muted-foreground truncate max-w-[280px]">{r.target_url}</td>
                    <td className="py-3 text-right font-semibold tabular-nums">{(r.scan_count || 0).toLocaleString("vi-VN")}</td>
                    <td className="py-3">
                      <span className={["text-[10.5px] px-2 py-0.5 rounded-md font-semibold",
                        r.is_active ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" : "bg-slate-100 text-slate-600"].join(" ")}>
                        {r.is_active ? "Đang chạy" : "Tạm dừng"}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button title="Xem QR" className="h-7 w-7 rounded-md hover:bg-muted grid place-items-center" onClick={() => setPreviewCode(r.short_code)}><QrIcon className="h-3.5 w-3.5" /></button>
                        <button title="Copy link" className="h-7 w-7 rounded-md hover:bg-muted grid place-items-center" onClick={() => { navigator.clipboard.writeText(linkOf(r.short_code)); toast.success("Đã copy"); }}><Copy className="h-3.5 w-3.5" /></button>
                        <a title="Mở" href={linkOf(r.short_code)} target="_blank" rel="noreferrer" className="h-7 w-7 rounded-md hover:bg-muted grid place-items-center"><ExternalLink className="h-3.5 w-3.5" /></a>
                        <button title={r.is_active ? "Tạm dừng" : "Kích hoạt"} className="h-7 w-7 rounded-md hover:bg-muted grid place-items-center" onClick={() => toggleM.mutate(r)}>
                          {r.is_active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                        </button>
                        <button title="Sửa" className="h-7 w-7 rounded-md hover:bg-muted grid place-items-center" onClick={() => { setEditing(r); setEditorOpen(true); }}><Edit3 className="h-3.5 w-3.5" /></button>
                        <button title="Xoá" className="h-7 w-7 rounded-md hover:bg-rose-50 text-rose-600 grid place-items-center" onClick={() => { if (confirm("Xoá QR này?")) delM.mutate(r.id); }}><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Editor dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Sửa QR động" : "Tạo QR động"}</DialogTitle>
            <DialogDescription>QR động cho phép đổi điểm đến mà không cần in lại mã.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nhãn / Chiến dịch</Label>
              <Input
                className="mt-1.5"
                placeholder="VD: Vinhomes Ocean Park — Mở bán Q1"
                defaultValue={editing?.label || ""}
                onChange={(e) => setEditing((p) => ({ ...(p || {}), label: e.target.value }))}
              />
            </div>
            <div>
              <Label>URL đích</Label>
              <Input
                className="mt-1.5"
                placeholder="https://..."
                defaultValue={editing?.target_url || ""}
                onChange={(e) => setEditing((p) => ({ ...(p || {}), target_url: e.target.value }))}
              />
              <p className="text-[11px] text-muted-foreground mt-1">Có thể dùng link card (/c/slug), trang dự án hoặc bất kỳ URL nào.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Huỷ</Button>
            <Button
              onClick={() => upsertM.mutate({
                id: editing?.id, label: editing?.label, target_url: editing?.target_url, is_active: editing?.is_active ?? true,
              })}
              disabled={upsertM.isPending || !editing?.label || !editing?.target_url}
            >
              {upsertM.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR preview dialog */}
      <Dialog open={!!previewCode} onOpenChange={(o) => !o && setPreviewCode(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{previewRow?.label || "QR"}</DialogTitle>
            <DialogDescription className="font-mono text-[11px] break-all">{previewCode && linkOf(previewCode)}</DialogDescription>
          </DialogHeader>
          {previewCode && origin && (
            <div className="grid place-items-center">
              <QrCode value={linkOf(previewCode)} size={260} filename={`qr-${previewCode}`} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
