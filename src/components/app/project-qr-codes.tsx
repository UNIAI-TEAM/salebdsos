// Mã QR riêng cho từng dự án: tạo theo kênh, tải PNG, chia sẻ, xem lượt quét 30 ngày.
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { QrCode as QrIcon, Plus, Link2, Power, Trash2, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { QrCode } from "@/components/qr-code";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  QR_CHANNELS, listProjectQrCodes, createProjectQrCode, toggleProjectQrCode, deleteProjectQrCode,
} from "@/lib/project-qr.functions";
import { listCustomerEmails, sendProjectQrToEmail } from "@/lib/project-qr-send.functions";

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

  // Gửi QR cho khách qua email
  const [sendQrId, setSendQrId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const searchCustomers = useServerFn(listCustomerEmails);
  const sendQr = useServerFn(sendProjectQrToEmail);

  const suggestions = useQuery({
    queryKey: ["qr-send-customers", tenantId, search],
    queryFn: () => searchCustomers({ data: { tenantId, search: search.trim() || undefined } }),
    enabled: !!sendQrId,
  });

  const closeSend = () => {
    setSendQrId(null);
    setEmail(""); setCustomerName(""); setNote(""); setSearch("");
  };

  const doSend = useMutation({
    mutationFn: () =>
      sendQr({
        data: {
          qrId: sendQrId!,
          email: email.trim(),
          customerName: customerName.trim() || undefined,
          note: note.trim() || undefined,
          origin,
        },
      }),
    onSuccess: (r) => {
      const mailto = `mailto:${encodeURIComponent(r.email)}?subject=${encodeURIComponent(r.subject)}&body=${encodeURIComponent(r.body)}`;
      if (typeof window !== "undefined") window.location.href = mailto;
      toast.success("Đã ghi nhận và mở email gửi khách");
      closeSend();
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Không gửi được QR"),
  });

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
                  <Button variant="default" size="sm" className="col-span-2 gap-1.5"
                    disabled={!qr.is_active}
                    onClick={() => { closeSend(); setSendQrId(qr.id); }}>
                    <Mail className="h-3.5 w-3.5" /> Gửi QR qua email
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

      <Dialog open={!!sendQrId} onOpenChange={(o) => { if (!o) closeSend(); }}>
        <DialogContent className="max-h-[85vh] w-[calc(100vw-2rem)] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gửi mã QR cho khách hàng</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="qr-search">Chọn khách hàng có sẵn</Label>
              <Input id="qr-search" className="h-10" placeholder="Tìm theo tên hoặc email"
                value={search} onChange={(e) => setSearch(e.target.value)} />
              <div className="max-h-40 overflow-y-auto rounded-lg border border-border">
                {(suggestions.data ?? []).length === 0 ? (
                  <div className="p-3 text-[12.5px] text-muted-foreground">
                    Chưa có khách hàng nào có email. Anh/chị nhập email bên dưới.
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {(suggestions.data ?? []).map((c) => (
                      <li key={c.id}>
                        <button type="button"
                          className="flex min-h-11 w-full flex-col items-start justify-center px-3 py-2 text-left hover:bg-muted"
                          onClick={() => { setEmail(c.email ?? ""); setCustomerName(c.full_name ?? ""); }}>
                          <span className="truncate text-[13px] font-medium">{c.full_name}</span>
                          <span className="truncate text-[12px] text-muted-foreground">{c.email}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="qr-email">Email khách hàng</Label>
                <Input id="qr-email" type="email" className="h-10" placeholder="khach@email.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qr-name">Tên khách hàng</Label>
                <Input id="qr-name" className="h-10" placeholder="Tuỳ chọn"
                  value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qr-note">Lời nhắn</Label>
              <Textarea id="qr-note" rows={3} placeholder="Nội dung gửi khách (tuỳ chọn)"
                value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
              <p className="text-[12px] text-muted-foreground">
                Hệ thống ghi nhận lượt gửi vào hành trình khách hàng và mở email đã soạn sẵn kèm link QR.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" className="min-h-11" onClick={closeSend}>Huỷ</Button>
            <Button className="min-h-11 gap-1.5"
              disabled={doSend.isPending || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())}
              onClick={() => doSend.mutate()}>
              <Send className="h-4 w-4" /> {doSend.isPending ? "Đang gửi…" : "Gửi QR"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
