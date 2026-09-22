import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Play, Save, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getNurtureSettings, runNurtureNow, saveNurtureSettings } from "@/lib/nurture.functions";
import {
  DEFAULT_NURTURE_SETTINGS,
  NURTURE_CHANNEL_OPTIONS,
  NURTURE_STEPS,
  type NurtureSettings,
  type NurtureStepKey,
} from "@/lib/nurture";

export const Route = createFileRoute("/_app/nurture")({
  head: () => ({
    meta: [
      { title: "Nhắc khách tự động — SaleBDS OS" },
      {
        name: "description",
        content:
          "Quy trình tự động: khách gửi thông tin → vào giỏ hàng → hệ thống tự gửi tin nhắc chốt hợp đồng qua Zalo, SMS hoặc email.",
      },
      { property: "og:title", content: "Nhắc khách tự động — SaleBDS OS" },
      {
        property: "og:description",
        content: "Tự gửi tin nhắc khách theo từng bước phễu, không cần gọi tay.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NurturePage,
});

const STEP_LABEL: Record<string, string> = Object.fromEntries(NURTURE_STEPS.map((s) => [s.key, s.label]));
const CHANNEL_LABEL: Record<string, string> = {
  zalo: "Zalo OA",
  sms: "SMS",
  email: "Email",
  note: "Nhắc nội bộ",
};
const STATUS_LABEL: Record<string, string> = {
  sent: "Đã gửi",
  pending: "Chờ kết nối kênh",
  failed: "Lỗi",
};

function NurturePage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const qc = useQueryClient();

  const fetchSettings = useServerFn(getNurtureSettings);
  const fnSave = useServerFn(saveNurtureSettings);
  const fnRun = useServerFn(runNurtureNow);

  const query = useQuery({
    queryKey: ["nurture", tenantId],
    enabled: Boolean(tenantId),
    queryFn: () => fetchSettings({ data: { tenantId: tenantId as string } }),
  });
  const data = query.data;
  const canManage = data?.canManage ?? false;

  const [draft, setDraft] = useState<NurtureSettings>(DEFAULT_NURTURE_SETTINGS);
  useEffect(() => {
    if (data?.settings) setDraft(data.settings);
  }, [data?.settings]);

  const save = useMutation({
    mutationFn: async () => fnSave({ data: { tenantId: tenantId as string, settings: draft } }),
    onSuccess: () => {
      toast.success("Đã lưu quy trình nhắc khách");
      qc.invalidateQueries({ queryKey: ["nurture", tenantId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const run = useMutation({
    mutationFn: async () => fnRun({ data: { tenantId: tenantId as string } }),
    onSuccess: (result) => {
      if (result.skipped) toast.info("Đang có lượt nhắc khác chạy, thử lại sau ít phút.");
      else if (result.sent === 0 && result.failed === 0) toast.info("Chưa có khách nào đến hạn nhắc.");
      else toast.success(`Đã nhắc ${result.sent} khách${result.failed ? `, ${result.failed} lỗi` : ""}`);
      qc.invalidateQueries({ queryKey: ["nurture", tenantId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const setStep = (key: NurtureStepKey, patch: Partial<NurtureSettings["steps"][NurtureStepKey]>) =>
    setDraft((prev) => ({ ...prev, steps: { ...prev.steps, [key]: { ...prev.steps[key], ...patch } } }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nhắc khách tự động"
        sub="Khách gửi thông tin → vào giỏ hàng → hệ thống tự gửi tin nhắc chốt hợp đồng, không phải gọi tay."
        action={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => run.mutate()} disabled={run.isPending}>
                <Play className="mr-2 h-4 w-4" />
                Chạy nhắc ngay
              </Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                <Save className="mr-2 h-4 w-4" />
                Lưu quy trình
              </Button>
            </div>
          ) : undefined
        }
      />

      {!canManage ? (
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Chỉ quản lý sàn được chỉnh quy trình. Anh/chị vẫn xem được lịch sử tin đã nhắc bên dưới.
        </p>
      ) : null}

      <SectionCard
        title="Bật quy trình"
        action={
          <Badge variant={draft.enabled ? "default" : "outline"} className="shrink-0 text-[10px]">
            {draft.enabled ? "Đang chạy tự động" : "Đang tắt"}
          </Badge>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-3">
            <div>
              <p className="text-sm font-medium">Tự gửi tin nhắc khách</p>
              <p className="text-xs text-muted-foreground">
                Hệ thống kiểm tra mỗi giờ và chỉ gửi trong khung giờ cho phép.
              </p>
            </div>
            <Switch
              checked={draft.enabled}
              disabled={!canManage}
              onCheckedChange={(value) => setDraft((prev) => ({ ...prev, enabled: value }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Tối đa mỗi lượt</Label>
              <Input
                type="number"
                min={1}
                max={200}
                disabled={!canManage}
                value={draft.maxPerRun}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, maxPerRun: Number(event.target.value) || 1 }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Gửi từ giờ</Label>
              <Input
                type="number"
                min={0}
                max={23}
                disabled={!canManage}
                value={draft.quietStartHour}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, quietStartHour: Number(event.target.value) || 0 }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Đến giờ</Label>
              <Input
                type="number"
                min={1}
                max={24}
                disabled={!canManage}
                value={draft.quietEndHour}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, quietEndHour: Number(event.target.value) || 21 }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tên hiển thị trong tin</Label>
              <Input
                placeholder="VD: Ngân — SaleBDS"
                disabled={!canManage}
                value={draft.signature}
                onChange={(event) => setDraft((prev) => ({ ...prev, signature: event.target.value }))}
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Các bước nhắc"
        action={
          <Badge variant="outline" className="shrink-0 text-[10px]">
            {"{name} {project} {product} {price} {deadline} {hotline} {agent}"}
          </Badge>
        }
      >
        <div className="space-y-4">
          {NURTURE_STEPS.map((step) => {
            const value = draft.steps[step.key];
            return (
              <div key={step.key} className="space-y-3 rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">{step.label}</p>
                    <p className="text-xs text-muted-foreground">{step.hint}</p>
                  </div>
                  <Switch
                    checked={value.enabled}
                    disabled={!canManage}
                    onCheckedChange={(checked) => setStep(step.key, { enabled: checked })}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{step.delayLabel} (giờ)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={720}
                      disabled={!canManage}
                      value={value.delayHours}
                      onChange={(event) => setStep(step.key, { delayHours: Number(event.target.value) || 1 })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Kênh gửi</Label>
                    <Select
                      value={value.channel}
                      disabled={!canManage}
                      onValueChange={(next) => setStep(step.key, { channel: next as typeof value.channel })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {NURTURE_CHANNEL_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Nội dung tin</Label>
                  <Textarea
                    rows={3}
                    disabled={!canManage}
                    value={value.template}
                    onChange={(event) => setStep(step.key, { template: event.target.value })}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title="Tin đã nhắc gần đây"
        action={
          <Badge variant="outline" className="shrink-0 text-[10px]">
            <Sparkles className="mr-1 h-3 w-3" />
            {data?.history.length ?? 0} tin
          </Badge>
        }
      >
        {!data?.history.length ? (
          <p className="py-7 text-center text-sm text-muted-foreground">
            Chưa có tin nhắc nào. Bật quy trình rồi bấm “Chạy nhắc ngay” để thử.
          </p>
        ) : (
          <div className="space-y-3">
            {data.history.map((item) => (
              <div key={item.id} className="rounded-xl border border-border p-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="text-sm font-medium text-foreground">{item.leadName}</span>
                  {item.leadPhone ? <span>{item.leadPhone}</span> : null}
                  <Badge variant="outline" className="text-[10px]">
                    {STEP_LABEL[item.step] ?? item.step}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {CHANNEL_LABEL[item.channel] ?? item.channel}
                  </Badge>
                  <Badge
                    variant={item.status === "failed" ? "destructive" : item.status === "sent" ? "default" : "outline"}
                    className="text-[10px]"
                  >
                    {STATUS_LABEL[item.status] ?? item.status}
                  </Badge>
                  <span>{new Date(item.sentAt).toLocaleString("vi-VN")}</span>
                </div>
                <p className="mt-2 text-sm">{item.body}</p>
                {item.error ? <p className="mt-1 text-xs text-amber-500">{item.error}</p> : null}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
