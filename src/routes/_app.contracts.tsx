import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, CircleDollarSign, FileSignature, Plus, RefreshCw, Wallet } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CONTRACT_STATUSES,
  CONTRACT_STATUS_LABEL,
  COMMISSION_STATUS_LABEL,
  INSTALLMENT_TEMPLATE,
  cancelContract,
  completeContract,
  createContractFromProduct,
  listContracts,
  markInstallmentPaid,
  setCommissionStatus,
  setCommissions,
  setInstallments,
  updateContract,
} from "@/lib/contract.functions";

export const Route = createFileRoute("/_app/contracts")({
  head: () => ({
    meta: [
      { title: "Hợp đồng & hoa hồng — SaleBDS OS" },
      {
        name: "description",
        content: "Lập hợp đồng từ giỏ hàng, lên đợt thanh toán, tính hoa hồng cho chuyên viên và theo dõi tiền đã thu.",
      },
      { property: "og:title", content: "Hợp đồng & hoa hồng — SaleBDS OS" },
      { property: "og:description", content: "Hợp đồng, đợt thanh toán và hoa hồng của sàn bất động sản." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContractsPage,
});

const money = (value: number, currency = "VND") =>
  `${new Intl.NumberFormat("vi-VN").format(Math.round(value || 0))} ${currency}`;

const STATUS_TONE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-primary/10 text-primary",
  completed: "bg-emerald-500/10 text-emerald-600",
  cancelled: "bg-destructive/10 text-destructive",
};

type InstallmentDraft = { name: string; percent: string; amount: string; due_date: string };
type CommissionDraft = { beneficiary_user_id: string; role_label: string; percent: string; amount: string };

function Kpi({ icon: Icon, label, value }: { icon: typeof Wallet; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

function ContractsPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const qc = useQueryClient();

  const [status, setStatus] = useState("all");
  const [projectId, setProjectId] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchList = useServerFn(listContracts);
  const fnCreate = useServerFn(createContractFromProduct);
  const fnUpdate = useServerFn(updateContract);
  const fnComplete = useServerFn(completeContract);
  const fnCancel = useServerFn(cancelContract);
  const fnSetIns = useServerFn(setInstallments);
  const fnPayIns = useServerFn(markInstallmentPaid);
  const fnSetCom = useServerFn(setCommissions);
  const fnComStatus = useServerFn(setCommissionStatus);

  const key = ["contracts", tenantId, status, projectId];
  const query = useQuery({
    queryKey: key,
    enabled: Boolean(tenantId),
    queryFn: () =>
      fetchList({
        data: {
          tenantId: tenantId as string,
          ...(status !== "all" ? { status: status as (typeof CONTRACT_STATUSES)[number] } : {}),
          ...(projectId !== "all" ? { projectId } : {}),
        },
      }),
  });
  const data = query.data;
  const invalidate = () => qc.invalidateQueries({ queryKey: ["contracts", tenantId] });

  const run = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const selected = useMemo(
    () => (data?.contracts ?? []).find((row: any) => row.id === openId) ?? null,
    [data, openId],
  );

  // --- create form -----------------------------------------------------------
  const [form, setForm] = useState({
    productId: "",
    customerId: "",
    code: "",
    salePrice: "",
    discountAmount: "",
    signedAt: "",
    commissionPercent: "2",
    note: "",
  });
  const sellableProducts = (data?.products ?? []).filter(
    (p: any) => !["sold", "liquidated"].includes(p.listing_status),
  );

  const submitCreate = () =>
    run.mutate(async () => {
      await fnCreate({
        data: {
          tenantId: tenantId as string,
          productId: form.productId || null,
          customerId: form.customerId || null,
          code: form.code || null,
          salePrice: Number(form.salePrice || 0),
          discountAmount: Number(form.discountAmount || 0),
          signedAt: form.signedAt || null,
          note: form.note || null,
          withTemplate: true,
          commissionPercent: Number(form.commissionPercent || 0),
        },
      });
      toast.success("Đã lập hợp đồng và tạo đợt thanh toán mẫu");
      setCreating(false);
      setForm({ productId: "", customerId: "", code: "", salePrice: "", discountAmount: "", signedAt: "", commissionPercent: "2", note: "" });
    });

  // --- installment / commission editors -------------------------------------
  const [insDraft, setInsDraft] = useState<InstallmentDraft[] | null>(null);
  const [comDraft, setComDraft] = useState<CommissionDraft[] | null>(null);

  const insRows: InstallmentDraft[] =
    insDraft ??
    (selected?.installments ?? []).map((row: any) => ({
      name: row.name,
      percent: row.percent == null ? "" : String(row.percent),
      amount: String(Number(row.amount ?? 0)),
      due_date: row.due_date ?? "",
    }));
  const comRows: CommissionDraft[] =
    comDraft ??
    (selected?.commissions ?? []).map((row: any) => ({
      beneficiary_user_id: row.beneficiary_user_id ?? "",
      role_label: row.role_label ?? "",
      percent: row.percent == null ? "" : String(row.percent),
      amount: String(Number(row.amount ?? 0)),
    }));

  const closeDetail = () => {
    setOpenId(null);
    setInsDraft(null);
    setComDraft(null);
  };

  const percentSum = insRows.reduce((s, r) => s + Number(r.percent || 0), 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Hợp đồng & hoa hồng"
        sub="Từ giỏ hàng sang hợp đồng: giá bán, đợt thanh toán, tiền đã thu và hoa hồng chuyên viên."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
              <RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />
              Làm mới
            </Button>
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              Lập hợp đồng
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {CONTRACT_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>{CONTRACT_STATUS_LABEL[value]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger className="h-9 w-[220px]"><SelectValue placeholder="Tất cả dự án" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả dự án</SelectItem>
            {(data?.projects ?? []).map((project: any) => (
              <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {data ? (
          <Badge variant="secondary" className="text-[11px]">{data.scope === "team" ? "Toàn sàn" : "Hợp đồng của tôi"}</Badge>
        ) : null}
      </div>

      {data ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi icon={FileSignature} label="Số hợp đồng" value={String(data.totals.count)} />
          <Kpi icon={Wallet} label="Giá trị hợp đồng" value={money(data.totals.value)} />
          <Kpi icon={BadgeCheck} label="Đã thu" value={money(data.totals.collected)} />
          <Kpi icon={CircleDollarSign} label="Hoa hồng chưa trả" value={money(data.totals.commissionUnpaid)} />
        </div>
      ) : null}

      <SectionCard title="Danh sách hợp đồng">
        {query.isLoading ? (
          <p className="py-7 text-center text-sm text-muted-foreground">Đang tải…</p>
        ) : query.isError ? (
          <p className="py-7 text-center text-sm text-destructive">{(query.error as Error).message}</p>
        ) : (data?.contracts ?? []).length === 0 ? (
          <p className="py-7 text-center text-sm text-muted-foreground">
            Chưa có hợp đồng nào. Bấm “Lập hợp đồng” và chọn sản phẩm trong giỏ hàng.
          </p>
        ) : (
          <div className="-mx-1 overflow-x-auto px-1">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Hợp đồng</th>
                  <th className="py-2 pr-3 font-medium">Sản phẩm</th>
                  <th className="py-2 pr-3 font-medium">Khách hàng</th>
                  <th className="py-2 pr-3 text-right font-medium">Giá trị</th>
                  <th className="py-2 pr-3 text-right font-medium">Đã thu</th>
                  <th className="py-2 pr-3 font-medium">Trạng thái</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {(data?.contracts ?? []).map((row: any) => (
                  <tr key={row.id} className="border-t border-border/70">
                    <td className="py-3 pr-3">
                      <p className="font-medium">{row.code}</p>
                      <p className="text-[11px] text-muted-foreground">{row.project_name ?? "Chưa gắn dự án"}</p>
                    </td>
                    <td className="py-3 pr-3 text-muted-foreground">{row.product_label ?? "—"}</td>
                    <td className="py-3 pr-3 text-muted-foreground">{row.customer_name ?? "—"}</td>
                    <td className="py-3 pr-3 text-right font-semibold">{money(row.net_price, row.currency)}</td>
                    <td className="py-3 pr-3 text-right">{money(row.collected, row.currency)}</td>
                    <td className="py-3 pr-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[row.status]}`}>
                        {CONTRACT_STATUS_LABEL[row.status as keyof typeof CONTRACT_STATUS_LABEL]}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <Button variant="outline" size="sm" onClick={() => { setOpenId(row.id); setInsDraft(null); setComDraft(null); }}>
                        Chi tiết
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Lập hợp đồng */}
      <Dialog open={creating} onOpenChange={(open) => !open && setCreating(false)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Lập hợp đồng</DialogTitle>
            <DialogDescription>Chọn sản phẩm trong giỏ hàng, hệ thống tự tạo 4 đợt thanh toán mẫu 30/30/30/10.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Sản phẩm</Label>
              <Select
                value={form.productId}
                onValueChange={(value) => {
                  const product = sellableProducts.find((p: any) => p.id === value);
                  setForm((prev) => ({ ...prev, productId: value, salePrice: product ? String(product.price) : prev.salePrice }));
                }}
              >
                <SelectTrigger><SelectValue placeholder="Chọn sản phẩm" /></SelectTrigger>
                <SelectContent>
                  {sellableProducts.map((product: any) => (
                    <SelectItem key={product.id} value={product.id}>
                      {(product.code || product.name) + (product.zone ? ` · ${product.zone}` : "")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Khách hàng</Label>
              <Select value={form.customerId} onValueChange={(value) => setForm((prev) => ({ ...prev, customerId: value }))}>
                <SelectTrigger><SelectValue placeholder="Chọn khách hàng" /></SelectTrigger>
                <SelectContent>
                  {(data?.customers ?? []).map((customer: any) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.full_name}{customer.phone ? ` · ${customer.phone}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Mã hợp đồng</Label>
                <Input value={form.code} placeholder="Để trống để tự sinh" onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <Label>Ngày ký</Label>
                <Input type="date" value={form.signedAt} onChange={(e) => setForm((p) => ({ ...p, signedAt: e.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <Label>Giá bán</Label>
                <Input inputMode="numeric" value={form.salePrice} onChange={(e) => setForm((p) => ({ ...p, salePrice: e.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <Label>Chiết khấu</Label>
                <Input inputMode="numeric" value={form.discountAmount} onChange={(e) => setForm((p) => ({ ...p, discountAmount: e.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <Label>Hoa hồng Sale (%)</Label>
                <Input inputMode="decimal" value={form.commissionPercent} onChange={(e) => setForm((p) => ({ ...p, commissionPercent: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Ghi chú</Label>
              <Textarea rows={2} value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Giá sau chiết khấu: {money(Math.max(0, Number(form.salePrice || 0) - Number(form.discountAmount || 0)))}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>Huỷ</Button>
            <Button onClick={submitCreate} disabled={run.isPending}>Lập hợp đồng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chi tiết hợp đồng */}
      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && closeDetail()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Hợp đồng {selected?.code}</DialogTitle>
            <DialogDescription>
              {selected?.product_label ?? "Chưa gắn sản phẩm"} · {selected?.customer_name ?? "Chưa gắn khách"} ·{" "}
              {selected ? CONTRACT_STATUS_LABEL[selected.status as keyof typeof CONTRACT_STATUS_LABEL] : ""}
            </DialogDescription>
          </DialogHeader>

          {selected ? (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-muted/40 p-3">
                  <p className="text-[11px] text-muted-foreground">Giá trị</p>
                  <p className="font-semibold">{money(selected.net_price, selected.currency)}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/40 p-3">
                  <p className="text-[11px] text-muted-foreground">Đã thu</p>
                  <p className="font-semibold">{money(selected.collected, selected.currency)}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/40 p-3">
                  <p className="text-[11px] text-muted-foreground">Còn phải thu</p>
                  <p className="font-semibold">{money(Math.max(0, selected.remaining), selected.currency)}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {selected.status === "draft" ? (
                  <Button
                    size="sm"
                    onClick={() => run.mutate(async () => { await fnUpdate({ data: { id: selected.id, status: "active" } }); toast.success("Hợp đồng đã hiệu lực, sản phẩm chuyển sang Ký HĐMB"); })}
                  >
                    Duyệt hiệu lực
                  </Button>
                ) : null}
                {selected.status === "active" && data?.canManage ? (
                  <Button
                    size="sm"
                    onClick={() => run.mutate(async () => { await fnComplete({ data: { id: selected.id } }); toast.success("Hợp đồng hoàn tất, sản phẩm chuyển sang Đã bán"); })}
                  >
                    Hoàn tất hợp đồng
                  </Button>
                ) : null}
                {selected.status !== "cancelled" && data?.canManage ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => run.mutate(async () => { await fnCancel({ data: { id: selected.id } }); toast.success("Đã huỷ hợp đồng, sản phẩm trả về Trống"); })}
                  >
                    Huỷ hợp đồng
                  </Button>
                ) : null}
              </div>

              {/* Đợt thanh toán */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Đợt thanh toán</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={percentSum === 100 ? "secondary" : "outline"} className="text-[10px]">
                      Tổng {percentSum}%
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setInsDraft(
                          INSTALLMENT_TEMPLATE.map((t) => ({
                            name: t.name,
                            percent: String(t.percent),
                            amount: String(Math.round((selected.net_price * t.percent) / 100)),
                            due_date: "",
                          })),
                        )
                      }
                    >
                      Mẫu 30/30/30/10
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setInsDraft([...insRows, { name: `Đợt ${insRows.length + 1}`, percent: "", amount: "0", due_date: "" }])}
                    >
                      Thêm đợt
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {insRows.map((row, index) => {
                    const stored = selected.installments[index];
                    return (
                      <div key={index} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_90px_140px_150px_auto]">
                        <Input
                          value={row.name}
                          onChange={(e) => setInsDraft(insRows.map((r, i) => (i === index ? { ...r, name: e.target.value } : r)))}
                        />
                        <Input
                          inputMode="decimal"
                          placeholder="%"
                          value={row.percent}
                          onChange={(e) => {
                            const percent = e.target.value;
                            setInsDraft(
                              insRows.map((r, i) =>
                                i === index
                                  ? { ...r, percent, amount: percent ? String(Math.round((selected.net_price * Number(percent || 0)) / 100)) : r.amount }
                                  : r,
                              ),
                            );
                          }}
                        />
                        <Input
                          inputMode="numeric"
                          value={row.amount}
                          onChange={(e) => setInsDraft(insRows.map((r, i) => (i === index ? { ...r, amount: e.target.value } : r)))}
                        />
                        <Input
                          type="date"
                          value={row.due_date}
                          onChange={(e) => setInsDraft(insRows.map((r, i) => (i === index ? { ...r, due_date: e.target.value } : r)))}
                        />
                        <div className="flex items-center gap-2">
                          {stored ? (
                            <Button
                              size="sm"
                              variant={stored.status === "paid" ? "secondary" : "outline"}
                              onClick={() =>
                                run.mutate(async () => {
                                  await fnPayIns({ data: { id: stored.id, paid: stored.status !== "paid" } });
                                  setInsDraft(null);
                                })
                              }
                            >
                              {stored.status === "paid" ? "Đã thu" : "Đánh dấu thu"}
                            </Button>
                          ) : null}
                          <Button size="sm" variant="ghost" onClick={() => setInsDraft(insRows.filter((_, i) => i !== index))}>
                            Xoá
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {insRows.length === 0 ? <p className="text-sm text-muted-foreground">Chưa có đợt thanh toán.</p> : null}
                </div>

                <Button
                  size="sm"
                  disabled={run.isPending || !insDraft}
                  onClick={() =>
                    run.mutate(async () => {
                      await fnSetIns({
                        data: {
                          contractId: selected.id,
                          rows: insRows.map((row) => ({
                            name: row.name,
                            percent: row.percent === "" ? null : Number(row.percent),
                            amount: Number(row.amount || 0),
                            due_date: row.due_date || null,
                          })),
                        },
                      });
                      setInsDraft(null);
                      toast.success("Đã lưu đợt thanh toán");
                    })
                  }
                >
                  Lưu đợt thanh toán
                </Button>
              </div>

              {/* Hoa hồng */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Hoa hồng</p>
                  {data?.canManage ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setComDraft([...comRows, { beneficiary_user_id: "", role_label: "Sale hỗ trợ", percent: "", amount: "0" }])}
                    >
                      Thêm dòng
                    </Button>
                  ) : null}
                </div>

                <div className="space-y-2">
                  {comRows.map((row, index) => {
                    const stored = selected.commissions[index];
                    return (
                      <div key={index} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_140px_90px_130px_auto]">
                        <Select
                          value={row.beneficiary_user_id}
                          onValueChange={(value) => setComDraft(comRows.map((r, i) => (i === index ? { ...r, beneficiary_user_id: value } : r)))}
                        >
                          <SelectTrigger><SelectValue placeholder="Người thụ hưởng" /></SelectTrigger>
                          <SelectContent>
                            {(data?.members ?? []).map((member: any) => (
                              <SelectItem key={member.user_id} value={member.user_id}>{member.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Vai trò"
                          value={row.role_label}
                          onChange={(e) => setComDraft(comRows.map((r, i) => (i === index ? { ...r, role_label: e.target.value } : r)))}
                        />
                        <Input
                          inputMode="decimal"
                          placeholder="%"
                          value={row.percent}
                          onChange={(e) => {
                            const percent = e.target.value;
                            setComDraft(
                              comRows.map((r, i) =>
                                i === index
                                  ? { ...r, percent, amount: percent ? String(Math.round((selected.net_price * Number(percent || 0)) / 100)) : r.amount }
                                  : r,
                              ),
                            );
                          }}
                        />
                        <Input
                          inputMode="numeric"
                          value={row.amount}
                          onChange={(e) => setComDraft(comRows.map((r, i) => (i === index ? { ...r, amount: e.target.value } : r)))}
                        />
                        <div className="flex items-center gap-2">
                          {stored ? (
                            <Badge variant="outline" className="text-[10px]">
                              {COMMISSION_STATUS_LABEL[stored.status as keyof typeof COMMISSION_STATUS_LABEL]}
                            </Badge>
                          ) : null}
                          {stored && data?.canManage ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                run.mutate(async () => {
                                  const next = stored.status === "pending" ? "approved" : stored.status === "approved" ? "paid" : "pending";
                                  await fnComStatus({ data: { id: stored.id, status: next } });
                                  setComDraft(null);
                                })
                              }
                            >
                              {stored.status === "pending" ? "Duyệt" : stored.status === "approved" ? "Đã trả" : "Mở lại"}
                            </Button>
                          ) : null}
                          {data?.canManage ? (
                            <Button size="sm" variant="ghost" onClick={() => setComDraft(comRows.filter((_, i) => i !== index))}>
                              Xoá
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                  {comRows.length === 0 ? <p className="text-sm text-muted-foreground">Chưa có dòng hoa hồng.</p> : null}
                </div>

                {data?.canManage ? (
                  <Button
                    size="sm"
                    disabled={run.isPending || !comDraft}
                    onClick={() =>
                      run.mutate(async () => {
                        await fnSetCom({
                          data: {
                            contractId: selected.id,
                            rows: comRows.map((row) => ({
                              beneficiary_user_id: row.beneficiary_user_id || null,
                              role_label: row.role_label || null,
                              percent: row.percent === "" ? null : Number(row.percent),
                              amount: Number(row.amount || 0),
                            })),
                          },
                        });
                        setComDraft(null);
                        toast.success("Đã lưu hoa hồng");
                      })
                    }
                  >
                    Lưu hoa hồng
                  </Button>
                ) : (
                  <p className="text-[11px] text-muted-foreground">Chỉ quản lý được sửa và duyệt hoa hồng.</p>
                )}
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={closeDetail}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
