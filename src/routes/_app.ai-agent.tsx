import { createFileRoute } from "@tanstack/react-router";
import { AiAgentChat } from "@/components/app/ai-agent-chat";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/app/ui";

export const Route = createFileRoute("/_app/ai-agent")({
  head: () => ({
    meta: [
      { title: "Trợ lý AI điều hành — SaleBDS OS" },
      { name: "description", content: "Hỏi doanh số, căn còn trống, tiến độ dự án và công nợ bằng tiếng Việt." },
      { property: "og:title", content: "Trợ lý AI điều hành — SaleBDS OS" },
      { property: "og:description", content: "Tra cứu số liệu sàn bất động sản qua chat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgentPage,
});

function AgentPage() {
  const { currentTenant } = useAuth();
  if (!currentTenant) return null;
  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] max-w-3xl flex-col">
      <PageHeader title="Trợ lý AI điều hành" sub="Hỏi số liệu sàn bằng tiếng Việt — AI tra cứu dữ liệu thật." />
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border bg-card">
        <AiAgentChat tenantId={currentTenant.id} />
      </div>
    </div>
  );
}
