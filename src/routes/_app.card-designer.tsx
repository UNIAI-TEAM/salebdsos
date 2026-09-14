// Thiết kế danh thiếp số: dữ liệu thật, đầy đủ thêm/sửa/xoá cho danh thiếp, khối nội dung và mẫu
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Plus, Trash2, Save, Eye, Globe, EyeOff, ArrowUp, ArrowDown, Palette, LayoutGrid, Copy,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  listMyCards, createCard, deleteCard, getCard, updateMyCard,
  listCardBlocks, upsertCardBlock, deleteCardBlock, reorderCardBlocks,
  listCardTemplates, saveCardTemplate, deleteCardTemplate, applyCardTemplate,
  BLOCK_TYPES, BLOCK_TYPE_LABEL_VI,
} from "@/lib/card.functions";

export const Route = createFileRoute("/_app/card-designer")({
  head: () => ({
    meta: [
      { title: "Thiết kế danh thiếp số — SaleBDS OS" },
      {
        name: "description",
        content: "Tạo và chỉnh danh thiếp số: thông tin, màu thương hiệu, khối nội dung, mẫu dùng lại và xuất bản liên kết công khai.",
      },
      { property: "og:title", content: "Thiết kế danh thiếp số — SaleBDS OS" },
      { property: "og:description", content: "Thiết kế danh thiếp số với khối nội dung, mẫu và liên kết công khai." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CardDesignerPage,
});

const inputCls =
  "h-10 w-full rounded-xl border border-border bg-card px-3 text-[13.5px] outline-none focus:ring-2 focus:ring-primary/25";
const TEMPLATE_KEYS = ["luxury-dark", "skyline", "minimal", "premium", "ocean"] as const;
const TEMPLATE_LABEL: Record<string, string> = {
  "luxury-dark": "Sang trọng (tối)",
  skyline: "Skyline",
  minimal: "Tối giản",
  premium: "Premium",
  ocean: "Ocean",
};

type Info = {
  display_name: string;
  title: string;
  company: string;
  bio: string;
  slug: string;
  avatar_url: string;
  template: string;
  primary: string;
};

function CardDesignerPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const qc = useQueryClient();

  const listCardsFn = useServerFn(listMyCards);
  const getCardFn = useServerFn(getCard);
  const createCardFn = useServerFn(createCard);
  const deleteCardFn = useServerFn(deleteCard);
  const updateCardFn = useServerFn(updateMyCard);
  const listBlocksFn = useServerFn(listCardBlocks);
  const upsertBlockFn = useServerFn(upsertCardBlock);
  const deleteBlockFn = useServerFn(deleteCardBlock);
  const reorderBlocksFn = useServerFn(reorderCardBlocks);
  const listTplFn = useServerFn(listCardTemplates);
  const saveTplFn = useServerFn(saveCardTemplate);
  const deleteTplFn = useServerFn(deleteCardTemplate);
  const applyTplFn = useServerFn(applyCardTemplate);

  const [cardId, setCardId] = useState<string | null>(null);
  const [info, setInfo] = useState<Info | null>(null);
  const [newName, setNewName] = useState("");
  const [tplName, setTplName] = useState("");

  const cardsQ = useQuery({
    queryKey: ["cd-cards", tenantId],
    queryFn: () => listCardsFn({ data: { tenantId: tenantId! } }),
    enabled: !!tenantId,
  });
  const cards = (cardsQ.data ?? []) as any[];

  useEffect(() => {
    if (!cardId && cards.length) setCardId(cards[0]!.id);
  }, [cards, cardId]);

  const cardQ = useQuery({
    queryKey: ["cd-card", cardId],
    queryFn: () => getCardFn({ data: { id: cardId! } }),
    enabled: !!cardId,
  });
  const card = cardQ.data as any;

  useEffect(() => {
    if (!card) return;
    const theme = (card.theme ?? {}) as Record<string, any>;
    setInfo({
      display_name: card.display_name ?? "",
      title: card.title ?? "",
      company: card.company ?? "",
      bio: card.bio ?? "",
      slug: card.slug ?? "",
      avatar_url: card.avatar_url ?? "",
      template: theme.template ?? "luxury-dark",
      primary: theme.primary ?? "#A855F7",
    });
  }, [card?.id, card?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps

  const blocksQ = useQuery({
    queryKey: ["cd-blocks", cardId],
    queryFn: () => listBlocksFn({ data: { cardId: cardId! } }),
    enabled: !!cardId,
  });
  const blocks = (blocksQ.data?.items ?? []) as any[];

  const tplQ = useQuery({
    queryKey: ["cd-templates", tenantId],
    queryFn: () => listTplFn({ data: { tenantId: tenantId! } }),
    enabled: !!tenantId,
  });
  const templates = (tplQ.data?.items ?? []) as any[];

  const refreshCard = () => {
    qc.invalidateQueries({ queryKey: ["cd-cards", tenantId] });
    qc.invalidateQueries({ queryKey: ["cd-card", cardId] });
  };
  const refreshBlocks = () => qc.invalidateQueries({ queryKey: ["cd-blocks", cardId] });

  const err = (e: any) => toast.error(e?.message || "Có lỗi xảy ra");

  const createMut = useMutation({
    mutationFn: () => createCardFn({ data: { tenantId: tenantId!, displayName: newName.trim() } }),
    onSuccess: (row: any) => {
      toast.success("Đã tạo danh thiếp");
      setNewName("");
      setCardId(row.id);
      refreshCard();
    },
    onError: err,
  });

  const saveMut = useMutation({
    mutationFn: () =>
      updateCardFn({
        data: {
          id: cardId!,
          patch: {
            display_name: info!.display_name || "Họ và tên",
            title: info!.title || null,
            company: info!.company || null,
            bio: info!.bio || null,
            slug: info!.slug || undefined,
            avatar_url: info!.avatar_url || null,
            theme: { template: info!.template, primary: info!.primary },
          },
        },
      }),
    onSuccess: () => {
      toast.success("Đã lưu danh thiếp");
      refreshCard();
    },
    onError: err,
  });

  const publishMut = useMutation({
    mutationFn: (v: boolean) => updateCardFn({ data: { id: cardId!, patch: { is_published: v } } }),
    onSuccess: (_d, v) => {
      toast.success(v ? "Đã xuất bản" : "Đã ẩn danh thiếp");
      refreshCard();
    },
    onError: err,
  });

  const removeCardMut = useMutation({
    mutationFn: (id: string) => deleteCardFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Đã xoá danh thiếp");
      setCardId(null);
      refreshCard();
    },
    onError: err,
  });

  const addBlockMut = useMutation({
    mutationFn: (blockType: (typeof BLOCK_TYPES)[number]) =>
      upsertBlockFn({
        data: {
          tenantId: tenantId!,
          cardId: cardId!,
          blockType,
          config: { title: BLOCK_TYPE_LABEL_VI[blockType], text: "" },
        },
      }),
    onSuccess: () => {
      toast.success("Đã thêm khối");
      refreshBlocks();
    },
    onError: err,
  });

  const saveBlockMut = useMutation({
    mutationFn: (b: any) =>
      upsertBlockFn({
        data: {
          id: b.id,
          tenantId: tenantId!,
          cardId: cardId!,
          blockType: b.block_type,
          isVisible: b.is_visible,
          config: b.config ?? {},
        },
      }),
    onSuccess: () => {
      toast.success("Đã lưu khối");
      refreshBlocks();
    },
    onError: err,
  });

  const deleteBlockMut = useMutation({
    mutationFn: (id: string) => deleteBlockFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Đã xoá khối");
      refreshBlocks();
    },
    onError: err,
  });

  const moveBlockMut = useMutation({
    mutationFn: (v: { index: number; dir: -1 | 1 }) => {
      const next = [...blocks];
      const target = v.index + v.dir;
      if (target < 0 || target >= next.length) return Promise.resolve({ ok: true });
      [next[v.index], next[target]] = [next[target], next[v.index]];
      return reorderBlocksFn({ data: { order: next.map((b, i) => ({ id: b.id, position: i })) } });
    },
    onSuccess: refreshBlocks,
    onError: err,
  });

  const saveTplMut = useMutation({
    mutationFn: () =>
      saveTplFn({
        data: {
          tenantId: tenantId!,
          name: tplName.trim() || "Mẫu của tôi",
          theme: { template: info!.template, primary: info!.primary },
        },
      }),
    onSuccess: () => {
      toast.success("Đã lưu mẫu");
      setTplName("");
      qc.invalidateQueries({ queryKey: ["cd-templates", tenantId] });
    },
    onError: err,
  });

  const applyTplMut = useMutation({
    mutationFn: (templateId: string) => applyTplFn({ data: { cardId: cardId!, templateId } }),
    onSuccess: () => {
      toast.success("Đã áp dụng mẫu");
      refreshCard();
    },
    onError: err,
  });

  const deleteTplMut = useMutation({
    mutationFn: (id: string) => deleteTplFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Đã xoá mẫu");
      qc.invalidateQueries({ queryKey: ["cd-templates", tenantId] });
    },
    onError: err,
  });

  const publicUrl = card?.slug ? `${window.location.origin}/c/${card.slug}` : "";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Thiết kế danh thiếp"
        sub="Tạo nhiều danh thiếp, sắp xếp khối nội dung, lưu mẫu dùng lại và xuất bản liên kết công khai"
      />

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4">
          <SectionCard title={`Danh thiếp (${cards.length})`}>
            <div className="mb-3 flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Tên trên danh thiếp mới"
                className={inputCls}
              />
              <Button size="sm" onClick={() => createMut.mutate()} disabled={!newName.trim() || createMut.isPending}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {cardsQ.isLoading ? (
                <p className="text-[13px] text-muted-foreground">Đang tải…</p>
              ) : cards.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">Chưa có danh thiếp nào.</p>
              ) : (
                cards.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCardId(c.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      cardId === c.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13.5px] font-semibold">{c.display_name}</span>
                      <span
                        className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                          c.is_published ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {c.is_published ? "Công khai" : "Nháp"}
                      </span>
                    </div>
                    <div className="mt-1 truncate text-[11.5px] text-muted-foreground">
                      /c/{c.slug} · {c.view_count ?? 0} lượt xem
                    </div>
                  </button>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard title="Mẫu đã lưu">
            <div className="mb-3 flex gap-2">
              <input
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                placeholder="Tên mẫu"
                className={inputCls}
              />
              <Button size="sm" variant="outline" onClick={() => saveTplMut.mutate()} disabled={!info || saveTplMut.isPending}>
                <Palette className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {templates.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">Chưa có mẫu nào. Lưu bộ màu hiện tại thành mẫu.</p>
              ) : (
                templates.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 rounded-xl border border-border p-2.5">
                    <span
                      className="h-5 w-5 shrink-0 rounded-full border border-border"
                      style={{ backgroundColor: (t.theme as any)?.primary ?? "#888" }}
                    />
                    <span className="truncate text-[13px] font-medium">{t.name}</span>
                    <div className="ml-auto flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => cardId && applyTplMut.mutate(t.id)}>
                        Dùng
                      </Button>
                      {!t.is_global ? (
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteTplMut.mutate(t.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>

        {card && info ? (
          <div className="space-y-4">
            <SectionCard
              title="Thông tin & thương hiệu"
              action={
                <div className="flex items-center gap-2">
                  {publicUrl ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard?.writeText(publicUrl).catch(() => {});
                          toast.success("Đã copy liên kết");
                        }}
                      >
                        <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy link
                      </Button>
                      <a href={publicUrl} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm">
                          <Eye className="mr-1.5 h-3.5 w-3.5" /> Xem
                        </Button>
                      </a>
                    </>
                  ) : null}
                  <Button variant="outline" size="sm" onClick={() => publishMut.mutate(!card.is_published)}>
                    {card.is_published ? (
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
                      if (confirm(`Xoá danh thiếp "${card.display_name}"?`)) removeCardMut.mutate(card.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              }
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Họ và tên">
                  <input value={info.display_name} onChange={(e) => setInfo({ ...info, display_name: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Chức danh">
                  <input value={info.title} onChange={(e) => setInfo({ ...info, title: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Công ty">
                  <input value={info.company} onChange={(e) => setInfo({ ...info, company: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Đường dẫn công khai (/c/…)">
                  <input value={info.slug} onChange={(e) => setInfo({ ...info, slug: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Ảnh đại diện (đường dẫn)">
                  <input value={info.avatar_url} onChange={(e) => setInfo({ ...info, avatar_url: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Mẫu hiển thị">
                  <select value={info.template} onChange={(e) => setInfo({ ...info, template: e.target.value })} className={inputCls}>
                    {TEMPLATE_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {TEMPLATE_LABEL[k]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Màu nhấn">
                  <input
                    type="color"
                    value={info.primary}
                    onChange={(e) => setInfo({ ...info, primary: e.target.value })}
                    className="h-10 w-full rounded-xl border border-border bg-card px-1"
                  />
                </Field>
              </div>
              <div className="mt-3">
                <Field label="Giới thiệu ngắn">
                  <textarea
                    rows={3}
                    value={info.bio}
                    onChange={(e) => setInfo({ ...info, bio: e.target.value })}
                    className={inputCls + " h-auto py-2"}
                  />
                </Field>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                  <Save className="mr-1.5 h-4 w-4" />
                  {saveMut.isPending ? "Đang lưu…" : "Lưu danh thiếp"}
                </Button>
              </div>
            </SectionCard>

            <SectionCard
              title={`Khối nội dung (${blocks.length})`}
              action={
                <select
                  className={inputCls + " w-auto"}
                  value=""
                  onChange={(e) => {
                    const v = e.target.value as (typeof BLOCK_TYPES)[number];
                    if (v) addBlockMut.mutate(v);
                    e.currentTarget.value = "";
                  }}
                >
                  <option value="">+ Thêm khối…</option>
                  {BLOCK_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {BLOCK_TYPE_LABEL_VI[t]}
                    </option>
                  ))}
                </select>
              }
            >
              {blocksQ.isLoading ? (
                <p className="text-[13px] text-muted-foreground">Đang tải…</p>
              ) : blocks.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">
                  Chưa có khối nào. Thêm khối giới thiệu, dự án, thư viện ảnh… để trang công khai phong phú hơn.
                </p>
              ) : (
                <div className="space-y-3">
                  {blocks.map((b, i) => (
                    <BlockEditor
                      key={b.id}
                      block={b}
                      isFirst={i === 0}
                      isLast={i === blocks.length - 1}
                      onMove={(dir) => moveBlockMut.mutate({ index: i, dir })}
                      onSave={(next) => saveBlockMut.mutate(next)}
                      onDelete={() => {
                        if (confirm("Xoá khối này?")) deleteBlockMut.mutate(b.id);
                      }}
                    />
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        ) : (
          <SectionCard title="Chọn danh thiếp">
            <p className="text-[13px] text-muted-foreground">
              Chọn một danh thiếp ở danh sách bên trái, hoặc tạo mới để bắt đầu thiết kế.
            </p>
          </SectionCard>
        )}
      </div>
    </div>
  );
}

function BlockEditor({
  block, isFirst, isLast, onMove, onSave, onDelete,
}: {
  block: any;
  isFirst: boolean;
  isLast: boolean;
  onMove: (dir: -1 | 1) => void;
  onSave: (next: any) => void;
  onDelete: () => void;
}) {
  const cfg = (block.config ?? {}) as Record<string, any>;
  const [title, setTitle] = useState(cfg.title ?? "");
  const [text, setText] = useState(cfg.text ?? "");
  const [image, setImage] = useState(cfg.image ?? "");
  const [visible, setVisible] = useState<boolean>(block.is_visible ?? true);

  useEffect(() => {
    setTitle(cfg.title ?? "");
    setText(cfg.text ?? "");
    setImage(cfg.image ?? "");
    setVisible(block.is_visible ?? true);
  }, [block.id, block.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[13px] font-semibold">
          {BLOCK_TYPE_LABEL_VI[block.block_type as keyof typeof BLOCK_TYPE_LABEL_VI] ?? block.block_type}
        </span>
        <label className="ml-2 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
          Hiển thị
        </label>
        <div className="ml-auto flex items-center gap-1">
          <Button size="sm" variant="ghost" disabled={isFirst} onClick={() => onMove(-1)}>
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" disabled={isLast} onClick={() => onMove(1)}>
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSave({ ...block, is_visible: visible, config: { ...cfg, title, text, image } })}
          >
            <Save className="mr-1.5 h-3.5 w-3.5" /> Lưu
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tiêu đề khối" className={inputCls} />
        <input value={image} onChange={(e) => setImage(e.target.value)} placeholder="Đường dẫn hình ảnh (không bắt buộc)" className={inputCls} />
      </div>
      <textarea
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Nội dung"
        className={inputCls + " mt-2 h-auto py-2"}
      />
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
