import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Banknote, CheckCircle2, Clock, Copy, KeyRound, Landmark } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getBankOverview, ignoreBankTransaction, matchBankTransaction, saveBankSettings } from "@/lib/bank.functions";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_app/bank-reconciliation")({
  head: () => ({
    meta: [
      { title: "Đối soát ngân hàng tự động — SaleBDS OS" },
      { name: "description", content: "Tiền chuyển khoản về tài khoản sàn tự khớp vào đúng hợp đồng và đợt thanh toán." },
      { property: "og:title", content: "Đối soát ngân hàng tự động — SaleBDS OS" },
      { property: "og:description", content: "Tự khớp tiền về với hợp đồng và đợt thanh toán." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BankPage,
});

const vnd = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n || 0)) + "đ";
const STATUS: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  matched: { label: "Đã khớp", variant: "default" },
  unmatched: { label: "Chờ khớp", variant: "secondary" },
  ignored: { label: "Bỏ qua", variant: "outline" },
};

function BankPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const qc = useQueryClient();
  const fetchOverview = useServerFn(getBankOverview);
  const save = useServerFn(saveBankSettings);
  const match = useServerFn(matchBankTransaction);
  const ignore = useServerFn(ignoreBankTransaction);
  const q = useQuery({ queryKey: ["bank", tenantId], enabled: !!tenantId, queryFn: () => fetchOverview({ data: { tenantId: tenantId! } }) });
  const [newKey, setNewKey] = useState<string | null>(null);
  const [form, setForm] = useState<any>(null);
  const [pick, setPick] = useState<Record<string, string>>({});
  const s = form ?? q.data?.settings;
  const refresh = () => qc.invalidateQueries({ queryKey: ["bank", tenantId] });

  const saveM = useMutation({
    mutationFn: (rotateKey: boolean) => save({ data: { tenantId: tenantId!, enabled: s.enabled, provider: s.provider, bankName: s.bankName, accountNumber: s.accountNumber, accountName: s.accountName, rotateKey } }),
    onSuccess: (r) => {
      if (r.newKey) setNewKey(r.newKey);
      toast.success("Đã lưu cấu hình ngân hàng");
      setForm(null);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const matchM = useMutation({
    mutationFn: (v: { txId: string; contractId: string }) => match({ data: { tenantId: tenantId!, ...v } }),
    onSuccess: () => { toast.success("Đã ghi tiền vào hợp đồng"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const ignoreM = useMutation({
    mutationFn: (txId: string) => ignore({ data: { tenantId: tenantId!, txId } }),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  if (!q.data) return <div className="p-6 text-sm text-muted-foreground">{q.error ? (q.error as Error).message : "Đang tải…"}</div>;
  const { transactions, contracts, canWrite } = q.data;
  const matched = transactions.filter((t: any) => t.status === "matched");
  const pending = transactions.filter((t: any) => t.status === "unmatched");
  const total = matched.reduce((x: number, t: any) => x + Number(t.amount), 0);
  const rate = transactions.length ? Math.round((matched.length / transactions.filter((t: any) => t.status !== "ignored").length) * 1000) / 10 : 0;
  const webhook = typeof window !== "undefined" ? `${window.location.origin}/api/public/bank-webhook` : "/api/public/bank-webhook";
  const codeOf = (id: string | null) => contracts.find((c: any) => c.id === id)?.code ?? "—";

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Đối soát ngân hàng" sub="Khách chuyển khoản ghi mã hợp đồng (vd HD260923LHS8) — tiền tự ghi vào đúng đợt thanh toán." />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { icon: Banknote, label: "Đã khớp tự động", value: vnd(total) },
          { icon: CheckCircle2, label: "Giao dịch đã khớp", value: String(matched.length) },
          { icon: Clock, label: "Chờ khớp tay", value: String(pending.length) },
          { icon: Landmark, label: "Tỷ lệ khớp", value: `${rate}%` },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <k.icon className="mb-2 h-5 w-5 text-primary" />
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="mt-1 text-xl font-bold">{k.value}</p>
          </div>
        ))}
      </div>

      {pending.length > 0 && (
        <SectionCard title="Giao dịch chờ khớp" className="mb-6">
          <div className="space-y-3">
            {pending.map((t: any) => (
              <div key={t.id} className="flex flex-col gap-3 rounded-xl border border-border p-3 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{vnd(t.amount)}</p>
                  <p className="truncate text-xs text-muted-foreground">{t.content || "Không có nội dung"} · {new Date(t.transferred_at).toLocaleString("vi-VN")}</p>
                </div>
                {canWrite && (
                  <div className="flex gap-2">
                    <Select value={pick[t.id] ?? ""} onValueChange={(v) => setPick({ ...pick, [t.id]: v })}>
                      <SelectTrigger className="h-10 w-48"><SelectValue placeholder="Chọn hợp đồng" /></SelectTrigger>
                      <SelectContent>{contracts.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button className="h-10" disabled={!pick[t.id] || matchM.isPending} onClick={() => matchM.mutate({ txId: t.id, contractId: pick[t.id] })}>Khớp</Button>
                    <Button variant="ghost" className="h-10" onClick={() => ignoreM.mutate(t.id)}>Bỏ qua</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard title="Lịch sử tiền về" className="mb-6">
        {transactions.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Chưa có giao dịch nào. Kết nối ngân hàng bên dưới để bắt đầu.</p>
        ) : (
          <div className="divide-y divide-border">
            {transactions.map((t: any) => (
              <div key={t.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{vnd(t.amount)} <span className="font-normal text-muted-foreground">· {t.bank_name ?? ""}</span></p>
                  <p className="truncate text-xs text-muted-foreground">{t.content}</p>
                  {t.note && <p className="text-xs text-muted-foreground">{t.note}</p>}
                </div>
                <div className="text-right">
                  <Badge variant={STATUS[t.status]?.variant ?? "outline"}>{STATUS[t.status]?.label ?? t.status}</Badge>
                  {t.status === "matched" && <p className="mt-1 text-xs text-muted-foreground">{codeOf(t.matched_contract_id)}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {canWrite && s && (
        <SectionCard title="Kết nối tài khoản ngân hàng">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-xl border border-border p-3 md:col-span-2">
              <div><p className="text-sm font-medium">Bật đối soát tự động</p><p className="text-xs text-muted-foreground">Nhận biến động số dư qua SePay hoặc Casso</p></div>
              <Switch checked={s.enabled} onCheckedChange={(v) => setForm({ ...s, enabled: v })} />
            </div>
            <div className="space-y-1.5">
              <Label>Dịch vụ báo số dư</Label>
              <Select value={s.provider} onValueChange={(v) => setForm({ ...s, provider: v })}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="sepay">SePay</SelectItem><SelectItem value="casso">Casso</SelectItem><SelectItem value="other">Khác</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label htmlFor="bn">Ngân hàng</Label><Input id="bn" value={s.bankName} onChange={(e) => setForm({ ...s, bankName: e.target.value })} placeholder="Vietcombank" /></div>
            <div className="space-y-1.5"><Label htmlFor="an">Số tài khoản</Label><Input id="an" value={s.accountNumber} onChange={(e) => setForm({ ...s, accountNumber: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="am">Chủ tài khoản</Label><Input id="am" value={s.accountName} onChange={(e) => setForm({ ...s, accountName: e.target.value })} /></div>
          </div>
          <div className="mt-4 space-y-2 rounded-xl bg-muted/50 p-3 text-sm">
            <p className="font-medium">Dán vào mục Webhook của SePay/Casso:</p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded bg-background px-2 py-1 text-xs">{webhook}</code>
              <Button size="icon" variant="ghost" aria-label="Sao chép địa chỉ" onClick={() => { navigator.clipboard.writeText(webhook); toast.success("Đã sao chép"); }}><Copy className="h-4 w-4" /></Button>
            </div>
            <p className="text-xs text-muted-foreground">Kiểu xác thực: API Key · Khoá hiện tại: {s.keyHint ? `…${s.keyHint}` : "chưa tạo"}</p>
            {newKey && (
              <div className="rounded-lg border border-primary/40 bg-background p-2">
                <p className="text-xs font-medium">Khoá mới (chỉ hiện một lần):</p>
                <div className="flex items-center gap-2"><code className="min-w-0 flex-1 break-all text-xs">{newKey}</code>
                  <Button size="icon" variant="ghost" aria-label="Sao chép khoá" onClick={() => { navigator.clipboard.writeText(newKey); toast.success("Đã sao chép"); }}><Copy className="h-4 w-4" /></Button></div>
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button className="h-10" onClick={() => saveM.mutate(false)} disabled={saveM.isPending}>Lưu cấu hình</Button>
            <Button variant="outline" className="h-10" onClick={() => saveM.mutate(true)} disabled={saveM.isPending}><KeyRound className="mr-1.5 h-4 w-4" />Tạo khoá mới</Button>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
