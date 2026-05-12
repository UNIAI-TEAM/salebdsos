// NFC URL & QR management page (in-app, requires login).
// Lists short codes for the user's cards, lets them mint new ones, and
// renders printable QR for each.
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  listShortCodes,
  createShortCode,
  toggleShortCode,
} from "@/lib/tracking.functions";
import { QrCode } from "@/components/qr-code";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Copy, Power, Plus, Radio, QrCode as QrIcon, Link2, Share2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/nfc-codes")({
  component: NfcCodesPage,
});

function NfcCodesPage() {
  const list = useServerFn(listShortCodes);
  const create = useServerFn(createShortCode);
  const toggle = useServerFn(toggleShortCode);
  const qc = useQueryClient();

  const cards = useQuery({
    queryKey: ["my-cards"],
    queryFn: async () => {
      const { data } = await supabase
        .from("digital_cards")
        .select("id, slug, display_name")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const codes = useQuery({
    queryKey: ["short-codes"],
    queryFn: () => list({ data: {} }),
  });

  const [cardId, setCardId] = useState<string>("");
  const [source, setSource] = useState<"nfc" | "qr" | "link" | "social">("nfc");
  const [label, setLabel] = useState("");

  const createMut = useMutation({
    mutationFn: async () => create({ data: { cardId, source, label: label || undefined } }),
    onSuccess: () => {
      toast.success("Đã tạo mã");
      setLabel("");
      qc.invalidateQueries({ queryKey: ["short-codes"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Lỗi"),
  });

  const toggleMut = useMutation({
    mutationFn: (v: { code: string; isActive: boolean }) => toggle({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["short-codes"] }),
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const sourceMeta: Record<string, { icon: any; color: string; label: string }> = {
    nfc: { icon: Radio, color: "bg-blue-500/10 text-blue-600", label: "NFC Tap" },
    qr: { icon: QrIcon, color: "bg-violet-500/10 text-violet-600", label: "QR Code" },
    link: { icon: Link2, color: "bg-emerald-500/10 text-emerald-600", label: "Direct Link" },
    social: { icon: Share2, color: "bg-pink-500/10 text-pink-600", label: "Social Bio" },
  };

  return (
    <div className="space-y-6">
      <PageHeader title="NFC & QR — quản lý mã" sub="Tạo và quản lý link rút gọn cho thẻ NFC, QR code, link trực tiếp và bio mạng xã hội." />

      <SectionCard>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <Label className="text-xs">Danh thiếp</Label>
            <Select value={cardId} onValueChange={setCardId}>
              <SelectTrigger><SelectValue placeholder="Chọn card" /></SelectTrigger>
              <SelectContent>
                {(cards.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Nguồn</Label>
            <Select value={source} onValueChange={(v) => setSource(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nfc">NFC Tap</SelectItem>
                <SelectItem value="qr">QR Code</SelectItem>
                <SelectItem value="link">Direct Link</SelectItem>
                <SelectItem value="social">Social Bio</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Nhãn (tuỳ chọn)</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="VD: Thẻ in lô #1" />
          </div>
          <Button onClick={() => createMut.mutate()} disabled={!cardId || createMut.isPending}>
            <Plus className="h-4 w-4 mr-1" /> Tạo mã
          </Button>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(codes.data ?? []).map((c: any) => {
          const meta = sourceMeta[c.source] ?? sourceMeta.link;
          const Icon = meta.icon;
          const url = `${origin}/api/public/t/${c.code}`;
          return (
            <SectionCard key={c.code}>
              <div className="flex items-start gap-4">
                <QrCode value={url} size={140} filename={`qr-${c.code}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${meta.color}`}>
                      <Icon className="h-3 w-3" /> {meta.label}
                    </span>
                    {!c.is_active && <Badge variant="secondary">Tạm tắt</Badge>}
                  </div>
                  <div className="mt-2 font-mono text-sm font-semibold">/{c.code}</div>
                  {c.label && <div className="text-xs text-muted-foreground">{c.label}</div>}
                  <div className="mt-2 text-[11px] break-all text-muted-foreground">{url}</div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => {
                      navigator.clipboard.writeText(url);
                      toast.success("Đã sao chép");
                    }}>
                      <Copy className="h-3 w-3 mr-1" /> Copy
                    </Button>
                    <Button size="sm" variant="outline" onClick={() =>
                      toggleMut.mutate({ code: c.code, isActive: !c.is_active })
                    }>
                      <Power className="h-3 w-3 mr-1" /> {c.is_active ? "Tắt" : "Bật"}
                    </Button>
                  </div>
                </div>
              </div>
            </SectionCard>
          );
        })}
        {codes.data && codes.data.length === 0 && (
          <SectionCard><div className="text-sm text-muted-foreground text-center py-6">Chưa có mã nào. Tạo mã đầu tiên ở trên.</div></SectionCard>
        )}
      </div>
    </div>
  );
}
