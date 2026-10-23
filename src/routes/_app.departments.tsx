import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Building, Crown, Plus, Trash2, Pencil, UserMinus, Users2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getDepartments, saveDepartment, deleteDepartment, setDepartmentMember, reassignDepartmentLead,
} from "@/lib/departments.functions";

export const Route = createFileRoute("/_app/departments")({
  head: () => ({
    meta: [
      { title: "Phòng ban — SaleBDS OS" },
      { name: "description", content: "Quản lý phòng ban, trưởng phòng và khách hàng theo phòng." },
      { property: "og:title", content: "Phòng ban — SaleBDS OS" },
      { property: "og:description", content: "Quản lý phòng ban, trưởng phòng và khách hàng theo phòng." },
    ],
  }),
  component: DepartmentsPage,
});

const vnd = (n: number) => (n >= 1e9 ? (n / 1e9).toFixed(2) + " tỷ" : n >= 1e6 ? Math.round(n / 1e6) + " tr" : n.toLocaleString("vi-VN"));
const STATUS: Record<string, string> = { new: "Mới", contacted: "Đã liên hệ", qualified: "Tiềm năng", consulting: "Đang tư vấn", quoted: "Đã báo giá", proposal: "Đề xuất", deposit: "Đặt cọc", won: "Thành công", lost: "Thất bại" };

function DepartmentsPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const qc = useQueryClient();
  const fGet = useServerFn(getDepartments);
  const fSave = useServerFn(saveDepartment);
  const fDel = useServerFn(deleteDepartment);
  const fMem = useServerFn(setDepartmentMember);
  const fRe = useServerFn(reassignDepartmentLead);
  const q = useQuery({ queryKey: ["departments", tenantId], queryFn: () => fGet({ data: { tenantId: tenantId! } }), enabled: !!tenantId });
  const refresh = () => qc.invalidateQueries({ queryKey: ["departments", tenantId] });
  const run = (p: Promise<any>, ok: string) => p.then(() => { toast.success(ok); refresh(); }).catch((e) => toast.error(e?.message ?? "Có lỗi"));

  const [edit, setEdit] = useState<{ id?: string; name: string; description: string } | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => fSave({ data: { tenantId: tenantId!, ...edit! } }),
    onSuccess: () => { toast.success("Đã lưu phòng ban"); setEdit(null); refresh(); },
    onError: (e: any) => toast.error(e?.message ?? "Có lỗi"),
  });

  const d = q.data;
  const depts = d?.departments ?? [];
  const cur = depts.find((x: any) => x.id === active) ?? depts[0];

  return (
    <div className="space-y-6">
      <PageHeader title="Phòng ban"
        sub={d?.isAdmin ? "Tạo phòng, chọn trưởng phòng. Trưởng phòng chỉ xem và chia khách trong phòng mình." : "Khách hàng và kết quả của phòng bạn phụ trách."}
        action={d?.isAdmin ? <Button onClick={() => setEdit({ name: "", description: "" })}><Plus className="h-4 w-4" />Thêm phòng</Button> : undefined} />

      {q.isLoading && <div className="text-sm text-muted-foreground">Đang tải…</div>}
      {q.error && <div className="text-sm text-destructive">{(q.error as Error).message}</div>}
      {d && depts.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          <Building className="mx-auto mb-2 h-6 w-6" />
          {d.isAdmin ? "Chưa có phòng ban. Bấm “Thêm phòng” để bắt đầu." : "Bạn chưa là trưởng phòng của phòng nào."}
        </div>
      )}

      {depts.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="space-y-2">
            {depts.map((x: any) => (
              <button key={x.id} onClick={() => setActive(x.id)}
                className={`w-full rounded-xl border p-3 text-left transition ${cur?.id === x.id ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/40"}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium truncate">{x.name}</div>
                  <Badge variant="secondary">{x.members.length} người</Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                  {x.stats.leads30} khách/30 ngày · {x.stats.contracts} HĐ · {vnd(x.stats.revenue)}
                </div>
              </button>
            ))}
          </div>

          {cur && (
            <div className="space-y-4 min-w-0">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold">{cur.name}</h2>
                    {cur.description && <p className="text-sm text-muted-foreground">{cur.description}</p>}
                  </div>
                  {d?.isAdmin && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEdit({ id: cur.id, name: cur.name, description: cur.description ?? "" })}><Pencil className="h-4 w-4" />Sửa</Button>
                      <Button size="sm" variant="outline" onClick={() => confirm(`Xoá phòng "${cur.name}"? Khách và hợp đồng vẫn giữ nguyên.`) && run(fDel({ data: { tenantId: tenantId!, id: cur.id } }), "Đã xoá phòng")}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[["Khách 30 ngày", cur.stats.leads30], ["Đã chốt", cur.stats.won], ["Hợp đồng", cur.stats.contracts], ["Doanh số", vnd(cur.stats.revenue)]].map(([l, v]) => (
                    <div key={l as string} className="rounded-lg border border-border p-3">
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{l}</div>
                      <div className="mt-1 font-semibold tabular-nums">{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-medium flex items-center gap-2"><Users2 className="h-4 w-4" />Thành viên</h3>
                  {d?.isAdmin && (
                    <Select value="" onValueChange={(uid) => run(fMem({ data: { tenantId: tenantId!, teamId: cur.id, userId: uid, action: "add" } }), "Đã thêm vào phòng")}>
                      <SelectTrigger className="h-9 w-[220px]"><SelectValue placeholder="+ Thêm thành viên" /></SelectTrigger>
                      <SelectContent>
                        {d.people.filter((p: any) => !cur.members.some((m: any) => m.user_id === p.user_id)).map((p: any) => (
                          <SelectItem key={p.user_id} value={p.user_id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {cur.members.length === 0 && <div className="text-sm text-muted-foreground">Chưa có thành viên.</div>}
                <ul className="divide-y divide-border">
                  {cur.members.map((m: any) => (
                    <li key={m.user_id} className="flex items-center justify-between gap-2 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate text-sm">{m.name}</span>
                        {m.is_lead && <Badge className="gap-1"><Crown className="h-3 w-3" />Trưởng phòng</Badge>}
                      </div>
                      {d?.isAdmin && (
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" variant="ghost" onClick={() => run(fMem({ data: { tenantId: tenantId!, teamId: cur.id, userId: m.user_id, action: m.is_lead ? "unlead" : "lead" } }), m.is_lead ? "Đã bỏ trưởng phòng" : "Đã đặt trưởng phòng")}>
                            <Crown className="h-4 w-4" /><span className="hidden sm:inline">{m.is_lead ? "Bỏ trưởng phòng" : "Đặt trưởng phòng"}</span>
                          </Button>
                          <Button size="sm" variant="ghost" aria-label="Xoá khỏi phòng" onClick={() => run(fMem({ data: { tenantId: tenantId!, teamId: cur.id, userId: m.user_id, action: "remove" } }), "Đã xoá khỏi phòng")}>
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-border bg-card overflow-x-auto">
                <div className="p-4 pb-2 font-medium">Khách của phòng ({cur.leads.length})</div>
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                    <tr><th className="px-3 py-2.5 text-left">Khách</th><th className="px-3 py-2.5 text-left">Trạng thái</th><th className="px-3 py-2.5 text-left">Sale phụ trách</th></tr>
                  </thead>
                  <tbody>
                    {cur.leads.length === 0 && <tr><td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">Chưa có khách.</td></tr>}
                    {cur.leads.map((l: any) => (
                      <tr key={l.id} className="border-t border-border hover:bg-muted/40">
                        <td className="px-3 py-2"><div className="font-medium">{l.full_name || "—"}</div><div className="text-xs text-muted-foreground tabular-nums">{l.phone}</div></td>
                        <td className="px-3 py-2">{STATUS[l.status] ?? l.status}</td>
                        <td className="px-3 py-2">
                          <Select value={l.owner_user_id} onValueChange={(uid) => run(fRe({ data: { tenantId: tenantId!, teamId: cur.id, leadId: l.id, toUserId: uid } }), "Đã chuyển khách")}>
                            <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {cur.members.map((m: any) => <SelectItem key={m.user_id} value={m.user_id}>{m.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-xs text-muted-foreground">Xem chi tiết từng khách tại <Link to="/leads" className="text-primary">Leads</Link>.</div>
            </div>
          )}
        </div>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? "Sửa phòng ban" : "Thêm phòng ban"}</DialogTitle></DialogHeader>
          <Input placeholder="Tên phòng, VD: Phòng Kinh doanh 1" value={edit?.name ?? ""} onChange={(e) => setEdit((s) => s && { ...s, name: e.target.value })} />
          <Textarea placeholder="Mô tả (không bắt buộc)" value={edit?.description ?? ""} onChange={(e) => setEdit((s) => s && { ...s, description: e.target.value })} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Huỷ</Button>
            <Button disabled={!edit?.name.trim() || save.isPending} onClick={() => save.mutate()}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
