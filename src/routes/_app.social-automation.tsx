import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EyeOff, MessageCircle, Plus, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getSocialAutomation, saveSocialAutomation } from "@/lib/social.functions";
import type { SocialSettings } from "@/lib/social";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_app/social-automation")({
  head: () => ({
    meta: [
      { title: "Tự động hoá Fanpage — SaleBDS OS" },
      { name: "description", content: "Ẩn bình luận có số điện thoại, trả lời xoay vòng và nhắn Messenger kèm nút xem dự án." },
      { property: "og:title", content: "Tự động hoá Fanpage — SaleBDS OS" },
      { property: "og:description", content: "Bảo vệ lead và tự phản hồi bình luận Facebook." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SocialPage,
});

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: typeof EyeOff }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <Icon className="h-4 w-4 text-primary" />
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function SocialPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const qc = useQueryClient();
  const fnGet = useServerFn(getSocialAutomation);
  const fnSave = useServerFn(saveSocialAutomation);
  const q = useQuery({
    queryKey: ["social", tenantId],
    queryFn: () => fnGet({ data: { tenantId: tenantId! } }),
    enabled: !!tenantId,
  });
  const [cfg, setCfg] = useState<SocialSettings | null>(null);
  const [kw, setKw] = useState("");
  const [postId, setPostId] = useState("");
  const [postProject, setPostProject] = useState("");
  useEffect(() => { if (q.data && !cfg) setCfg(q.data.settings); }, [q.data, cfg]);

  const save = useMutation({
    mutationFn: () => fnSave({ data: { tenantId: tenantId!, settings: cfg! } }),
    onSuccess: () => { toast.success("Đã lưu cấu hình"); qc.invalidateQueries({ queryKey: ["social", tenantId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.error) return <div className="p-6 text-sm text-destructive">{(q.error as Error).message}</div>;
  if (!q.data || !cfg) return <div className="p-6 text-sm text-muted-foreground">Đang tải...</div>;
  const d = q.data;
  const ro = !d.canEdit;
  const set = (p: Partial<SocialSettings>) => setCfg({ ...cfg, ...p });
  const projectName = (id: string) => d.projects.find((p) => p.id === id)?.name ?? "—";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tự động hoá Fanpage"
        sub="Ẩn bình luận để lộ số điện thoại, tự trả lời và nhắn Messenger kèm nút xem dự án."
        action={d.canEdit ? <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Đang lưu..." : "Lưu cấu hình"}</Button> : undefined}
      />

      {!d.connected && (
        <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Fanpage chưa kết nối. Vào <b>Quản trị → Tích hợp kênh khách hàng</b>, nhập Page ID, rồi thêm khoá Facebook (App Secret + Page Access Token có quyền
          pages_manage_engagement, pages_messaging). Trong Facebook App, đăng ký webhook trường <b>feed</b> cho Fanpage.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Bình luận đã xử lý" value={String(d.totals.comments)} icon={MessageCircle} />
        <Stat label="Đã ẩn bảo vệ lead" value={String(d.totals.hidden)} icon={EyeOff} />
        <Stat label="Thành khách" value={String(d.totals.leads)} icon={UserPlus} />
        <Stat label="Đã nhắn Messenger" value={String(d.totals.messaged)} icon={ShieldCheck} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Bảo vệ lead">
          <div className="px-5 pb-4">
            <Row label="Bật tự động hoá" hint={d.pageId ? `Fanpage ${d.pageId}` : "Chưa nhập Page ID"}>
              <Switch disabled={ro} checked={cfg.enabled} onCheckedChange={(v) => set({ enabled: v })} />
            </Row>
            <Row label="Ẩn bình luận có số điện thoại" hint="Khách vẫn thấy bình luận của mình, người khác không thấy. Số điện thoại tự thành khách.">
              <Switch disabled={ro} checked={cfg.hidePhone} onCheckedChange={(v) => set({ hidePhone: v })} />
            </Row>
            <div className="py-3">
              <div className="text-sm font-medium mb-2">Từ khoá nhạy cảm cần ẩn</div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {cfg.hideKeywords.map((k) => (
                  <Badge key={k} variant="secondary" className="gap-1">
                    {k}
                    {!ro && <button type="button" aria-label={`Xoá ${k}`} onClick={() => set({ hideKeywords: cfg.hideKeywords.filter((x) => x !== k) })}>×</button>}
                  </Badge>
                ))}
              </div>
              {!ro && (
                <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = kw.trim(); if (v && !cfg.hideKeywords.includes(v)) set({ hideKeywords: [...cfg.hideKeywords, v] }); setKw(""); }}>
                  <Input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="VD: giá gốc, chủ đầu tư" />
                  <Button type="submit" variant="outline" size="icon" aria-label="Thêm từ khoá"><Plus className="h-4 w-4" /></Button>
                </form>
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Tự phản hồi">
          <div className="px-5 pb-4 space-y-3">
            <Row label="Trả lời bình luận (xoay vòng mẫu)" hint="Viết {a|b|c} để mỗi bình luận nhận câu khác nhau; {name}, {project} tự điền.">
              <Switch disabled={ro} checked={cfg.autoReply} onCheckedChange={(v) => set({ autoReply: v })} />
            </Row>
            {cfg.replyTemplates.map((t, i) => (
              <div key={i} className="flex gap-2">
                <Textarea disabled={ro} rows={2} value={t} onChange={(e) => set({ replyTemplates: cfg.replyTemplates.map((x, j) => (j === i ? e.target.value : x)) })} />
                {!ro && <Button variant="ghost" size="icon" aria-label="Xoá mẫu" onClick={() => set({ replyTemplates: cfg.replyTemplates.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            ))}
            {!ro && <Button variant="outline" size="sm" onClick={() => set({ replyTemplates: [...cfg.replyTemplates, ""] })}><Plus className="h-4 w-4 mr-1" />Thêm mẫu</Button>}
            <Row label="Nhắn riêng Messenger kèm nút" hint="Gửi 1 tin riêng cho người bình luận, có nút mở landing dự án.">
              <Switch disabled={ro} checked={cfg.autoMessage} onCheckedChange={(v) => set({ autoMessage: v })} />
            </Row>
            <Textarea disabled={ro} rows={3} value={cfg.messageText} onChange={(e) => set({ messageText: e.target.value })} />
            <Input disabled={ro} value={cfg.buttonLabel} maxLength={20} onChange={(e) => set({ buttonLabel: e.target.value })} placeholder="Tên nút" />
          </div>
        </SectionCard>

        <SectionCard title="Gắn bài viết / quảng cáo với dự án">
          <div className="px-5 pb-4 space-y-2">
            <p className="text-xs text-muted-foreground">Bình luận trên bài viết đã gắn sẽ vào đúng dự án và nút Messenger mở landing dự án đó.</p>
            {Object.entries(cfg.postProjects).map(([pid, prj]) => (
              <div key={pid} className="flex items-center justify-between text-sm border-b border-border py-2">
                <span className="truncate"><span className="font-mono text-xs">{pid}</span> → {projectName(prj)}</span>
                {!ro && <Button variant="ghost" size="icon" aria-label="Bỏ gắn" onClick={() => { const n = { ...cfg.postProjects }; delete n[pid]; set({ postProjects: n }); }}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            ))}
            {!ro && (
              <div className="flex flex-col sm:flex-row gap-2">
                <Input value={postId} onChange={(e) => setPostId(e.target.value.trim())} placeholder="Mã bài viết (pageid_postid)" />
                <select className="h-9 rounded-md border border-input bg-transparent px-2 text-sm" value={postProject} onChange={(e) => setPostProject(e.target.value)}>
                  <option value="">Chọn dự án</option>
                  {d.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <Button variant="outline" disabled={!/^[\d_]+$/.test(postId) || !postProject}
                  onClick={() => { set({ postProjects: { ...cfg.postProjects, [postId]: postProject } }); setPostId(""); setPostProject(""); }}>Gắn</Button>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Phím tắt trả lời nhanh (Hộp thoại)">
          <div className="px-5 pb-4 space-y-2">
            <p className="text-xs text-muted-foreground">Nhân viên gõ /phím_tắt trong ô soạn tin để chèn nội dung.</p>
            {cfg.quickReplies.map((r, i) => (
              <div key={i} className="flex gap-2 items-start">
                <Input disabled={ro} className="w-28 font-mono" value={"/" + r.shortcut}
                  onChange={(e) => set({ quickReplies: cfg.quickReplies.map((x, j) => (j === i ? { ...x, shortcut: e.target.value.replace(/^\//, "").toLowerCase().replace(/[^a-z0-9_]/g, "") } : x)) })} />
                <Textarea disabled={ro} rows={2} value={r.text}
                  onChange={(e) => set({ quickReplies: cfg.quickReplies.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} />
                {!ro && <Button variant="ghost" size="icon" aria-label="Xoá phím tắt" onClick={() => set({ quickReplies: cfg.quickReplies.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            ))}
            {!ro && <Button variant="outline" size="sm" onClick={() => set({ quickReplies: [...cfg.quickReplies, { shortcut: "moi" + (cfg.quickReplies.length + 1), text: "" }] })}><Plus className="h-4 w-4 mr-1" />Thêm phím tắt</Button>}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Nhật ký bình luận gần đây">
        <div className="px-5 pb-4 divide-y divide-border">
          {d.logs.length === 0 && <div className="py-6 text-sm text-muted-foreground text-center">Chưa có bình luận nào được xử lý.</div>}
          {d.logs.map((l: any) => (
            <div key={l.id} className="py-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{l.author_name ?? "Người dùng Facebook"}</span>
                <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("vi-VN")}</span>
                {l.hidden && <Badge variant="secondary">Đã ẩn</Badge>}
                {l.lead_id && <Badge>Thành khách</Badge>}
                {l.replied && <Badge variant="outline">Đã trả lời</Badge>}
                {l.messaged && <Badge variant="outline">Đã nhắn riêng</Badge>}
                {(l.errors ?? []).length > 0 && <Badge variant="destructive">Lỗi {(l.errors ?? []).length}</Badge>}
              </div>
              <div className="text-muted-foreground mt-1 line-clamp-2">{l.message}</div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
