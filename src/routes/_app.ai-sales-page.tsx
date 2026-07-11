import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { Sparkles, Wand2, Trash2, Copy, Loader2, FileText, User } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listSalesPages,
  generateSalesPage,
  deleteSalesPage,
  TONES,
  TONE_LABEL_VI,
} from "@/lib/ai-sales-page.functions";
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
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const listFn = useServerFn(listSalesPages);
  const listLeadsFn = useServerFn(listLeads);
  const generateFn = useServerFn(generateSalesPage);
  const deleteFn = useServerFn(deleteSalesPage);

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
    mutationFn: () =>
      generateFn({
        data: {
          tenantId: tenantId!,
          leadId: leadId || undefined,
          title: title || undefined,
          audience: audience || undefined,
          tone,
          cta: cta || undefined,
          extra: extra || undefined,
        },
      }),
    onSuccess: (r) => {
      toast.success("Đã tạo AI Sales Page");
      setSelectedId(r.page?.id ?? null);
      qc.invalidateQueries({ queryKey: ["ai-sales-pages", tenantId] });
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
              <textarea value={extra} onChange={(e) => setExtra(e.target.value)} rows={3} className={inputCls + " py-2"} placeholder="Ghi chú về ưu đãi, điểm nhấn..." />
            </Field>
            <button
              disabled={!tenantId || genMut.isPending}
              onClick={() => genMut.mutate()}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {genMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {genMut.isPending ? "Đang tạo..." : "Tạo bằng AI"}
            </button>
          </div>
        </SectionCard>

        {/* Preview */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard
            title={selected ? selected.title || "AI Sales Page" : "Xem trước"}
            action={
              selected ? (
                <div className="flex gap-2">
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
