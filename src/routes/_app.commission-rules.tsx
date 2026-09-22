import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Percent, Plus, RefreshCw, Save, Trash2, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getCommissionRules,
  recalcTenantCommissions,
  saveCommissionRules,
} from "@/lib/commission.functions";
import {
  DEFAULT_COMMISSION_RULES,
  buildCommissionPlan,
  type CommissionRules,
} from "@/lib/commission-rules";

export const Route = createFileRoute("/_app/commission-rules")({
  head: () => ({
    meta: [
      { title: "Chính sách hoa hồng — SaleBDS OS" },
      {
        name: "description",
        content:
          "Thiết lập hoa hồng theo từng chuyên viên, từng nhóm và từng dự án; hệ thống tự tính vào hợp đồng, phễu và KPI.",
      },
      { property: "og:title", content: "Chính sách hoa hồng — SaleBDS OS" },
      { property: "og:description", content: "Hoa hồng theo sale, theo nhóm và theo dự án, tự tính vào hợp đồng và KPI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CommissionRulesPage,
});

const money = (value: number) => `${new Intl.NumberFormat("vi-VN").format(Math.round(value || 0))} đ`;
const SAMPLE = 1_000_000_000;

function CommissionRulesPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const qc = useQueryClient();

  const fetchRules = useServerFn(getCommissionRules);
  const fnSave = useServerFn(saveCommissionRules);
  const fnRecalc = useServerFn(recalcTenantCommissions);

  const query = useQuery({
    queryKey: ["commission-rules", tenantId],
    enabled: Boolean(tenantId),
    queryFn: () => fetchRules({ data: { tenantId: tenantId as string } }),
  });
  const data = query.data;
  const canManage = data?.canManage ?? false;

  const [draft, setDraft] = useState<CommissionRules>(DEFAULT_COMMISSION_RULES);
  useEffect(() => {
    if (data?.rules) setDraft(data.rules);
  }, [data?.rules]);

  const save = useMutation({
    mutationFn: async () => fnSave({ data: { tenantId: tenantId as string, rules: draft } }),
    onSuccess: () => {
      toast.success("Đã lưu chính sách hoa hồng");
      qc.invalidateQueries({ queryKey: ["commission-rules", tenantId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const recalc = useMutation({
    mutationFn: async () => fnRecalc({ data: { tenantId: tenantId as string } }),
    onSuccess: (result: any) => {
      toast.success(`Đã tính lại hoa hồng cho ${result.updated}/${result.contracts} hợp đồng`);
      qc.invalidateQueries({ queryKey: ["contracts", tenantId] });
      qc.invalidateQueries({ queryKey: ["funnel-report", tenantId] });
      qc.invalidateQueries({ queryKey: ["revenue-report", tenantId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const splitTotal = draft.splits.sale + draft.splits.team_lead + draft.splits.manager + draft.splits.company;
  const preview = buildCommissionPlan(draft, {
    netPrice: SAMPLE,
    ownerUserId: "00000000-0000-0000-0000-000000000001",
    ownerName: "Sale chính",
    teamLeadUserId: "00000000-0000-0000-0000-000000000002",
    teamLeadName: "Trưởng nhóm",
    managerName: "Quản lý sàn",
  });

  const num = (value: string) => Math.max(0, Math.min(100, Number(value.replace(",", ".") || 0)));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Chính sách hoa hồng"
        sub="Đặt tỷ lệ theo từng chuyên viên, từng nhóm và từng dự án. Hệ thống tự tính vào hợp đồng, báo cáo phễu và KPI tổng quan."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
              <RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />
              Làm mới
            </Button>
            {canManage ? (
              <>
                <Button variant="outline" size="sm" onClick={() => recalc.mutate()} disabled={recalc.isPending}>
                  <Percent className="h-4 w-4" />
                  Tính lại toàn bộ hợp đồng
                </Button>
                <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
                  <Save className="h-4 w-4" />
                  Lưu chính sách
                </Button>
              </>
            ) : null}
          </div>
        }
      />

      {query.isLoading ? (
        <SectionCard title="Đang tải">
          <p className="py-7 text-center text-sm text-muted-foreground">Đang tải chính sách hoa hồng…</p>
        </SectionCard>
      ) : query.isError ? (
        <SectionCard title="Không tải được">
          <p className="py-7 text-center text-sm text-destructive">{(query.error as Error).message}</p>
        </SectionCard>
      ) : (
        <>
          {!canManage ? (
            <p className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              Bạn đang xem ở chế độ chỉ đọc. Chỉ quản lý được sửa chính sách hoa hồng.
            </p>
          ) : null}

          <SectionCard
            title="Quỹ hoa hồng"
            action={
              <Badge variant="outline" className="shrink-0 text-[10px]">
                {draft.enabled ? "Đang bật" : "Đang tắt"}
              </Badge>
            }
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 sm:col-span-2">
                <div>
                  <p className="text-sm font-medium">Tự tính hoa hồng khi lập hợp đồng</p>
                  <p className="text-xs text-muted-foreground">Tắt thì hoa hồng phải nhập tay trong từng hợp đồng.</p>
                </div>
                <Switch
                  checked={draft.enabled}
                  disabled={!canManage}
                  onCheckedChange={(checked) => setDraft({ ...draft, enabled: checked })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tỷ lệ mặc định (% giá trị hợp đồng)</Label>
                <Input
                  inputMode="decimal"
                  disabled={!canManage}
                  value={String(draft.default_percent)}
                  onChange={(e) => setDraft({ ...draft, default_percent: num(e.target.value) })}
                />
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {(
                [
                  ["sale", "Sale chính"],
                  ["team_lead", "Trưởng nhóm"],
                  ["manager", "Quản lý sàn"],
                  ["company", "Quỹ sàn"],
                ] as Array<[keyof CommissionRules["splits"], string]>
              ).map(([key, label]) => (
                <div key={key} className="space-y-1.5">
                  <Label>{label} (%)</Label>
                  <Input
                    inputMode="decimal"
                    disabled={!canManage}
                    value={String(draft.splits[key])}
                    onChange={(e) => setDraft({ ...draft, splits: { ...draft.splits, [key]: num(e.target.value) } })}
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Tổng tỷ lệ chia hiện tại: {splitTotal}%. Phần của người chưa xác định sẽ dồn về quỹ sàn.
            </p>

            <div className="mt-4 space-y-1.5">
              <Label>Quản lý nhận hoa hồng</Label>
              <Select
                value={draft.manager_user_id ?? "none"}
                disabled={!canManage}
                onValueChange={(value) => setDraft({ ...draft, manager_user_id: value === "none" ? null : value })}
              >
                <SelectTrigger className="w-full sm:w-[320px]"><SelectValue placeholder="Không gán" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Không gán (dồn về quỹ sàn)</SelectItem>
                  {(data?.members ?? []).map((member: any) => (
                    <SelectItem key={member.user_id} value={member.user_id}>{member.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </SectionCard>

          <SectionCard title="Tỷ lệ riêng theo chuyên viên">
            <RuleList
              rows={draft.sale_rules.map((row) => ({ id: row.user_id, percent: row.percent }))}
              options={(data?.members ?? []).map((m: any) => ({
                id: m.user_id,
                label: `${m.name}${m.team_id ? "" : " · chưa có nhóm"}`,
              }))}
              placeholder="Chọn chuyên viên"
              canManage={canManage}
              onChange={(rows) =>
                setDraft({ ...draft, sale_rules: rows.map((row) => ({ user_id: row.id, percent: row.percent })) })
              }
            />
          </SectionCard>

          <SectionCard
            title="Tỷ lệ riêng theo nhóm"
            action={<Badge variant="outline" className="shrink-0 gap-1 text-[10px]"><Users className="h-3 w-3" />{data?.teams.length ?? 0} nhóm</Badge>}
          >
            <RuleList
              rows={draft.team_rules.map((row) => ({ id: row.team_id, percent: row.percent }))}
              options={(data?.teams ?? []).map((t: any) => ({ id: t.id, label: `${t.name} · ${t.memberCount} thành viên` }))}
              placeholder="Chọn nhóm"
              canManage={canManage}
              onChange={(rows) =>
                setDraft({ ...draft, team_rules: rows.map((row) => ({ team_id: row.id, percent: row.percent })) })
              }
            />
          </SectionCard>

          <SectionCard title="Tỷ lệ riêng theo dự án">
            <RuleList
              rows={draft.project_rules.map((row) => ({ id: row.project_id, percent: row.percent }))}
              options={(data?.projects ?? []).map((p: any) => ({ id: p.id, label: p.name }))}
              placeholder="Chọn dự án"
              canManage={canManage}
              onChange={(rows) =>
                setDraft({ ...draft, project_rules: rows.map((row) => ({ project_id: row.id, percent: row.percent })) })
              }
            />
          </SectionCard>

          <SectionCard title="Thử với hợp đồng 1 tỷ">
            <p className="text-xs text-muted-foreground">
              Quỹ hoa hồng {preview.percent}% = {money(preview.pool)} ({preview.source.toLowerCase()})
            </p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {preview.rows.map((row, index) => (
                <li key={index} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
                  <span className="text-muted-foreground">{row.role_label}</span>
                  <span className="font-medium">{money(row.amount)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Thứ tự ưu tiên: chuyên viên → nhóm → dự án → mặc định. Hoa hồng đã duyệt hoặc đã trả sẽ không bị tính lại.
            </p>
          </SectionCard>
        </>
      )}
    </div>
  );
}

function RuleList({
  rows,
  options,
  placeholder,
  canManage,
  onChange,
}: {
  rows: Array<{ id: string; percent: number }>;
  options: Array<{ id: string; label: string }>;
  placeholder: string;
  canManage: boolean;
  onChange: (rows: Array<{ id: string; percent: number }>) => void;
}) {
  const num = (value: string) => Math.max(0, Math.min(100, Number(value.replace(",", ".") || 0)));
  return (
    <div className="space-y-2">
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">Chưa có tỷ lệ riêng — đang dùng tỷ lệ mặc định.</p>
      ) : null}
      {rows.map((row, index) => (
        <div key={index} className="grid gap-2 sm:grid-cols-[1fr_120px_auto]">
          <Select
            value={row.id}
            disabled={!canManage}
            onValueChange={(value) => onChange(rows.map((r, i) => (i === index ? { ...r, id: value } : r)))}
          >
            <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            inputMode="decimal"
            disabled={!canManage}
            value={String(row.percent)}
            onChange={(e) => onChange(rows.map((r, i) => (i === index ? { ...r, percent: num(e.target.value) } : r)))}
          />
          {canManage ? (
            <Button variant="ghost" size="icon" onClick={() => onChange(rows.filter((_, i) => i !== index))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      ))}
      {canManage ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const next = options.find((option) => !rows.some((row) => row.id === option.id));
            if (!next) {
              toast.info("Đã thêm hết các lựa chọn");
              return;
            }
            onChange([...rows, { id: next.id, percent: 2 }]);
          }}
        >
          <Plus className="h-4 w-4" />
          Thêm tỷ lệ riêng
        </Button>
      ) : null}
    </div>
  );
}
