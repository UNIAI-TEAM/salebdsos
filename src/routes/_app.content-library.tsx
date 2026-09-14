// Quản lý prompt & landing đã tạo, phân loại theo ngành, xem trước và xoá
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Eye, Trash2, Copy, ExternalLink, Search, FileText, Globe } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { INDUSTRIES, INDUSTRY_LABEL_VI, industryLabel } from "@/lib/industries";
import {
  listSalesPrompts, deleteSalesPrompt, saveSalesPrompt, PROMPT_CATEGORY_LABEL_VI,
} from "@/lib/sales-prompt.functions";
import { listSalesPages, deleteSalesPage, updateSalesPage } from "@/lib/ai-sales-page.functions";

export const Route = createFileRoute("/_app/content-library")({
  head: () => ({
    meta: [
      { title: "Kho nội dung: Prompt & Landing — SaleBDS OS" },
      {
        name: "description",
        content: "Quản lý prompt bán hàng và landing đã tạo, phân loại theo ngành, xem trước nhanh và xoá khi không dùng.",
      },
      { property: "og:title", content: "Kho nội dung: Prompt & Landing — SaleBDS OS" },
      { property: "og:description", content: "Phân loại theo ngành, xem trước và xoá prompt cùng landing đã tạo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContentLibraryPage,
});

const inputCls =
  "h-10 w-full rounded-xl border border-border bg-card px-3 text-[13.5px] outline-none focus:ring-2 focus:ring-primary/25";

type Tab = "prompts" | "landings";

function ContentLibraryPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const qc = useQueryClient();

  const [tab, setTab] = useState<Tab>("prompts");
  const [industry, setIndustry] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<{ title: string; body: string; url?: string } | null>(null);

  const listPromptsFn = useServerFn(listSalesPrompts);
  const delPromptFn = useServerFn(deleteSalesPrompt);
  const savePromptFn = useServerFn(saveSalesPrompt);
  const listPagesFn = useServerFn(listSalesPages);
  const delPageFn = useServerFn(deleteSalesPage);
  const updatePageFn = useServerFn(updateSalesPage);

  const promptsQ = useQuery({
    queryKey: ["cl-prompts", tenantId, industry, search],
    queryFn: () =>
      listPromptsFn({
        data: { tenantId: tenantId!, industry: industry === "all" ? undefined : industry, search: search || undefined },
      }),
    enabled: !!tenantId && tab === "prompts",
  });

  const pagesQ = useQuery({
    queryKey: ["cl-pages", tenantId],
    queryFn: () => listPagesFn({ data: { tenantId: tenantId!, page: 1, pageSize: 50 } }),
    enabled: !!tenantId && tab === "landings",
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["cl-prompts", tenantId] });
    qc.invalidateQueries({ queryKey: ["cl-pages", tenantId] });
  };

  const delPrompt = useMutation({
    mutationFn: (id: string) => delPromptFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Đã xoá prompt");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message || "Không xoá được"),
  });
  const delPage = useMutation({
    mutationFn: (id: string) => delPageFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Đã xoá landing");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message || "Không xoá được"),
  });
  const setPromptIndustry = useMutation({
    mutationFn: (v: { row: any; industry: string }) =>
      savePromptFn({
        data: {
          id: v.row.id,
          tenantId: v.row.tenant_id,
          name: v.row.name,
          category: v.row.category ?? "general",
          industry: v.industry || null,
          tags: v.row.tags ?? [],
          prompt: v.row.prompt,
          request: v.row.request ?? undefined,
          tone: v.row.tone ?? undefined,
          audience: v.row.audience ?? undefined,
          cta: v.row.cta ?? undefined,
          stageId: v.row.stage_id ?? null,
          variables: v.row.variables ?? {},
        },
      }),
    onSuccess: () => {
      toast.success("Đã cập nhật ngành");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message || "Không cập nhật được"),
  });
  const setPageIndustry = useMutation({
    mutationFn: (v: { id: string; industry: string }) =>
      updatePageFn({ data: { id: v.id, industry: v.industry || null } }),
    onSuccess: () => {
      toast.success("Đã cập nhật ngành");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message || "Không cập nhật được"),
  });

  const prompts = (promptsQ.data?.items ?? []) as any[];
  const allPages = (pagesQ.data?.items ?? []) as any[];
  const pages = allPages.filter((p) => {
    const okInd = industry === "all" || (p.industry ?? "") === industry;
    const q = search.trim().toLowerCase();
    const okQ = !q || (p.title ?? "").toLowerCase().includes(q) || (p.slug ?? "").toLowerCase().includes(q);
    return okInd && okQ;
  });

  const industrySelect = (value: string | null, onChange: (v: string) => void) => (
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={inputCls + " h-8 w-auto text-[12.5px]"}>
      <option value="">Chưa phân loại</option>
      {INDUSTRIES.map((i) => (
        <option key={i} value={i}>
          {INDUSTRY_LABEL_VI[i]}
        </option>
      ))}
    </select>
  );

  const landingBody = (p: any) => {
    const o = (p.output ?? {}) as Record<string, any>;
    const parts = [
      o.headline && `# ${o.headline}`,
      o.subheadline,
      Array.isArray(o.benefits) && o.benefits.length ? o.benefits.map((b: string) => `• ${b}`).join("\n") : null,
      o.offer && `Ưu đãi: ${o.offer}`,
      o.social_proof,
      o.cta_primary && `CTA: ${o.cta_primary}`,
    ].filter(Boolean);
    return parts.join("\n\n") || "Chưa có nội dung.";
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kho nội dung"
        sub="Prompt bán hàng và landing đã tạo, phân loại theo ngành — xem trước hoặc xoá nhanh"
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-border bg-card p-1">
          {([["prompts", "Prompt", FileText], ["landings", "Landing", Globe]] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${
                tab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
        <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={inputCls + " w-auto"}>
          <option value="all">Tất cả ngành</option>
          {INDUSTRIES.map((i) => (
            <option key={i} value={i}>
              {INDUSTRY_LABEL_VI[i]}
            </option>
          ))}
        </select>
        <div className="relative min-w-[220px] flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc nội dung…"
            className={inputCls + " pl-9"}
          />
        </div>
      </div>

      {tab === "prompts" ? (
        <SectionCard title={`Prompt đã lưu (${prompts.length})`}>
          {promptsQ.isLoading ? (
            <p className="text-[13px] text-muted-foreground">Đang tải…</p>
          ) : prompts.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">Chưa có prompt nào phù hợp.</p>
          ) : (
            <div className="space-y-2">
              {prompts.map((p) => (
                <div key={p.id} className="rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13.5px] font-semibold">{p.name}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-semibold text-muted-foreground">
                      {PROMPT_CATEGORY_LABEL_VI[p.category as keyof typeof PROMPT_CATEGORY_LABEL_VI] ?? p.category}
                    </span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10.5px] font-semibold text-primary">
                      {industryLabel(p.industry)}
                    </span>
                    <span className="text-[11.5px] text-muted-foreground">Đã dùng {p.use_count ?? 0} lần</span>
                    <div className="ml-auto flex items-center gap-2">
                      {industrySelect(p.industry, (v) => setPromptIndustry.mutate({ row: p, industry: v }))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreview({ title: p.name, body: p.prompt })}
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" /> Xem trước
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm(`Xoá prompt "${p.name}"?`)) delPrompt.mutate(p.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[12.5px] text-muted-foreground">{p.prompt}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      ) : (
        <SectionCard title={`Landing đã tạo (${pages.length})`}>
          {pagesQ.isLoading ? (
            <p className="text-[13px] text-muted-foreground">Đang tải…</p>
          ) : pages.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">Chưa có landing nào phù hợp.</p>
          ) : (
            <div className="space-y-2">
              {pages.map((p) => {
                const url = p.slug ? `${window.location.origin}/p/${p.slug}` : "";
                return (
                  <div key={p.id} className="rounded-xl border border-border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13.5px] font-semibold">{p.title || "Landing"}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                          p.is_published ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {p.is_published ? "Đang công khai" : "Chưa xuất bản"}
                      </span>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10.5px] font-semibold text-primary">
                        {industryLabel(p.industry)}
                      </span>
                      <span className="text-[11.5px] text-muted-foreground">/p/{p.slug || "—"}</span>
                      <div className="ml-auto flex items-center gap-2">
                        {industrySelect(p.industry, (v) => setPageIndustry.mutate({ id: p.id, industry: v }))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreview({ title: p.title || "Landing", body: landingBody(p), url })}
                        >
                          <Eye className="mr-1.5 h-3.5 w-3.5" /> Xem trước
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm(`Xoá landing "${p.title || "Landing"}"?`)) delPage.mutate(p.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{preview?.title}</DialogTitle>
          </DialogHeader>
          <pre className="max-h-[55vh] overflow-auto whitespace-pre-wrap rounded-xl bg-muted p-3 text-[12.5px] leading-relaxed">
            {preview?.body}
          </pre>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard?.writeText(preview?.body ?? "").catch(() => {});
                toast.success("Đã copy nội dung");
              }}
            >
              <Copy className="mr-1.5 h-4 w-4" /> Copy
            </Button>
            {preview?.url ? (
              <a href={preview.url} target="_blank" rel="noreferrer">
                <Button>
                  <ExternalLink className="mr-1.5 h-4 w-4" /> Mở trang công khai
                </Button>
              </a>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
