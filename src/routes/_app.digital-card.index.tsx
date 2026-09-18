import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Pencil, UserSquare2, QrCode, Send } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getOrCreateMyCard } from "@/lib/card.functions";
import { listCardProjects, listProjectOptions } from "@/lib/card-projects.functions";
import { DigitalCardPresentation } from "@/components/digital-card/presentation";

export const Route = createFileRoute("/_app/digital-card/")({
  component: DigitalCardPage,
  head: () => ({ meta: [
    { title: "Danh thiếp của tôi | SaleBDS OS" },
    { name: "description", content: "Danh thiếp trình chiếu chuyên nghiệp dành cho Sale bất động sản." },
    { property: "og:title", content: "Danh thiếp của tôi | SaleBDS OS" },
    { property: "og:description", content: "Danh thiếp trình chiếu chuyên nghiệp dành cho Sale bất động sản." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function DigitalCardPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const getCard = useServerFn(getOrCreateMyCard);
  const getProjects = useServerFn(listProjectOptions);
  const getSelected = useServerFn(listCardProjects);
  const cardQ = useQuery({ queryKey: ["my-card", tenantId], queryFn: () => getCard({ data: { tenantId: tenantId as string } }), enabled: Boolean(tenantId) });
  const projectsQ = useQuery({ queryKey: ["card-project-options", tenantId], queryFn: () => getProjects({ data: { tenantId: tenantId as string } }), enabled: Boolean(tenantId) });
  const selectedQ = useQuery({ queryKey: ["card-projects", cardQ.data?.id], queryFn: () => getSelected({ data: { cardId: cardQ.data?.id as string } }), enabled: Boolean(cardQ.data?.id) });
  if (!tenantId || cardQ.isLoading || !cardQ.data) return <p className="py-16 text-center text-sm text-muted-foreground">Đang tải danh thiếp…</p>;
  const selected = new Set(selectedQ.data ?? []);
  const projects = (projectsQ.data ?? []).filter((project) => selected.has(project.id));
  const publicUrl = typeof window === "undefined" ? `/c/${cardQ.data.slug}` : `${window.location.origin}/c/${cardQ.data.slug}`;
  const actions = [
    { to: "/digital-card/edit", label: "Sửa danh thiếp", icon: Pencil },
    { to: "/profile", label: "Profile", icon: UserSquare2 },
    { to: "/nfc-codes", label: "NFC & QR", icon: QrCode },
    { to: "/airdrop", label: "AirDrop", icon: Send },
  ] as const;
  return (
    <div className="space-y-4">
      <DigitalCardPresentation card={cardQ.data} projects={projects} publicUrl={publicUrl} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {actions.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground"
          >
            <a.icon className="h-4 w-4" />
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
