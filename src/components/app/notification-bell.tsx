// Chuông thông báo: hiện khách mới để lại thông tin trên landing (realtime),
// bấm vào là mở ngay hồ sơ khách trong app.
import { Bell, UserPlus } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  listNotifications, markNotificationRead, markAllNotificationsRead,
} from "@/lib/notification.functions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

export function NotificationBell() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const qc = useQueryClient();
  const nav = useNavigate();

  const fnList = useServerFn(listNotifications);
  const fnRead = useServerFn(markNotificationRead);
  const fnReadAll = useServerFn(markAllNotificationsRead);

  const q = useQuery({
    queryKey: ["notifications", tenantId],
    queryFn: () => fnList({ data: { tenantId: tenantId! } }),
    enabled: !!tenantId,
    refetchInterval: 60_000,
  });

  const read = useMutation({
    mutationFn: (id: string) => fnRead({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", tenantId] }),
  });
  const readAll = useMutation({
    mutationFn: () => fnReadAll({ data: { tenantId: tenantId! } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", tenantId] }),
  });

  // Realtime: có khách mới là hiện ngay
  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel(`notifications-${tenantId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `tenant_id=eq.${tenantId}` },
        (payload) => {
          const n = payload.new as { title?: string; body?: string; link?: string };
          qc.invalidateQueries({ queryKey: ["notifications", tenantId] });
          qc.invalidateQueries({ queryKey: ["leads", tenantId] });
          toast.success(n.title ?? "Khách mới", {
            description: n.body ?? undefined,
            action: n.link
              ? { label: "Xem khách", onClick: () => nav({ to: n.link as string }) }
              : undefined,
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tenantId, qc, nav]);

  const items = (q.data?.items ?? []) as any[];
  const unread = q.data?.unread ?? 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-muted transition" aria-label="Thông báo">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold grid place-items-center ring-2 ring-background">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,22rem)] p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-[13px] font-semibold">Thông báo</span>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-[12px]"
              onClick={() => readAll.mutate()} disabled={readAll.isPending}>
              Đánh dấu đã đọc
            </Button>
          )}
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {q.isLoading ? (
            <div className="p-6 text-center text-[13px] text-muted-foreground">Đang tải…</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-[13px] text-muted-foreground">Chưa có thông báo nào.</div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={`w-full text-left px-3 py-2.5 flex gap-2.5 hover:bg-muted/60 transition ${n.is_read ? "" : "bg-primary/5"}`}
                    onClick={() => {
                      if (!n.is_read) read.mutate(n.id);
                      if (n.link) nav({ to: n.link });
                    }}
                  >
                    <span className="mt-0.5 h-8 w-8 shrink-0 rounded-full bg-primary/10 text-primary grid place-items-center">
                      <UserPlus className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold truncate">{n.title}</span>
                      {n.body && <span className="block text-[12px] text-muted-foreground line-clamp-2">{n.body}</span>}
                      <span className="block text-[11px] text-muted-foreground mt-0.5">{timeAgo(n.created_at)}</span>
                    </span>
                    {!n.is_read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
