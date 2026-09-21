import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BellRing, CheckCircle2, Smartphone, Share2, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  checkPushSupport,
  deviceLabel,
  isStandalone,
  subscribeToPush,
  unsubscribeFromPush,
  type PushSupport,
} from "@/lib/push-client";
import {
  getPushConfig,
  registerPushDevice,
  removePushDevice,
  sendTestPush,
  setPushDeviceEnabled,
} from "@/lib/push.functions";

export const Route = createFileRoute("/_app/mobile-app")({
  head: () => ({
    meta: [
      { title: "Ứng dụng điện thoại & thông báo đẩy — SaleBDS OS" },
      {
        name: "description",
        content: "Cài SaleBDS OS lên điện thoại như một ứng dụng và bật thông báo đẩy khi có khách mới, khách chat hoặc quá hạn gọi.",
      },
      { property: "og:title", content: "Ứng dụng điện thoại & thông báo đẩy — SaleBDS OS" },
      { property: "og:description", content: "Cài app lên màn hình chính và nhận thông báo khách mới ngay trên điện thoại." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MobileAppPage,
});

const IOS_STEPS = [
  "Mở link app bằng Safari trên iPhone.",
  "Bấm nút Chia sẻ (hình vuông có mũi tên).",
  "Chọn “Thêm vào MH chính” rồi bấm Thêm.",
  "Mở app từ biểu tượng SaleBDS ở màn hình chính.",
];

const ANDROID_STEPS = [
  "Mở link app bằng Chrome trên Android.",
  "Bấm menu ba chấm ở góc phải.",
  "Chọn “Thêm vào Màn hình chính” / “Cài ứng dụng”.",
  "Mở app từ biểu tượng SaleBDS.",
];

function MobileAppPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const qc = useQueryClient();
  const [support, setSupport] = useState<PushSupport | null>(null);
  const [installed, setInstalled] = useState(false);

  const fetchConfig = useServerFn(getPushConfig);
  const register = useServerFn(registerPushDevice);
  const remove = useServerFn(removePushDevice);
  const toggle = useServerFn(setPushDeviceEnabled);
  const test = useServerFn(sendTestPush);

  useEffect(() => {
    setSupport(checkPushSupport());
    setInstalled(isStandalone());
  }, []);

  const config = useQuery({ queryKey: ["push-config"], queryFn: () => fetchConfig({}) });
  const devices = config.data?.devices ?? [];
  const publicKey = config.data?.publicKey ?? null;

  const enableMutation = useMutation({
    mutationFn: async () => {
      if (!publicKey) throw new Error("Hệ thống chưa có khoá gửi thông báo.");
      const sub = await subscribeToPush(publicKey);
      await register({
        data: {
          ...sub,
          ...(tenantId ? { tenantId } : {}),
          label: deviceLabel(),
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : undefined,
        },
      });
    },
    onSuccess: () => {
      toast.success("Đã bật thông báo trên thiết bị này.");
      void qc.invalidateQueries({ queryKey: ["push-config"] });
      setSupport(checkPushSupport());
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const disableMutation = useMutation({
    mutationFn: async () => {
      const endpoint = await unsubscribeFromPush();
      if (endpoint) await remove({ data: { endpoint } });
    },
    onSuccess: () => {
      toast.success("Đã tắt thông báo trên thiết bị này.");
      void qc.invalidateQueries({ queryKey: ["push-config"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const testMutation = useMutation({
    mutationFn: () => test({}),
    onSuccess: (result) => {
      if (result.sent > 0) toast.success(`Đã gửi thông báo thử tới ${result.sent} thiết bị.`);
      else toast.error("Chưa có thiết bị nào nhận được. Hãy bật thông báo trên điện thoại trước.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (input: { id: string; enabled: boolean }) => toggle({ data: input }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["push-config"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const activeDevices = devices.filter((d) => d.enabled).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Ứng dụng điện thoại & thông báo"
        sub="Cài SaleBDS lên màn hình chính như một ứng dụng, bật thông báo khi có khách mới và xem phễu ngay trên điện thoại."
        action={
          <Button size="sm" variant="outline" onClick={() => testMutation.mutate()} disabled={testMutation.isPending}>
            <BellRing className="h-4 w-4" />
            Gửi thông báo thử
          </Button>
        }
      />

      <SectionCard
        title="Thông báo đẩy trên thiết bị này"
        action={
          <Badge variant={activeDevices > 0 ? "secondary" : "outline"} className="text-[10px]">
            {activeDevices} thiết bị đang bật
          </Badge>
        }
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="gap-1 text-[10px]">
              <Smartphone className="h-3 w-3" />
              {installed ? "Đang mở từ app đã cài" : "Đang mở trong trình duyệt"}
            </Badge>
            {support?.permission === "granted" ? (
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <CheckCircle2 className="h-3 w-3" />
                Đã cho phép hiện thông báo
              </Badge>
            ) : null}
          </div>

          {support && !support.supported ? (
            <p className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              {support.reason}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => enableMutation.mutate()}
              disabled={enableMutation.isPending || !support?.supported || !publicKey}
            >
              <BellRing className="h-4 w-4" />
              Bật thông báo trên thiết bị này
            </Button>
            <Button size="sm" variant="outline" onClick={() => disableMutation.mutate()} disabled={disableMutation.isPending}>
              Tắt trên thiết bị này
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Thông báo được gửi khi có khách mới từ landing, QR danh thiếp, khách chat trên trang dự án và khách yêu cầu gọi lại.
            Thông báo chỉ chạy trên bản đã publish (không chạy trong màn hình xem trước).
          </p>
        </div>
      </SectionCard>

      <SectionCard title="Thiết bị đã đăng ký">
        {config.isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Đang tải…</p>
        ) : devices.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Chưa có thiết bị nào. Bấm “Bật thông báo” ở trên.</p>
        ) : (
          <ul className="divide-y divide-border/70">
            {devices.map((device) => (
              <li key={device.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{device.label || "Thiết bị"}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {device.last_seen_at
                      ? `Nhận gần nhất: ${new Date(device.last_seen_at).toLocaleString("vi-VN")}`
                      : "Chưa nhận thông báo nào"}
                    {device.last_error ? ` · ${device.last_error}` : ""}
                  </p>
                </div>
                <Badge variant={device.enabled ? "secondary" : "outline"} className="shrink-0 text-[10px]">
                  {device.enabled ? "Đang bật" : "Đã tắt"}
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0"
                  aria-label={device.enabled ? "Tắt thiết bị" : "Bật thiết bị"}
                  onClick={() => toggleMutation.mutate({ id: device.id, enabled: !device.enabled })}
                >
                  {device.enabled ? <Trash2 className="h-4 w-4" /> : <BellRing className="h-4 w-4" />}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <div className="grid gap-3 md:grid-cols-2">
        <SectionCard title="Cài trên iPhone (Safari)">
          <ol className="space-y-2 text-sm text-muted-foreground">
            {IOS_STEPS.map((step, index) => (
              <li key={step} className="flex gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </SectionCard>
        <SectionCard title="Cài trên Android (Chrome)">
          <ol className="space-y-2 text-sm text-muted-foreground">
            {ANDROID_STEPS.map((step, index) => (
              <li key={step} className="flex gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </SectionCard>
      </div>

      <SectionCard title="Gửi link cài app cho chuyên viên">
        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
            {typeof window !== "undefined" ? `${window.location.origin}/digital-card` : "/digital-card"}
          </code>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const link = `${window.location.origin}/digital-card`;
              void navigator.clipboard.writeText(link).then(() => toast.success("Đã sao chép link cài app."));
            }}
          >
            <Share2 className="h-4 w-4" />
            Sao chép
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}
