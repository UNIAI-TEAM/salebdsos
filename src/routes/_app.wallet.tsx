import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Wallet, Apple, Smartphone, Plus, Sparkles, Eye, Radio, Pencil, Trash2, ExternalLink,
} from "lucide-react";
import { PageHeader, KpiCard } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import {
  listWalletCards, listCardsForWallet, walletStats,
  createWalletCard, updateWalletCard, deleteWalletCard,
} from "@/lib/wallet.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/wallet")({ component: WalletPage });

type Platform = "apple" | "google";

type WalletRow = {
  id: string;
  card_id: string;
  platform: Platform;
  serial_number: string | null;
  pass_url: string | null;
  install_count: number;
  last_updated_at: string | null;
  created_at: string;
  cards: {
    id: string;
    slug: string;
    display_name: string | null;
    title: string | null;
    company: string | null;
    avatar_url: string | null;
    theme: any;
    fields: any;
  } | null;
};

type FormState = {
  id?: string;
  card_id: string;
  platform: Platform;
  serial_number: string;
  pass_url: string;
};
const EMPTY: FormState = { card_id: "", platform: "apple", serial_number: "", pass_url: "" };

function fieldValue(fields: any, keys: string[]): string | null {
  if (!fields) return null;
  if (Array.isArray(fields)) {
    for (const f of fields) {
      const k = String(f?.key ?? f?.label ?? "").toLowerCase();
      if (keys.some((x) => k.includes(x))) return String(f?.value ?? "") || null;
    }
    return null;
  }
  if (typeof fields === "object") {
    for (const [k, v] of Object.entries(fields)) {
      if (keys.some((x) => k.toLowerCase().includes(x))) return v ? String(v) : null;
    }
  }
  return null;
}

