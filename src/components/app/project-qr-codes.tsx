// Mã QR riêng cho từng dự án: tạo theo kênh, tải PNG, chia sẻ, xem lượt quét 30 ngày.
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { QrCode as QrIcon, Plus, Link2, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { QrCode } from "@/components/qr-code";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  QR_CHANNELS, listProjectQrCodes, createProjectQrCode, toggleProjectQrCode, deleteProjectQrCode,
} from "@/lib/project-qr.functions";

export function ProjectQrCodes({ projectId, tenantId, projectName }: {
  projectId: string; tenantId: string; projectName?: string;
}) {
  const qc = useQueryClient();
  const list = useServerFn(listProjectQrCodes);
  const create = useServerFn(createProjectQrCode);
  const toggle = useServerFn(toggleProjectQrCode);
  const remove = useServerFn(deleteProjectQrCode);

  const [channel, setChannel] = useState<string>("general");
  const [label, setLabel] = useState("");
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const key = ["project-qr", tenantId, projectId];

  const codes = useQuery({
    queryKey: key,
    queryFn: () => list({ data: { tenantId, projectId } }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const addQr = useMutation({
    mutationFn: () => create({ data: { tenantId, projectId, channel, label: label.trim() || null } }),
    onSuccess: () => { setLabel(""); toast.success("Đã tạo mã QR"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Không tạo được mã QR"),
  });

  const items = codes.data ?? [];

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <QrIcon className="h-4 w-4 text-primary" />
        <span className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          Mã QR dự án
        </span>
      </div>

      <div className="rounded-xl border border-border p-3 space-y-2">
        <div className="flex gap-2">
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="h-10 flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {QR_CHANNELS.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input className="h-10 flex-1" placeholder="Ghi chú (tuỳ chọn)" value={label}
            onChange={(e) => setLabel(e.target.value)} maxLength={120} />
        </div>
        <Button className="w-full gap-1.5" disabled={addQr.isPending} onClick={() => addQr.mutate()}>
          <Plus className="h-4 w-4" /> Tạo mã QR mới
        </Button>
      </div>

      {codes.isLoading ? (
        <div className="text-[13px] text-muted-foreground">Đang tải…</div>
      ) : items.length === 0 ? (
        <div className="text-[13px] text-muted-foreground">
          Chưa có mã QR. Tạo mã để gửi cho khách xem dự án.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((qr) => {
            const url = `${origin}/api/public/pq/${qr.code}`;
            const channelLabel = QR_CHANNELS.find((c) => c.value === qr.channel)?.label ?? qr.channel;
            return (
              <li key={qr.id} className="rounded-xl border border-border p-3 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold truncate">
                      {qr.label || channelLabel}
                    </div>
                    <div className="text-[11.5px] text-muted-foreground truncate">
                      {channelLabel} · {qr.scans_30d} lượt quét · {qr.leads_30d} khách để lại thông tin (30 ngày)
                    </div>
                  </div>
                  <Badge variant={qr.is_active ? "default" : "secondary"} className="text-[10.5px]">
                    {qr.is_active ? "Đang bật" : "Đã tắt"}
                  </Badge>
                </div>

                {qr.is_active && (
                  <div className="flex justify-center">
                    <QrCode value={url} size={180}
                      label={projectName ? `${projectName} · ${channelLabel}` : channelLabel}
                      filename={`qr-${qr.code}`} />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5"
                    onClick={() => { void navigator.clipboard.writeText(url); toast.success("Đã copy link QR"); }}>
                    <Link2 className="h-3.5 w-3.5" /> Copy link
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5"
                    onClick={() => window.open(
                      `https://zalo.me/share?u=${encodeURIComponent(url)}&t=${encodeURIComponent(projectName ?? "Dự án")}`,
                      "_blank", "noopener,noreferrer",
                    )}>
                    Chia sẻ Zalo
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1.5"
                    onClick={async () => {
                      await toggle({ data: { id: qr.id, isActive: !qr.is_active } });
                      invalidate();
                    }}>
                    <Power className="h-3.5 w-3.5" /> {qr.is_active ? "Tắt mã" : "Bật lại"}
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-destructive"
                    onClick={async () => {
                      await remove({ data: { id: qr.id } });
                      toast.success("Đã xoá mã QR");
                      invalidate();
                    }}>
                    <Trash2 className="h-3.5 w-3.5" /> Xoá
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
