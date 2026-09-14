import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  BookMarked, Copy, History, Loader2, Pencil, Plus, Search, Trash2, Wand2, X,
} from "lucide-react";
import {
  PROMPT_CATEGORIES,
  PROMPT_CATEGORY_LABEL_VI,
  deleteSalesPrompt,
  listSalesPromptUses,
  listSalesPrompts,
  saveSalesPrompt,
  useSalesPrompt,
  STAGE_VARIABLES,
  STAGE_VARIABLE_LABEL_VI,
} from "@/lib/sales-prompt.functions";
import { getPipeline } from "@/lib/pipeline.functions";

export const Route = createFileRoute("/_app/prompt-library")({
  head: () => ({
    meta: [
      { title: "Thư viện prompt bán hàng — SaleBDS OS" },
      {
        name: "description",
        content:
          "Lưu, phân loại và tái sử dụng các prompt bán hàng đã dùng, kèm lịch sử sử dụng chi tiết.",
      },
      { property: "og:title", content: "Thư viện prompt bán hàng — SaleBDS OS" },
      {
        property: "og:description",
        content: "Lưu, phân loại và tái sử dụng prompt bán hàng kèm lịch sử sử dụng.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PromptLibraryPage,
});

type Row = any;

const emptyDraft = {
  id: undefined as string | undefined,
  name: "",
  category: "general",
  tags: "",
  request: "",
  prompt: "",
  tone: "",
  audience: "",
  cta: "",
  stageId: "",
};

function PromptLibraryPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [draft, setDraft] = useState<typeof emptyDraft | null>(null);
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<string>("all");

  const listFn = useServerFn(listSalesPrompts);
  const saveFn = useServerFn(saveSalesPrompt);
  const delFn = useServerFn(deleteSalesPrompt);
  const useFn = useServerFn(useSalesPrompt);
  const usesFn = useServerFn(listSalesPromptUses);
  const pipelineFn = useServerFn(getPipeline);

  const stagesQ = useQuery({
    queryKey: ["pipeline-stages-lite", tenantId],
    queryFn: () => pipelineFn({ data: { tenantId: tenantId! } }),
    enabled: !!tenantId,
  });
  const stages: Row[] = (stagesQ.data as any)?.stages ?? [];
  const stageName = (id?: string | null) =>
    stages.find((s) => s.id === id)?.name ?? null;

  const listQ = useQuery({
    queryKey: ["sales-prompts", tenantId, category, search, stageFilter],
    queryFn: () =>
      listFn({
        data: {
          tenantId: tenantId!,
          category,
          search: search.trim() || undefined,
          ...(stageFilter !== "all" ? { stageId: stageFilter } : {}),
        },
      }),
    enabled: !!tenantId,
  });

  const usesQ = useQuery({
    queryKey: ["sales-prompt-uses", historyFor],
    queryFn: () => usesFn({ data: { promptId: historyFor! } }),
    enabled: !!historyFor,
  });

  const saveMut = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          id: draft?.id,
          tenantId: tenantId!,
          name: draft!.name,
          category: draft!.category,
          tags: String(draft!.tags || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          request: draft!.request || undefined,
          prompt: draft!.prompt,
          tone: draft!.tone || undefined,
          audience: draft!.audience || undefined,
          cta: draft!.cta || undefined,
          stageId: draft!.stageId || null,
        },
      }),
    onSuccess: () => {
      toast.success("Đã lưu prompt");
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["sales-prompts", tenantId] });
    },
    onError: (e: any) => toast.error(e?.message || "Không lưu được prompt"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Đã xoá prompt");
      qc.invalidateQueries({ queryKey: ["sales-prompts", tenantId] });
    },
    onError: (e: any) => toast.error(e?.message || "Không xoá được"),
  });

  const reuseMut = useMutation({
    mutationFn: (row: Row) => useFn({ data: { id: row.id, tenantId: tenantId! } }),
    onSuccess: (_r, row: Row) => {
      try {
        sessionStorage.setItem(
          "salebds:reuse-sales-prompt",
          JSON.stringify({
            prompt: row.prompt,
            request: row.request ?? "",
            title: row.name,
            audience: row.audience ?? "",
            cta: row.cta ?? "",
            tone: row.tone ?? "",
          }),
        );
      } catch {
        /* ignore */
      }
      qc.invalidateQueries({ queryKey: ["sales-prompts", tenantId] });
      navigate({ to: "/ai-sales-page" });
    },
    onError: (e: any) => toast.error(e?.message || "Không dùng được prompt"),
  });

  const items: Row[] = listQ.data?.items ?? [];
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const it of items) m[it.category] = (m[it.category] ?? 0) + 1;
    return m;
  }, [items]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Thư viện prompt bán hàng"
        sub="Lưu lại prompt đã dùng, phân loại và tái sử dụng cho các yêu cầu sau."
        action={
          <button
            onClick={() => setDraft({ ...emptyDraft })}
            className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Thêm prompt
          </button>
        }
      />

      <SectionCard title="Bộ lọc">
        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc nội dung prompt…"
              className={inputCls + " pl-9"}
            />
          </div>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className={inputCls}
          >
            <option value="all">Tất cả giai đoạn</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                Giai đoạn: {s.name}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap gap-2">
            {["all", ...PROMPT_CATEGORIES].map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`h-8 px-3 rounded-lg border text-[12.5px] font-medium ${
                  category === c
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted"
                }`}
              >
                {c === "all" ? "Tất cả" : PROMPT_CATEGORY_LABEL_VI[c as never]}
                {c !== "all" && counts[c] ? ` (${counts[c]})` : ""}
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      {draft && (
        <SectionCard title={draft.id ? "Sửa prompt" : "Prompt mới"}>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Tên prompt">
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className={inputCls}
                  placeholder="Căn hộ 2PN cho gia đình trẻ"
                />
              </Field>
              <Field label="Phân loại">
                <select
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                  className={inputCls}
                >
                  {PROMPT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {PROMPT_CATEGORY_LABEL_VI[c]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Giai đoạn pipeline áp dụng">
              <select
                value={draft.stageId}
                onChange={(e) => setDraft({ ...draft, stageId: e.target.value })}
                className={inputCls}
              >
                <option value="">Không gắn giai đoạn (dùng chung)</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="rounded-xl border border-border p-3">
              <div className="text-[11.5px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Biến giai đoạn — bấm để chèn vào prompt
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STAGE_VARIABLES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() =>
                      setDraft((d) => (d ? { ...d, prompt: `${d.prompt}{{${v}}}` } : d))
                    }
                    className="h-7 px-2.5 rounded-md border border-border text-[12px] hover:bg-muted"
                    title={STAGE_VARIABLE_LABEL_VI[v]}
                  >
                    {`{{${v}}}`} · {STAGE_VARIABLE_LABEL_VI[v]}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Thẻ (cách nhau bằng dấu phẩy)">
              <input
                value={draft.tags}
                onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
                className={inputCls}
                placeholder="q7, giá tốt, cho thuê"
              />
            </Field>
            <Field label="Yêu cầu gốc của khách hàng">
              <textarea
                value={draft.request}
                onChange={(e) => setDraft({ ...draft, request: e.target.value })}
                rows={3}
                className={inputCls + " py-2 h-auto"}
              />
            </Field>
            <Field label="Nội dung prompt">
              <textarea
                value={draft.prompt}
                onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
                rows={8}
                className={inputCls + " py-2 h-auto font-mono text-[12px]"}
              />
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Giọng điệu">
                <input
                  value={draft.tone}
                  onChange={(e) => setDraft({ ...draft, tone: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Đối tượng">
                <input
                  value={draft.audience}
                  onChange={(e) => setDraft({ ...draft, audience: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Lời kêu gọi">
                <input
                  value={draft.cta}
                  onChange={(e) => setDraft({ ...draft, cta: e.target.value })}
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                disabled={saveMut.isPending || !draft.name.trim() || draft.prompt.trim().length < 10}
                onClick={() => saveMut.mutate()}
                className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold inline-flex items-center gap-2 disabled:opacity-60"
              >
                {saveMut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <BookMarked className="h-4 w-4" />
                )}
                Lưu prompt
              </button>
              <button
                onClick={() => setDraft(null)}
                className="h-10 px-4 rounded-xl border border-border text-[13px] font-medium hover:bg-muted inline-flex items-center gap-2"
              >
                <X className="h-4 w-4" /> Huỷ
              </button>
            </div>
          </div>
        </SectionCard>
      )}

      <SectionCard title={`Prompt đã lưu (${items.length})`}>
        {listQ.isLoading ? (
          <div className="p-6 text-center text-muted-foreground text-[13px]">Đang tải…</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-[13px]">
            Chưa có prompt nào. Hãy lưu prompt từ trang AI Sales Page hoặc thêm mới tại đây.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((it) => (
              <div key={it.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold">{it.name}</div>
                    <div className="text-[11.5px] text-muted-foreground flex items-center gap-2 flex-wrap mt-0.5">
                      <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium">
                        {PROMPT_CATEGORY_LABEL_VI[it.category as never] || it.category}
                      </span>
                      {stageName(it.stage_id) ? (
                        <span className="px-2 py-0.5 rounded-md bg-muted font-medium">
                          Giai đoạn: {stageName(it.stage_id)}
                        </span>
                      ) : null}
                      <span>Đã dùng {it.use_count} lần</span>
                      {it.last_used_at && (
                        <span>· Gần nhất {new Date(it.last_used_at).toLocaleString("vi-VN")}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={reuseMut.isPending}
                      onClick={() => reuseMut.mutate(it)}
                      className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-60"
                    >
                      <Wand2 className="h-3.5 w-3.5" /> Tái sử dụng
                    </button>
                    <IconBtn
                      title="Copy prompt"
                      onClick={() => {
                        navigator.clipboard?.writeText(it.prompt).catch(() => {});
                        toast.success("Đã copy prompt");
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn
                      title="Lịch sử sử dụng"
                      onClick={() => setHistoryFor(historyFor === it.id ? null : it.id)}
                    >
                      <History className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn
                      title="Sửa"
                      onClick={() =>
                        setDraft({
                          id: it.id,
                          name: it.name ?? "",
                          category: it.category ?? "general",
                          tags: (it.tags ?? []).join(", "),
                          request: it.request ?? "",
                          prompt: it.prompt ?? "",
                          tone: it.tone ?? "",
                          audience: it.audience ?? "",
                          cta: it.cta ?? "",
                          stageId: it.stage_id ?? "",
                        })
                      }
                    >
                      <Pencil className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn title="Xoá" onClick={() => delMut.mutate(it.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </IconBtn>
                  </div>
                </div>

                {Array.isArray(it.tags) && it.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {it.tags.map((t: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-muted text-[11.5px]">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                <pre className="text-[12px] text-muted-foreground whitespace-pre-wrap font-mono max-h-28 overflow-hidden rounded-lg bg-muted/40 p-3">
                  {it.prompt}
                </pre>

                {historyFor === it.id && (
                  <div className="rounded-lg border border-border p-3 space-y-1.5">
                    <div className="text-[12px] font-semibold">Lịch sử sử dụng</div>
                    {usesQ.isLoading ? (
                      <div className="text-[12px] text-muted-foreground">Đang tải…</div>
                    ) : (usesQ.data?.items ?? []).length === 0 ? (
                      <div className="text-[12px] text-muted-foreground">Chưa có lần dùng nào.</div>
                    ) : (
                      (usesQ.data?.items ?? []).map((u: any) => (
                        <div key={u.id} className="text-[12px] text-muted-foreground">
                          {new Date(u.used_at).toLocaleString("vi-VN")}
                          {u.note ? ` · ${u.note}` : ""}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

const inputCls =
  "w-full h-10 rounded-lg border border-border bg-card px-3 text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[11.5px] font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </div>
      {children}
    </div>
  );
}

function IconBtn({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="h-9 w-9 rounded-lg border border-border hover:bg-muted inline-flex items-center justify-center"
    >
      {children}
    </button>
  );
}
