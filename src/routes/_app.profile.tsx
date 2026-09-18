import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { IdCard, Pencil } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getOrCreateMyCard } from "@/lib/card.functions";
import { listCardProjects, listProjectOptions } from "@/lib/card-projects.functions";
import { ProfilePresentation } from "@/components/digital-card/presentation";

export const Route = createFileRoute("/_app/profile")({
  component: ProfilePage,
  head: () => ({ meta: [
    { title: "Profile của tôi | SaleBDS OS" },
    { name: "description", content: "Hồ sơ Sale, thông tin liên hệ và các dự án đang bán." },
    { property: "og:title", content: "Profile của tôi | SaleBDS OS" },
    { property: "og:description", content: "Hồ sơ Sale, thông tin liên hệ và các dự án đang bán." },
    { property: "og:type", content: "profile" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function ProfilePage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const getCard = useServerFn(getOrCreateMyCard);
  const getProjects = useServerFn(listProjectOptions);
  const getSelected = useServerFn(listCardProjects);
  const cardQ = useQuery({ queryKey: ["my-card", tenantId], queryFn: () => getCard({ data: { tenantId: tenantId as string } }), enabled: Boolean(tenantId) });
  const projectsQ = useQuery({ queryKey: ["card-project-options", tenantId], queryFn: () => getProjects({ data: { tenantId: tenantId as string } }), enabled: Boolean(tenantId) });
  const selectedQ = useQuery({ queryKey: ["card-projects", cardQ.data?.id], queryFn: () => getSelected({ data: { cardId: cardQ.data?.id as string } }), enabled: Boolean(cardQ.data?.id) });
  if (!tenantId || cardQ.isLoading || !cardQ.data) return <p className="py-16 text-center text-sm text-muted-foreground">Đang tải Profile…</p>;
  const selected = new Set(selectedQ.data ?? []);
  const projects = (projectsQ.data ?? []).filter((project) => selected.has(project.id));
  const publicUrl = typeof window === "undefined" ? `/c/${cardQ.data.slug}` : `${window.location.origin}/c/${cardQ.data.slug}`;
  return <div className="space-y-5"><div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><div className="min-w-0"><h1 className="truncate text-2xl font-semibold">Profile của tôi</h1><p className="text-sm text-muted-foreground">Hồ sơ chi tiết khách hàng nhìn thấy sau khi quét QR.</p></div><div className="flex shrink-0 gap-2"><Link to="/digital-card" aria-label="Mở danh thiếp" className="grid h-10 w-10 place-items-center rounded-lg border border-border"><IdCard className="h-4 w-4" /></Link><Link to="/digital-card/edit" aria-label="Sửa danh thiếp" className="grid h-10 w-10 place-items-center rounded-lg border border-border"><Pencil className="h-4 w-4" /></Link></div></div><ProfilePresentation card={cardQ.data} projects={projects} publicUrl={publicUrl} /></div>;
}