function ApplePass({ w }: { w: WalletRow }) {
  const c = w.cards;
  const phone = fieldValue(c?.fields, ["phone", "sdt", "hotline"]);
  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-5 text-white relative overflow-hidden shadow-glow min-h-[200px]">
      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/30 blur-3xl" />
      <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <div className="text-[10.5px] uppercase tracking-widest text-white/60 truncate">{c?.company ?? "—"}</div>
            <div className="text-[20px] font-bold mt-1 truncate">{c?.display_name ?? "—"}</div>
            <div className="text-[12px] text-white/70 truncate">{c?.title ?? ""}</div>
          </div>
          <Apple className="h-7 w-7 text-white/80 shrink-0" />
        </div>
        <div className="mt-8 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-white/50">Liên hệ</div>
            <div className="text-[13px] font-mono truncate">{phone ?? "—"}</div>
          </div>
          <div className="h-14 w-14 rounded-lg bg-white p-1.5 grid place-items-center shrink-0">
            <div className="h-full w-full rounded" style={{
              backgroundImage: "linear-gradient(45deg, #000 25%, transparent 25%), linear-gradient(-45deg, #000 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #000 75%), linear-gradient(-45deg, transparent 75%, #000 75%)",
              backgroundSize: "8px 8px",
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function GooglePass({ w }: { w: WalletRow }) {
  const c = w.cards;
  const phone = fieldValue(c?.fields, ["phone", "sdt", "hotline"]);
  const email = fieldValue(c?.fields, ["email", "mail"]);
  const web = fieldValue(c?.fields, ["web", "site", "url"]);
  return (
    <div className="rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-5 text-white relative overflow-hidden shadow-glow min-h-[200px]">
      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <div className="text-[10.5px] uppercase tracking-widest text-white/70 truncate">{c?.company ?? "—"}</div>
            <div className="text-[20px] font-bold mt-1 truncate">{c?.display_name ?? "—"}</div>
            <div className="text-[12px] text-white/80 truncate">{c?.title ?? ""}</div>
          </div>
          <Smartphone className="h-7 w-7 text-white/80 shrink-0" />
        </div>
        <div className="mt-8 grid grid-cols-3 gap-3 text-[10.5px]">
          <div><div className="text-white/60">Hotline</div><div className="font-semibold truncate">{phone ?? "—"}</div></div>
          <div><div className="text-white/60">Email</div><div className="font-semibold truncate">{email ?? "—"}</div></div>
          <div><div className="text-white/60">Web</div><div className="font-semibold truncate">{web ?? "—"}</div></div>
        </div>
      </div>
    </div>
  );
}

function WalletPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const qc = useQueryClient();

  const [editing, setEditing] = useState<FormState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fnList = useServerFn(listWalletCards);
  const fnCards = useServerFn(listCardsForWallet);
  const fnStats = useServerFn(walletStats);
  const fnCreate = useServerFn(createWalletCard);
  const fnUpdate = useServerFn(updateWalletCard);
  const fnDelete = useServerFn(deleteWalletCard);

  const list = useQuery({
    queryKey: ["wallet-cards", tenantId],
    queryFn: () => fnList({ data: { tenantId: tenantId! } }),
    enabled: !!tenantId,
  });
  const cards = useQuery({
    queryKey: ["wallet-cards-src", tenantId],
    queryFn: () => fnCards({ data: { tenantId: tenantId! } }),
    enabled: !!tenantId,
  });
  const stats = useQuery({
    queryKey: ["wallet-stats", tenantId],
    queryFn: () => fnStats({ data: { tenantId: tenantId! } }),
    enabled: !!tenantId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["wallet-cards", tenantId] });
    qc.invalidateQueries({ queryKey: ["wallet-stats", tenantId] });
  };

  const createMut = useMutation({
    mutationFn: (v: FormState) => fnCreate({ data: { tenantId: tenantId!, ...v } }),
    onSuccess: () => { toast.success("Đã tạo Wallet Card"); setEditing(null); invalidate(); },
    onError: (e: any) => toast.error(e.message ?? "Lỗi"),
  });
  const updateMut = useMutation({
    mutationFn: (v: FormState & { id: string }) => fnUpdate({ data: v }),
    onSuccess: () => { toast.success("Đã cập nhật"); setEditing(null); invalidate(); },
    onError: (e: any) => toast.error(e.message ?? "Lỗi"),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => fnDelete({ data: { id } }),
    onSuccess: () => { toast.success("Đã xoá"); setDeletingId(null); invalidate(); },
    onError: (e: any) => toast.error(e.message ?? "Lỗi"),
  });

  const items = (list.data?.items ?? []) as unknown as WalletRow[];
  const cardOptions = cards.data ?? [];
  const s = stats.data;

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editing.card_id) { toast.error("Chọn danh thiếp gốc"); return; }
    if (editing.id) updateMut.mutate({ ...editing, id: editing.id });
    else createMut.mutate(editing);
  };

  if (!tenantId) {
    return <div className="p-8 text-sm text-muted-foreground">Chọn workspace để quản lý Wallet Card.</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wallet Card"
        sub="Danh thiếp luôn sẵn trong Apple Wallet & Google Wallet — cập nhật thời gian thực."
        action={
          <Button onClick={() => setEditing({ ...EMPTY })}>
            <Plus className="h-4 w-4" /> Tạo Wallet Card
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Wallet} label="Wallet đã tạo" value={(s?.total ?? 0).toLocaleString("vi-VN")} delta={0} deltaLabel="" tone="primary" />
        <KpiCard icon={Eye} label="Lượt cài đặt" value={(s?.installs ?? 0).toLocaleString("vi-VN")} delta={0} deltaLabel="" tone="indigo" />
        <KpiCard icon={Apple} label="Apple Wallet" value={(s?.apple ?? 0).toLocaleString("vi-VN")} delta={0} deltaLabel="" tone="blue" />
        <KpiCard icon={Radio} label="Google Wallet" value={(s?.google ?? 0).toLocaleString("vi-VN")} delta={0} deltaLabel="" tone="green" />
      </div>

      {list.isLoading ? (
        <div className="p-8 text-sm text-muted-foreground text-center">Đang tải…</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border shadow-soft p-5">
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-2 text-primary/60" />
            <p>Chưa có Wallet Card nào. Nhấn "Tạo Wallet Card" để bắt đầu.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {items.map((w) => (
            <div key={w.id} className="rounded-2xl bg-card border border-border shadow-soft p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-foreground">
                  {w.platform === "apple" ? <Apple className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
                  {w.platform === "apple" ? "Apple Wallet" : "Google Wallet"}
                  <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                    {w.install_count.toLocaleString("vi-VN")} cài
                  </span>
                </span>
                <div className="flex items-center gap-1">
                  {w.pass_url && (
                    <a href={w.pass_url} target="_blank" rel="noopener noreferrer"
                       className="text-[12px] text-primary font-medium hover:underline inline-flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" /> Mở
                    </a>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => setEditing({
                    id: w.id,
                    card_id: w.card_id,
                    platform: w.platform,
                    serial_number: w.serial_number ?? "",
                    pass_url: w.pass_url ?? "",
                  })}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setDeletingId(w.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
              {w.platform === "apple" ? <ApplePass w={w} /> : <GooglePass w={w} />}
              <div className="mt-3 flex items-center justify-between text-[11.5px] text-muted-foreground">
                <span>Serial: <span className="font-mono">{w.serial_number ?? "—"}</span></span>
                <span>
                  {w.last_updated_at ? `Cập nhật ${new Date(w.last_updated_at).toLocaleDateString("vi-VN")}` : "Chưa cập nhật"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Sửa Wallet Card" : "Tạo Wallet Card"}</DialogTitle>
            <DialogDescription>Gắn Wallet pass với danh thiếp có sẵn.</DialogDescription>
          </DialogHeader>
          {editing && (
            <form onSubmit={submitForm} className="space-y-3">
              <Field label="Danh thiếp gốc *">
                <Select value={editing.card_id} onValueChange={(v) => setEditing({ ...editing, card_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Chọn danh thiếp…" /></SelectTrigger>
                  <SelectContent>
                    {cardOptions.length === 0 && (
                      <SelectItem value="__empty" disabled>Chưa có danh thiếp — tạo ở /cards</SelectItem>
                    )}
                    {cardOptions.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.display_name ?? c.slug} {c.title ? `— ${c.title}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Nền tảng *">
                <Select value={editing.platform} onValueChange={(v) => setEditing({ ...editing, platform: v as Platform })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apple">Apple Wallet</SelectItem>
                    <SelectItem value="google">Google Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Serial number">
                <Input value={editing.serial_number} onChange={(e) => setEditing({ ...editing, serial_number: e.target.value })} placeholder="VD: PASS-000123" />
              </Field>
              <Field label="Pass URL">
                <Input value={editing.pass_url} onChange={(e) => setEditing({ ...editing, pass_url: e.target.value })} placeholder="https://…/pass.pkpass hoặc Google Wallet save link" />
              </Field>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>Hủy</Button>
                <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                  {editing.id ? "Lưu" : "Tạo"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá Wallet Card?</AlertDialogTitle>
            <AlertDialogDescription>Bản ghi sẽ bị xoá khỏi danh sách.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingId && deleteMut.mutate(deletingId)}>Xoá</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[12.5px] font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}
