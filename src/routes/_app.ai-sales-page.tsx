import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/app/ui";
import {
  Sparkles, Wand2, Trash2, Copy, Loader2, FileText, User,
  Pencil, Globe, EyeOff, ExternalLink, Eye, Save, X, BookMarked, Library,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listSalesPages,
  generateSalesPage,
  deleteSalesPage,
  updateSalesPage,
  setSalesPagePublish,
  draftSalesBrief,
  previewSalesPrompt,
  generateSeoArticle,
  TONES,
  TONE_LABEL_VI,
} from "@/lib/ai-sales-page.functions";
import { saveSalesPrompt } from "@/lib/sales-prompt.functions";
import { Link } from "@tanstack/react-router";
import { listLeads } from "@/lib/lead.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/ai-sales-page")({ component: AISalesPage });


type Tone = (typeof TONES)[number];

function AISalesPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const qc = useQueryClient();

  const [leadId, setLeadId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState<Tone>("professional");
  const [cta, setCta] = useState("");
  const [extra, setExtra] = useState("");
  const [request, setRequest] = useState("");
  const [prompt, setPrompt] = useState("");
  const [showPrompt, setShowPrompt] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const listFn = useServerFn(listSalesPages);
  const listLeadsFn = useServerFn(listLeads);
  const generateFn = useServerFn(generateSalesPage);
  const deleteFn = useServerFn(deleteSalesPage);
  const draftFn = useServerFn(draftSalesBrief);
  const previewFn = useServerFn(previewSalesPrompt);

  const briefMut = useMutation({
    mutationFn: () => draftFn({ data: { tenantId: tenantId!, request, leadId: leadId || undefined } }),
    onSuccess: (r: any) => {
      setTitle(r.title || "");
      setAudience(r.audience || "");
      setTone(r.tone as Tone);
      setCta(r.cta || "");
      setExtra(r.extra || "");
      setPrompt(r.prompt || "");
      setShowPrompt(true);
      toast.success("AI đã tạo brief và prompt");
    },
    onError: (e: any) => toast.error(e?.message || "Không phân tích được yêu cầu"),
  });

  const promptMut = useMutation({
    mutationFn: () =>
      previewFn({
        data: {
          tenantId: tenantId!,
          leadId: leadId || undefined,
          title: title || undefined,
          audience: audience || undefined,
          tone,
          cta: cta || undefined,
          extra: extra || request || undefined,
        },
      }),
    onSuccess: (r: any) => {
      setPrompt(r.prompt || "");
      setShowPrompt(true);
    },
    onError: (e: any) => toast.error(e?.message || "Không tạo được prompt"),
  });


  // Lưu prompt hiện tại vào thư viện để tái sử dụng
  const savePromptFn = useServerFn(saveSalesPrompt);
  const savePromptMut = useMutation({
    mutationFn: () =>
      savePromptFn({
        data: {
          tenantId: tenantId!,
          name: (title || "Prompt bán hàng").slice(0, 200),
          category: "general",
          tags: [],
          request: request || undefined,
          prompt: prompt.trim(),
          tone,
          audience: audience || undefined,
          cta: cta || undefined,
        },
      }),
    onSuccess: () => toast.success("Đã lưu prompt vào thư viện"),
    onError: (e: any) => toast.error(e?.message || "Không lưu được prompt"),
  });

  // Nhận prompt tái sử dụng từ Thư viện prompt
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("salebds:reuse-sales-prompt");
      if (!raw) return;
      sessionStorage.removeItem("salebds:reuse-sales-prompt");
      const r = JSON.parse(raw);
      if (r?.prompt) {
        setPrompt(r.prompt);
        setShowPrompt(true);
      }
      if (r?.request) setRequest(r.request);
      if (r?.title) setTitle(r.title);
      if (r?.audience) setAudience(r.audience);
      if (r?.cta) setCta(r.cta);
      if (r?.tone) setTone(r.tone as Tone);
      toast.success("Đã nạp prompt từ thư viện");
    } catch {
      /* ignore */
    }
  }, []);

  const historyQ = useQuery({
    queryKey: ["ai-sales-pages", tenantId],
    queryFn: () => listFn({ data: { tenantId: tenantId!, page: 1, pageSize: 30 } }),
    enabled: !!tenantId,
  });

  const leadsQ = useQuery({
    queryKey: ["leads-lite", tenantId],
    queryFn: () => listLeadsFn({ data: { tenantId: tenantId!, page: 1, pageSize: 50 } }),
    enabled: !!tenantId,
  });

  const genMut = useMutation({
    mutationFn: (opts?: { autoPublish?: boolean }) =>
      generateFn({
        data: {
          tenantId: tenantId!,
          leadId: leadId || undefined,
          title: title || undefined,
          audience: audience || undefined,
          tone,
          cta: cta || undefined,
          extra: extra || request || undefined,
          promptOverride: prompt.trim() || undefined,
          autoPublish: opts?.autoPublish ?? false,
        },
      }),
    onSuccess: (r: any) => {
      setSelectedId(r.page?.id ?? null);
      qc.invalidateQueries({ queryKey: ["ai-sales-pages", tenantId] });
      if (r?.published && r.page?.slug) {
        const url = `${window.location.origin}/p/${r.page.slug}`;
        navigator.clipboard?.writeText(url).catch(() => {});
        toast.success("Đã tạo & xuất bản landing — đã copy đường dẫn");
      } else if (r?.publishError) {
        toast.warning("Đã tạo nội dung nhưng chưa xuất bản được. Hãy thử xuất bản lại.");
      } else {
        toast.success("Đã tạo AI Sales Page");
      }
    },
    onError: (e: any) => toast.error(e?.message || "Không tạo được"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Đã xoá");
      setSelectedId(null);
      qc.invalidateQueries({ queryKey: ["ai-sales-pages", tenantId] });
    },
  });

  const items = historyQ.data?.items ?? [];
  const selected = items.find((x: any) => x.id === selectedId) ?? items[0] ?? null;
  const out: any = selected?.output ?? null;

  // ---- Edit + publish ----
  const updateFn = useServerFn(updateSalesPage);
  const publishFn = useServerFn(setSalesPagePublish);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<any>({});
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);
  useEffect(() => {
    setEditing(false);
  }, [selected?.id]);

  const seoFn = useServerFn(generateSeoArticle);
  const seoArticle: any = out?.seo_article ?? null;
  const seoMut = useMutation({
    mutationFn: () => seoFn({ data: { id: selected!.id, origin: origin || undefined } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-sales-pages", tenantId] });
      toast.success("Đã sinh bài viết SEO");
    },
    onError: (e: any) => toast.error(e?.message || "Không sinh được bài viết SEO"),
  });


  const startEdit = () => {
    if (!selected) return;
    setDraft({
      title: selected.title ?? "",
      slug: selected.slug ?? "",
      headline: out?.headline ?? "",
      subheadline: out?.subheadline ?? "",
      benefits: Array.isArray(out?.benefits) ? out.benefits.join("\n") : "",
      offer: out?.offer ?? "",
      social_proof: out?.social_proof ?? "",
      cta_primary: out?.cta_primary ?? "",
      cta_secondary: out?.cta_secondary ?? "",
      form_intro: out?.form_intro ?? "",
    });
    setEditing(true);
  };

  const saveMut = useMutation({
    mutationFn: () =>
      updateFn({
        data: {
          id: selected.id,
          title: draft.title || selected.title || "Trang bán hàng",
          slug: draft.slug || null,
          output: {
            headline: draft.headline || null,
            subheadline: draft.subheadline || null,
            benefits: String(draft.benefits || "")
              .split("\n")
              .map((s: string) => s.trim())
              .filter(Boolean)
              .slice(0, 10),
            offer: draft.offer || null,
            social_proof: draft.social_proof || null,
            cta_primary: draft.cta_primary || null,
            cta_secondary: draft.cta_secondary || null,
            form_intro: draft.form_intro || null,
          },
        },
      }),
    onSuccess: () => {
      toast.success("Đã lưu nội dung");
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["ai-sales-pages", tenantId] });
    },
    onError: (e: any) => toast.error(e?.message || "Không lưu được"),
  });

  const pubMut = useMutation({
    mutationFn: (v: { id: string; is_published: boolean }) => publishFn({ data: v }),
    onSuccess: (r: any) => {
      toast.success(r?.is_published ? "Đã xuất bản trang" : "Đã ẩn trang");
      qc.invalidateQueries({ queryKey: ["ai-sales-pages", tenantId] });
    },
    onError: (e: any) => toast.error(e?.message || "Không đổi được trạng thái"),
  });

  const publicUrl = selected?.slug ? `${origin}/p/${selected.slug}` : "";



  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Sales Page"
        sub="Tạo landing page bán hàng cá nhân hoá bằng AI từ thông tin lead / khách hàng."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <SectionCard title="Tham số tạo" className="lg:col-span-1">
          <div className="space-y-3 p-1">
            <Field label="Yêu cầu của khách hàng">
              <textarea
                value={request}
                onChange={(e) => setRequest(e.target.value)}
                rows={4}
                className={inputCls + " py-2 h-auto"}
                placeholder="VD: Anh cần căn 2PN Ocean Park cho gia đình trẻ, ngân sách 3 tỷ, muốn nhấn ưu đãi tháng 9 và mời xem nhà mẫu cuối tuần…"
              />
            </Field>
            <button
              disabled={!tenantId || request.trim().length < 5 || briefMut.isPending}
              onClick={() => briefMut.mutate()}
              className="w-full h-10 rounded-xl border border-border text-[13px] font-semibold inline-flex items-center justify-center gap-2 hover:bg-muted disabled:opacity-60"
            >
              {briefMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {briefMut.isPending ? "Đang phân tích..." : "AI phân tích & sinh prompt"}
            </button>
            <Field label="Lead / khách hàng">

              <select
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-card px-3 text-[13px]"
              >
                <option value="">— Không gắn lead —</option>
                {(leadsQ.data?.rows ?? []).map((l: any) => (
                  <option key={l.id} value={l.id}>
                    {l.full_name || l.phone || l.email || l.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tiêu đề (tuỳ chọn)">
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="VD: Ưu đãi Vinhomes Ocean Park 2" />
            </Field>
            <Field label="Đối tượng">
              <input value={audience} onChange={(e) => setAudience(e.target.value)} className={inputCls} placeholder="VD: Gia đình trẻ, ngân sách 3 tỷ" />
            </Field>
            <Field label="Giọng điệu">
              <select value={tone} onChange={(e) => setTone(e.target.value as Tone)} className={inputCls}>
                {TONES.map((t) => (
                  <option key={t} value={t}>
                    {TONE_LABEL_VI[t]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="CTA mong muốn">
              <input value={cta} onChange={(e) => setCta(e.target.value)} className={inputCls} placeholder="VD: Đặt lịch xem nhà mẫu" />
            </Field>
            <Field label="Yêu cầu thêm">
              <textarea value={extra} onChange={(e) => setExtra(e.target.value)} rows={3} className={inputCls + " py-2 h-auto"} placeholder="Ghi chú về ưu đãi, điểm nhấn..." />
            </Field>

            <div className="rounded-xl border border-border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11.5px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Prompt gửi cho AI
                </div>
                <div className="flex gap-1.5">
                  <button
                    disabled={!tenantId || promptMut.isPending}
                    onClick={() => promptMut.mutate()}
                    className="h-7 px-2.5 rounded-md border border-border text-[12px] inline-flex items-center gap-1 hover:bg-muted disabled:opacity-60"
                  >
                    {promptMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                    Tạo lại
                  </button>
                  {prompt ? (
                    <button
                      onClick={() => setShowPrompt((v) => !v)}
                      className="h-7 px-2.5 rounded-md border border-border text-[12px] hover:bg-muted"
                    >
                      {showPrompt ? "Ẩn" : "Xem"}
                    </button>
                  ) : null}
                  {prompt ? (
                    <button
                      disabled={savePromptMut.isPending}
                      onClick={() => savePromptMut.mutate()}
                      title="Lưu prompt vào thư viện để tái sử dụng"
                      className="h-7 px-2.5 rounded-md border border-border text-[12px] inline-flex items-center gap-1 hover:bg-muted disabled:opacity-60"
                    >
                      {savePromptMut.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <BookMarked className="h-3 w-3" />
                      )}
                      Lưu vào thư viện
                    </button>
                  ) : null}
                </div>

              </div>
              {prompt && showPrompt ? (
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={10}
                  className={inputCls + " py-2 h-auto font-mono text-[11.5px] leading-relaxed"}
                />
              ) : (
                <p className="text-[12px] text-muted-foreground">
                  {prompt ? "Prompt đã sẵn sàng, bấm “Xem” để chỉnh sửa." : "Chưa có prompt — AI sẽ tự sinh khi bạn tạo nội dung."}
                </p>
              )}
            </div>

            <button
              disabled={!tenantId || genMut.isPending}
              onClick={() => genMut.mutate({ autoPublish: true })}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {genMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
              {genMut.isPending ? "Đang tạo & xuất bản..." : "Tạo & xuất bản landing"}
            </button>
            <button
              disabled={!tenantId || genMut.isPending}
              onClick={() => genMut.mutate({ autoPublish: false })}
              className="w-full h-10 rounded-xl border border-border text-[13px] font-semibold inline-flex items-center justify-center gap-2 hover:bg-muted disabled:opacity-60"
            >
              <Wand2 className="h-4 w-4" /> Chỉ tạo nội dung (chưa xuất bản)
            </button>
          </div>
        </SectionCard>

        {/* Preview */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard
            title={selected ? selected.title || "AI Sales Page" : "Xem trước"}
            action={
              selected ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={editing ? () => setEditing(false) : startEdit}
                    className="h-8 px-3 rounded-lg border border-border text-[12px] inline-flex items-center gap-1.5 hover:bg-muted"
                  >
                    {editing ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                    {editing ? "Huỷ sửa" : "Sửa nội dung"}
                  </button>
                  <button
                    disabled={pubMut.isPending}
                    onClick={() =>
                      pubMut.mutate({ id: selected.id, is_published: !selected.is_published })
                    }
                    className={`h-8 px-3 rounded-lg text-[12px] inline-flex items-center gap-1.5 font-semibold disabled:opacity-60 ${
                      selected.is_published
                        ? "border border-border hover:bg-muted"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                  >
                    {selected.is_published ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5" /> Ẩn trang
                      </>
                    ) : (
                      <>
                        <Globe className="h-3.5 w-3.5" /> Xuất bản
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(out, null, 2));
                      toast.success("Đã copy JSON");
                    }}
                    className="h-8 px-3 rounded-lg border border-border text-[12px] inline-flex items-center gap-1.5 hover:bg-muted"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </button>
                  <button
                    onClick={() => delMut.mutate(selected.id)}
                    className="h-8 px-3 rounded-lg border border-border text-[12px] inline-flex items-center gap-1.5 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Xoá
                  </button>
                </div>
              ) : null
            }

          >
            {!selected ? (
              <div className="p-8 text-center text-muted-foreground text-[13px]">
                <Sparkles className="h-6 w-6 mx-auto mb-2 opacity-50" />
                Chưa có phiên tạo nào. Nhập tham số và bấm "Tạo bằng AI".
              </div>
            ) : (
              <div className="p-1 space-y-4">
                {selected.is_published && publicUrl ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-700">
                      <Globe className="h-3.5 w-3.5" /> Đang xuất bản
                    </span>
                    <code className="text-[12px] text-emerald-800 truncate">{publicUrl}</code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(publicUrl);
                        toast.success("Đã copy đường dẫn");
                      }}
                      className="h-7 px-2.5 rounded-md bg-white border border-emerald-200 text-[12px] inline-flex items-center gap-1 hover:bg-emerald-100"
                    >
                      <Copy className="h-3 w-3" /> Copy
                    </button>
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="h-7 px-2.5 rounded-md bg-white border border-emerald-200 text-[12px] inline-flex items-center gap-1 hover:bg-emerald-100"
                    >
                      <ExternalLink className="h-3 w-3" /> Mở
                    </a>
                    <span className="ml-auto text-[12px] text-emerald-700 inline-flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" /> {selected.views_count ?? 0} lượt xem
                    </span>
                  </div>
                ) : null}

                {editing ? (
                  <div className="rounded-2xl border border-border p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Field label="Tiêu đề nội bộ">
                        <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={inputCls} />
                      </Field>
                      <Field label="Đường dẫn công khai (/p/...)">
                        <input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} className={inputCls} placeholder="uu-dai-thang-9" />
                      </Field>
                    </div>
                    <Field label="Tiêu đề chính">
                      <input value={draft.headline} onChange={(e) => setDraft({ ...draft, headline: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="Mô tả ngắn">
                      <textarea value={draft.subheadline} onChange={(e) => setDraft({ ...draft, subheadline: e.target.value })} rows={2} className={inputCls + " py-2"} />
                    </Field>
                    <Field label="Điểm nổi bật (mỗi dòng 1 ý)">
                      <textarea value={draft.benefits} onChange={(e) => setDraft({ ...draft, benefits: e.target.value })} rows={5} className={inputCls + " py-2"} />
                    </Field>
                    <Field label="Ưu đãi">
                      <input value={draft.offer} onChange={(e) => setDraft({ ...draft, offer: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="Chứng thực khách hàng">
                      <input value={draft.social_proof} onChange={(e) => setDraft({ ...draft, social_proof: e.target.value })} className={inputCls} />
                    </Field>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Field label="Nút chính">
                        <input value={draft.cta_primary} onChange={(e) => setDraft({ ...draft, cta_primary: e.target.value })} className={inputCls} />
                      </Field>
                      <Field label="Nút phụ">
                        <input value={draft.cta_secondary} onChange={(e) => setDraft({ ...draft, cta_secondary: e.target.value })} className={inputCls} />
                      </Field>
                    </div>
                    <Field label="Lời mời để lại thông tin">
                      <input value={draft.form_intro} onChange={(e) => setDraft({ ...draft, form_intro: e.target.value })} className={inputCls} />
                    </Field>
                    <div className="flex gap-2 pt-1">
                      <button
                        disabled={saveMut.isPending}
                        onClick={() => saveMut.mutate()}
                        className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold inline-flex items-center gap-2 disabled:opacity-60"
                      >
                        {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Lưu nội dung
                      </button>
                      <button
                        onClick={() => setEditing(false)}
                        className="h-10 px-4 rounded-xl border border-border text-[13px] font-medium hover:bg-muted"
                      >
                        Huỷ
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* SEO article */}
                <div className="rounded-2xl border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-[13px] font-semibold">Bài viết SEO</div>
                      <div className="text-[11.5px] text-muted-foreground">
                        Sinh từ prompt bán hàng, tự chia tiêu đề & đoạn, kèm link /p/… công khai.
                      </div>
                    </div>
                    <button
                      disabled={seoMut.isPending}
                      onClick={() => seoMut.mutate()}
                      className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold inline-flex items-center gap-2 disabled:opacity-60"
                    >
                      {seoMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                      {seoArticle ? "Sinh lại bài viết SEO" : "Sinh bài viết SEO"}
                    </button>
                  </div>

                  {seoArticle && (
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center gap-2 flex-wrap text-[12px]">
                        <a
                          href={seoArticle.public_url || `${origin}/p/${selected.slug ?? ""}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border hover:bg-muted font-medium"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {seoArticle.public_url || `${origin}/p/${selected.slug ?? ""}`}
                        </a>
                        <button
                          onClick={() => {
                            navigator.clipboard?.writeText(seoArticleText(seoArticle)).catch(() => {});
                            toast.success("Đã copy bài viết");
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border hover:bg-muted font-medium"
                        >
                          <Copy className="h-3.5 w-3.5" /> Copy bài viết
                        </button>
                      </div>
                      <h2 className="text-[18px] font-bold leading-snug">{seoArticle.seo_title}</h2>
                      {seoArticle.meta_description && (
                        <p className="text-[13px] text-muted-foreground">{seoArticle.meta_description}</p>
                      )}
                      {Array.isArray(seoArticle.keywords) && seoArticle.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {seoArticle.keywords.map((k: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 rounded-md bg-muted text-[11.5px]">
                              {k}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="space-y-4">
                        {(seoArticle.sections ?? []).map((s: any, i: number) => (
                          <div key={i} className="space-y-1.5">
                            <h3 className="text-[14px] font-semibold">{s.heading}</h3>
                            {String(s.body)
                              .split(/\n{2,}/)
                              .map((p: string, j: number) => (
                                <p key={j} className="text-[13px] leading-relaxed text-muted-foreground">
                                  {p}
                                </p>
                              ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>


                <div className="rounded-2xl overflow-hidden border border-border bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-8">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[11px] font-semibold">
                    <Sparkles className="h-3 w-3 text-amber-300" /> AI cá nhân hoá
                  </div>
                  <h1 className="mt-4 text-[28px] lg:text-[36px] font-bold leading-tight">
                    {out?.headline || selected.title}
                  </h1>
                  {out?.subheadline && <p className="mt-3 text-white/70 text-[14px]">{out.subheadline}</p>}
                  {out?.offer && (
                    <div className="mt-4 inline-block px-3 py-1.5 rounded-lg bg-amber-400/20 text-amber-200 text-[12.5px] font-semibold">
                      {out.offer}
                    </div>
                  )}
                  <div className="mt-6 flex gap-3">
                    {out?.cta_primary && (
                      <button className="h-11 px-5 rounded-xl bg-white text-slate-900 text-[13px] font-semibold">
                        {out.cta_primary}
                      </button>
                    )}
                    {out?.cta_secondary && (
                      <button className="h-11 px-5 rounded-xl bg-white/10 text-white text-[13px] font-semibold">
                        {out.cta_secondary}
                      </button>
                    )}
                  </div>
                </div>

                {Array.isArray(out?.benefits) && out.benefits.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {out.benefits.map((b: string, i: number) => (
                      <div key={i} className="rounded-xl border border-border p-3 text-[13px] flex gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold shrink-0">
                          {i + 1}
                        </div>
                        <div>{b}</div>
                      </div>
                    ))}
                  </div>
                )}

                {out?.social_proof && (
                  <div className="rounded-xl bg-muted/40 border border-border p-4 text-[13px] italic">
                    "{out.social_proof}"
                  </div>
                )}

                {out?.form_intro && (
                  <div className="rounded-xl border border-border p-4 text-[13px] text-muted-foreground">
                    {out.form_intro}
                  </div>
                )}

                <div className="text-[11px] text-muted-foreground flex gap-3">
                  <span>Model: {selected.model || "—"}</span>
                  <span>Tokens: {selected.tokens ?? "—"}</span>
                  <span>Giọng: {TONE_LABEL_VI[selected.tone as Tone] || selected.tone}</span>
                </div>
              </div>
            )}
          </SectionCard>

          {/* History */}
          <SectionCard title={`Lịch sử phiên tạo (${items.length})`}>
            {items.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-[13px]">Chưa có phiên nào.</div>
            ) : (
              <div className="divide-y divide-border">
                {items.map((it: any) => (
                  <button
                    key={it.id}
                    onClick={() => setSelectedId(it.id)}
                    className={`w-full text-left p-3 hover:bg-muted/50 flex items-center gap-3 ${
                      selected?.id === it.id ? "bg-muted/60" : ""
                    }`}
                  >
                    <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold truncate">{it.title || "AI Sales Page"}</div>
                      <div className="text-[11.5px] text-muted-foreground truncate flex items-center gap-2">
                        <span>{new Date(it.created_at).toLocaleString("vi-VN")}</span>
                        {it.lead_id && (
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3 w-3" /> lead
                          </span>
                        )}
                        <span>· {TONE_LABEL_VI[it.tone as Tone] || it.tone}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full h-10 rounded-lg border border-border bg-card px-3 text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[11.5px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</div>
      {children}
    </div>
  );
}

function seoArticleText(a: any) {
  const parts = [a?.seo_title || "", a?.meta_description || ""];
  for (const s of a?.sections ?? []) parts.push(`## ${s.heading}\n${s.body}`);
  if (a?.public_url) parts.push(a.public_url);
  return parts.filter(Boolean).join("\n\n");
}
