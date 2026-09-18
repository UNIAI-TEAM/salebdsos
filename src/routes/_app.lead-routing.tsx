import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Save, Users, Clock, Snowflake } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getLeadRouting, saveLeadRouting } from "@/lib/lead-routing.functions";
import {
  COLD_DAY_OPTIONS,
  DEFAULT_LEAD_ROUTING,
  SLA_MINUTE_OPTIONS,
  slaLabel,
  type LeadRoutingConfig,
} from "@/lib/lead-routing";

export const Route = createFileRoute("/_app/lead-routing")({
  head: () => ({
    meta: [
      { title: "Phân phối lead tự động — SaleBDS OS" },
      { name: "description", content: "Chia khách mới cho Sale theo từng dự án, đặt hạn gọi khách và cảnh báo lead nguội." },
      { property: "og:title", content: "Phân phối lead tự động — SaleBDS OS" },
      { property: "og:description", content: "Luật chia khách theo dự án, hạn gọi khách và cảnh báo lead nguội cho sàn bất động sản." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LeadRoutingPage,
});

const ROLE_LABEL: Record<string, string> = {
  owner: "Giám đốc sàn", admin: "Quản trị sàn", manager: "Trưởng phòng", agent: "Chuyên viên",
};

function PeoplePicker({
  members,
  selected,
  onToggle,
}: {
  members: Array<{ userId: string; name: string; role: string }>;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  if (!members.length) return <p className="text-xs text-muted-foreground">Workspace chưa có Sale nào.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {members.map((member) => {
        const on = selected.includes(member.userId);
        return (
          <button
            key={member.userId}
            type="button"
            onClick={() => onToggle(member.userId)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              on
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            {member.name}
            <span className="ml-1 opacity-70">· {ROLE_LABEL[member.role] ?? member.role}</span>
          </button>
        );
      })}
    </div>
  );
}

function LeadRoutingPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const fetchRouting = useServerFn(getLeadRouting);
  const persistRouting = useServerFn(saveLeadRouting);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["lead-routing", tenantId],
    enabled: Boolean(tenantId),
    queryFn: () => {
      if (!tenantId) throw new Error("Chưa chọn workspace");
      return fetchRouting({ data: { tenantId } });
    },
  });

  const [config, setConfig] = useState<LeadRoutingConfig>(DEFAULT_LEAD_ROUTING);
  useEffect(() => {
    if (query.data?.config) setConfig(query.data.config);
  }, [query.data?.config]);

  const save = useMutation({
    mutationFn: () => {
      if (!tenantId) throw new Error("Chưa chọn workspace");
      return persistRouting({ data: { tenantId, config } });
    },
    onSuccess: () => {
      toast.success("Đã lưu luật phân phối lead");
      void qc.invalidateQueries({ queryKey: ["lead-routing", tenantId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const members = query.data?.members ?? [];
  const projects = query.data?.projects ?? [];

  const toggleFallback = (id: string) =>
    setConfig((prev) => ({
      ...prev,
      fallbackUserIds: prev.fallbackUserIds.includes(id)
        ? prev.fallbackUserIds.filter((item) => item !== id)
        : [...prev.fallbackUserIds, id],
    }));

  const toggleProjectMember = (projectId: string, userId: string) =>
    setConfig((prev) => {
      const rules = [...prev.projectRules];
      const index = rules.findIndex((rule) => rule.projectId === projectId);
      const current = index >= 0 ? rules[index]!.userIds : [];
      const next = current.includes(userId)
        ? current.filter((item) => item !== userId)
        : [...current, userId];
      if (index >= 0) rules[index] = { projectId, userIds: next };
      else rules.push({ projectId, userIds: next });
      return { ...prev, projectRules: rules };
    });

  return (
    <div className="space-y-5 pb-24 lg:pb-6">
      <PageHeader
        title="Phân phối lead tự động"
        sub="Chia khách mới cho Sale theo từng dự án, đặt hạn gọi khách và cảnh báo lead nguội."
        action={
          <Button onClick={() => save.mutate()} disabled={save.isPending || query.isLoading}>
            <Save className="mr-1.5 h-4 w-4" /> Lưu cấu hình
          </Button>
        }
      />

      {query.isLoading ? (
        <SectionCard><p className="py-7 text-center text-sm text-muted-foreground">Đang tải cấu hình…</p></SectionCard>
      ) : query.isError ? (
        <SectionCard><p className="py-7 text-center text-sm text-muted-foreground">Bạn không có quyền xem cấu hình này.</p></SectionCard>
      ) : (
        <>
          <SectionCard title="Nguyên tắc chung">
            <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-3">
              <div className="min-w-0">
                <Label className="text-sm font-semibold">Bật phân phối tự động</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Khách mới từ landing, trang bán hàng và danh thiếp sẽ được chia lần lượt cho Sale ít khách nhất.
                </p>
              </div>
              <Switch
                checked={config.enabled}
                onCheckedChange={(value) => setConfig((prev) => ({ ...prev, enabled: value }))}
              />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border p-3">
                <div className="flex items-center gap-2 text-sm font-semibold"><Clock className="h-4 w-4 text-primary" /> Hạn gọi khách (SLA)</div>
                <p className="mt-1 text-xs text-muted-foreground">Sale phải liên hệ trong khoảng thời gian này, quá hạn sẽ hiện cảnh báo.</p>
                <Select
                  value={String(config.slaMinutes)}
                  onValueChange={(value) => setConfig((prev) => ({ ...prev, slaMinutes: Number(value) }))}
                >
                  <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SLA_MINUTE_OPTIONS.map((minutes) => (
                      <SelectItem key={minutes} value={String(minutes)}>{slaLabel(minutes)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-xl border border-border p-3">
                <div className="flex items-center gap-2 text-sm font-semibold"><Snowflake className="h-4 w-4 text-primary" /> Lead nguội sau</div>
                <p className="mt-1 text-xs text-muted-foreground">Khách đang chăm sóc mà không có cập nhật nào sẽ bị coi là nguội.</p>
                <Select
                  value={String(config.coldDays)}
                  onValueChange={(value) => setConfig((prev) => ({ ...prev, coldDays: Number(value) }))}
                >
                  <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLD_DAY_OPTIONS.map((days) => (
                      <SelectItem key={days} value={String(days)}>{days} ngày</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Sale nhận khách mặc định" action={<Badge variant="outline">Khi dự án chưa có luật riêng</Badge>}>
            <PeoplePicker members={members} selected={config.fallbackUserIds} onToggle={toggleFallback} />
          </SectionCard>

          <SectionCard title="Luật theo dự án" action={<span className="text-xs text-muted-foreground"><Users className="mr-1 inline h-3.5 w-3.5" />Chọn nhóm Sale cho từng dự án</span>}>
            {projects.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Chưa có dự án nào.</p>
            ) : (
              <ul className="space-y-3">
                {projects.map((project) => {
                  const rule = config.projectRules.find((item) => item.projectId === project.id);
                  return (
                    <li key={project.id} className="rounded-xl border border-border p-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{project.name}</p>
                        <Badge variant={rule?.userIds.length ? "secondary" : "outline"} className="shrink-0 text-[10px]">
                          {rule?.userIds.length ? `${rule.userIds.length} Sale` : "Dùng nhóm mặc định"}
                        </Badge>
                      </div>
                      <PeoplePicker
                        members={members}
                        selected={rule?.userIds ?? []}
                        onToggle={(userId) => toggleProjectMember(project.id, userId)}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}
