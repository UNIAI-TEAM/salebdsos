// Quản lý landing công khai: chỉnh nội dung, thay hình ảnh, xoá, xem lưu lượng & chuyển đổi
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { PageHeader, SectionCard, KpiCard } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Eye, Users2, Percent, Trash2, ExternalLink, Copy, Upload, Save, Globe, EyeOff, ImageIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  listSalesPages, updateSalesPage, deleteSalesPage, setSalesPagePublish, getSalesPageStats,
} from "@/lib/ai-sales-page.functions";

export const Route = createFileRoute("/_app/landings")({
  head: () => ({
    meta: [
      { title: "Quản lý Landing công khai — SaleBDS OS" },
      { name: "description", content: "Chỉnh sửa nội dung, thay hình ảnh, xoá landing và theo dõi lưu lượng, tỷ lệ chuyển đổi." },
      { property: "og:title", content: "Quản lý Landing công khai — SaleBDS OS" },
      { property: "og:description", content: "Chỉnh sửa nội dung, thay hình ảnh và theo dõi chuyển đổi của landing công khai." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingsPage,
});

const inputCls =
  "h-10 w-full rounded-xl border border-border bg-card px-3 text-[13.5px] outline-none focus:ring-2 focus:ring-primary/25";
const BUCKET = "project-assets";

type PageRow = {
  id: string;
  title: string | null;
  slug: string | null;
  is_published: boolean;
  views_count: number;
  cta: string | null;
  output: Record<string, unknown> | null;
  created_at: string;
};

type Draft = {
  title: string;
  slug: string;
  headline: string;
  subheadline: string;
  benefits: string;
  offer: string;
  social_proof: string;
  cta_primary: string;
  cta_secondary: string;
  form_intro: string;
  hero_image_url: string;
};

function toDraft(p: PageRow): Draft {
  const o = (p.output ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof o[k] === "string" ? (o[k] as string) : "");
  return {
    title: p.title ?? "",
    slug: p.slug ?? "",
    headline: str("headline"),
    subheadline: str("subheadline"),
    benefits: Array.isArray(o["benefits"]) ? (o["benefits"] as string[]).join("\n") : "",
    offer: str("offer"),
    social_proof: str("social_proof"),
    cta_primary: str("cta_primary"),
    cta_secondary: str("cta_secondary"),
    form_intro: str("form_intro"),
    hero_image_url: str("hero_image_url"),
  };
}

function LandingsPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const qc = useQueryClient();

  const listFn = useServerFn(listSalesPages);
  const updateFn = useServerFn(updateSalesPage);
  const deleteFn = useServerFn(deleteSalesPage);
  const publishFn = useServerFn(setSalesPagePublish);
  const statsFn = useServerFn(getSalesPageStats);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [uploading, setUploading] = useState(false);
  const [days, setDays] = useState(30);

  const listQ = useQuery({
    queryKey: ["landings", tenantId],
    queryFn: () => listFn({ data: { tenantId: tenantId!, page: 1, pageSize: 50 } }),
    enabled: !!tenantId,
  });
  const items = (listQ.data?.items ?? []) as PageRow[];

  const selected = useMemo(() => items.find((i) => i.id === selectedId) ?? null, [items, selectedId]);

  useEffect(() => {
    if (!selectedId && items.length) setSelectedId(items[0]!.id);
  }, [items, selectedId]);

  // Lưu trước từng landing đã công khai (trang + manifest app + ảnh hero)
  // để sale mở từ icon là hiện ngay, kể cả mạng yếu.
  useEffect(() => {
    if (!items.length) return;
    void warmOfflineCache(["/landings"]);
    void warmLandings(
      items
        .filter((p) => p.is_published && p.slug)
        .map((p) => ({
          slug: p.slug,
          heroImageUrl:
            typeof (p.output as Record<string, unknown> | null)?.["hero_image_url"] === "string"
              ? ((p.output as Record<string, unknown>)["hero_image_url"] as string)
              : null,
        })),
    );
  }, [items]);
  useEffect(() => {
    if (selected) setDraft(toDraft(selected));
  }, [selected?.id, selected?.output]); // eslint-disable-line react-hooks/exhaustive-deps

  const statsQ = useQuery({
    queryKey: ["landing-stats", tenantId, selectedId, days],
    queryFn: () => statsFn({ data: { tenantId: tenantId!, pageId: selectedId, days } }),
    enabled: !!tenantId && !!selectedId,
  });
  const allStatsQ = useQuery({
    queryKey: ["landing-stats-all", tenantId, days],
    queryFn: () => statsFn({ data: { tenantId: tenantId!, days } }),
    enabled: !!tenantId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["landings", tenantId] });
    qc.invalidateQueries({ queryKey: ["landing-stats", tenantId] });
  };

  const saveMut = useMutation({
    mutationFn: () =>
      updateFn({
        data: {
          id: selectedId!,
          title: draft!.title || "Landing",
          slug: draft!.slug || null,
          output: {
            headline: draft!.headline || null,
            subheadline: draft!.subheadline || null,
            benefits: draft!.benefits
              .split("\n")
              .map((b) => b.trim())
              .filter(Boolean)
              .slice(0, 10),
            offer: draft!.offer || null,
            social_proof: draft!.social_proof || null,
            cta_primary: draft!.cta_primary || null,
            cta_secondary: draft!.cta_secondary || null,
            form_intro: draft!.form_intro || null,
            hero_image_url: draft!.hero_image_url || null,
          },
        },
      }),
    onSuccess: () => {
      toast.success("Đã lưu nội dung landing");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message || "Không lưu được"),
  });

  const publishMut = useMutation({
    mutationFn: (v: { id: string; is_published: boolean }) =>
      publishFn({ data: { id: v.id, is_published: v.is_published } }),
    onSuccess: (_d, v) => {
      toast.success(v.is_published ? "Đã xuất bản landing" : "Đã ẩn landing");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message || "Không đổi được trạng thái"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Đã xoá landing");
      setSelectedId(null);
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message || "Không xoá được"),
  });

  const onPickImage = async (file: File) => {
    if (!tenantId) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh vượt 5MB");
      return;
    }
    setUploading(true);
    try {
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${tenantId}/landings/${Date.now()}_${safe}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });
      if (error) throw new Error(error.message);
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      setDraft((d) => (d ? { ...d, hero_image_url: pub.publicUrl } : d));
      toast.success("Đã tải ảnh lên — nhớ bấm Lưu");
    } catch (e: any) {
      toast.error(e?.message || "Không tải được ảnh");
    } finally {
      setUploading(false);
    }
  };

  const publicUrl = selected?.slug ? `${window.location.origin}/p/${selected.slug}` : "";
  const stats = statsQ.data;
  const all = allStatsQ.data;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Landing công khai"
        sub="Chỉnh nội dung, thay hình ảnh, xuất bản và theo dõi lưu lượng, chuyển đổi"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Lượt xem" value={String(all?.totalViews ?? 0)} icon={Eye} delta={0} deltaLabel={`${days} ngày qua`} />
        <KpiCard label="Khách để lại thông tin" value={String(all?.totalConversions ?? 0)} icon={Users2} delta={0} deltaLabel={`${days} ngày qua`} tone="green" />
        <KpiCard
          label="Tỷ lệ chuyển đổi"
          value={`${(all?.conversionRate ?? 0).toFixed(1)}%`}
          icon={Percent}
          delta={0}
          deltaLabel={`${days} ngày qua`}
          tone="blue"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <SectionCard title={`Danh sách (${items.length})`}>
          <div className="space-y-2 max-h-[520px] overflow-auto pr-1">
            {listQ.isLoading ? (
              <p className="text-[13px] text-muted-foreground">Đang tải…</p>
            ) : items.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">
                Chưa có landing nào. Hãy tạo từ trang AI Sales Page.
              </p>
            ) : (
              items.map((p) => {
                const agg = (all?.byPage as any)?.[p.id] as { views: number; conversions: number } | undefined;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      selectedId === p.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13.5px] font-semibold">{p.title || "Landing"}</span>
                      <span
                        className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                          p.is_published
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {p.is_published ? "Đang công khai" : "Chưa xuất bản"}
                      </span>
                    </div>
                    <div className="mt-1 truncate text-[11.5px] text-muted-foreground">/p/{p.slug || "—"}</div>
                    <div className="mt-1 text-[11.5px] text-muted-foreground">
                      {agg?.views ?? 0} lượt xem · {agg?.conversions ?? 0} khách
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard
            title="Lưu lượng & chuyển đổi"
            action={
              <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={inputCls + " w-auto"}>
                <option value={7}>7 ngày</option>
                <option value={30}>30 ngày</option>
                <option value={90}>90 ngày</option>
              </select>
            }
          >
            <div className="h-[240px]">
              {statsQ.isLoading ? (
                <p className="text-[13px] text-muted-foreground">Đang tải…</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats?.series ?? []} margin={{ left: -20, right: 8, top: 8 }}>
                    <defs>
                      <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis
                      dataKey="day"
                      tickFormatter={(d: string) => d.slice(5)}
                      tick={{ fontSize: 11 }}
                      stroke="currentColor"
                      className="text-muted-foreground"
                    />
                    <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 12 }}
                      labelFormatter={(d) => `Ngày ${d}`}
                      formatter={(v: any, n: string) => [v, n === "views" ? "Lượt xem" : "Khách để lại thông tin"]}
                    />
                    <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" fill="url(#gv)" strokeWidth={2} />
                    <Area type="monotone" dataKey="conversions" stroke="#10b981" fill="#10b98122" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            {selected ? (
              <div className="mt-2 text-[12px] text-muted-foreground">
                Trang đang chọn: {stats?.totalViews ?? 0} lượt xem · {stats?.totalConversions ?? 0} khách ·
                tỷ lệ {(stats?.conversionRate ?? 0).toFixed(1)}%
              </div>
            ) : null}
          </SectionCard>

          {selected && draft ? (
            <SectionCard
              title="Chỉnh sửa nội dung"
              action={
                <div className="flex items-center gap-2">
                  {publicUrl ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard?.writeText(publicUrl).catch(() => {});
                          toast.success("Đã copy đường dẫn");
                        }}
                      >
                        <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy link
                      </Button>
                      <a href={publicUrl} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm">
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Xem
                        </Button>
                      </a>
                    </>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => publishMut.mutate({ id: selected.id, is_published: !selected.is_published })}
                    disabled={publishMut.isPending}
                  >
                    {selected.is_published ? (
                      <>
                        <EyeOff className="mr-1.5 h-3.5 w-3.5" /> Ẩn
                      </>
                    ) : (
                      <>
                        <Globe className="mr-1.5 h-3.5 w-3.5" /> Xuất bản
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm("Xoá landing này?")) deleteMut.mutate(selected.id);
                    }}
                    disabled={deleteMut.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              }
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Tên trang">
                  <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Đường dẫn công khai (/p/…)">
                  <input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Tiêu đề chính">
                  <input value={draft.headline} onChange={(e) => setDraft({ ...draft, headline: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Mô tả ngắn">
                  <input value={draft.subheadline} onChange={(e) => setDraft({ ...draft, subheadline: e.target.value })} className={inputCls} />
                </Field>
                <Field label="CTA chính">
                  <input value={draft.cta_primary} onChange={(e) => setDraft({ ...draft, cta_primary: e.target.value })} className={inputCls} />
                </Field>
                <Field label="CTA phụ">
                  <input value={draft.cta_secondary} onChange={(e) => setDraft({ ...draft, cta_secondary: e.target.value })} className={inputCls} />
                </Field>
              </div>

              <div className="mt-3 grid gap-3">
                <Field label="Điểm nổi bật (mỗi dòng một ý)">
                  <textarea
                    rows={4}
                    value={draft.benefits}
                    onChange={(e) => setDraft({ ...draft, benefits: e.target.value })}
                    className={inputCls + " h-auto py-2"}
                  />
                </Field>
                <Field label="Ưu đãi">
                  <input value={draft.offer} onChange={(e) => setDraft({ ...draft, offer: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Chứng thực khách hàng">
                  <input value={draft.social_proof} onChange={(e) => setDraft({ ...draft, social_proof: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Lời mời để lại thông tin">
                  <input value={draft.form_intro} onChange={(e) => setDraft({ ...draft, form_intro: e.target.value })} className={inputCls} />
                </Field>
              </div>

              <div className="mt-4 rounded-xl border border-border p-3">
                <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <ImageIcon className="h-3.5 w-3.5" /> Hình ảnh trang
                </div>
                {draft.hero_image_url ? (
                  <img
                    src={draft.hero_image_url}
                    alt="Ảnh landing"
                    className="mb-3 aspect-[16/9] w-full max-w-md rounded-xl border border-border object-cover"
                  />
                ) : (
                  <p className="mb-3 text-[13px] text-muted-foreground">Chưa có ảnh.</p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-border px-3 text-[13px] font-medium hover:bg-muted">
                    <Upload className="h-3.5 w-3.5" />
                    {uploading ? "Đang tải…" : "Tải ảnh lên"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void onPickImage(f);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                  <input
                    value={draft.hero_image_url}
                    onChange={(e) => setDraft({ ...draft, hero_image_url: e.target.value })}
                    placeholder="hoặc dán đường dẫn ảnh"
                    className={inputCls + " max-w-sm"}
                  />
                  {draft.hero_image_url ? (
                    <Button variant="ghost" size="sm" onClick={() => setDraft({ ...draft, hero_image_url: "" })}>
                      Xoá ảnh
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                  <Save className="mr-1.5 h-4 w-4" />
                  {saveMut.isPending ? "Đang lưu…" : "Lưu thay đổi"}
                </Button>
              </div>
            </SectionCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
