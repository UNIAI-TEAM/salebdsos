import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { acceptInvitation } from "@/lib/auth.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/accept-invite/$token")({ component: AcceptInvitePage });

function AcceptInvitePage() {
  const { token } = Route.useParams();
  const { session, loading, refreshTenants, switchTenant } = useAuth();
  const nav = useNavigate();
  const accept = useServerFn(acceptInvitation);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      nav({ to: "/login", search: { invite: token } as any, replace: true });
      return;
    }
    (async () => {
      setWorking(true);
      try {
        const r = await accept({ data: { token } });
        await refreshTenants();
        switchTenant(r.tenantId);
        toast.success("Đã tham gia workspace");
        nav({ to: "/dashboard", replace: true });
      } catch (err: any) {
        toast.error(err.message ?? "Lời mời không hợp lệ");
        nav({ to: "/dashboard", replace: true });
      } finally {
        setWorking(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, session?.user?.id]);

  return (
    <div className="min-h-screen grid place-items-center">
      <div className="text-sm text-muted-foreground">{working ? "Đang xử lý lời mời..." : "Đang kiểm tra phiên đăng nhập..."}</div>
    </div>
  );
}
