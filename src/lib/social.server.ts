// Xử lý bình luận Fanpage: ẩn SĐT/từ khoá, trả lời xoay vòng, nhắn riêng Messenger kèm nút xem dự án.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SOCIAL_KEY, parseSocialSettings, hideReason, buildReply, fill } from "@/lib/social";
import { extractVnPhone } from "@/lib/integrations";

const GRAPH = "https://graph.facebook.com/v21.0";

async function graph(path: string, token: string, body: Record<string, unknown>) {
  const res = await fetch(`${GRAPH}/${path}?access_token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Facebook [${res.status}]: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

export type FbComment = {
  tenantId: string;
  pageId: string;
  postId: string | null;
  commentId: string;
  authorId: string | null;
  authorName: string | null;
  message: string;
  origin: string | null;
};

export async function handleFbComment(c: FbComment) {
  const token = process.env["FB_PAGE_ACCESS_TOKEN"];
  if (!token) return { skipped: "no_token" };
  if (c.authorId && c.authorId === c.pageId) return { skipped: "own_comment" };

  const { data: row } = await supabaseAdmin.from("settings").select("value")
    .eq("tenant_id", c.tenantId).eq("key", SOCIAL_KEY).maybeSingle();
  const cfg = parseSocialSettings(row?.value);
  if (!cfg.enabled) return { skipped: "disabled" };

  // Chống xử lý lặp: claim theo comment_id
  const phone = extractVnPhone(c.message);
  const { data: log, error: claimErr } = await supabaseAdmin.from("social_comment_logs").insert({
    tenant_id: c.tenantId, page_id: c.pageId, post_id: c.postId, comment_id: c.commentId,
    author_id: c.authorId, author_name: c.authorName, message: c.message.slice(0, 2000), phone,
  }).select("id").single();
  if (claimErr || !log) return { skipped: "duplicate" };

  const projectId = (c.postId && cfg.postProjects[c.postId]) || null;
  let projectName = "", projectUrl = c.origin ?? "";
  if (projectId) {
    const { data: p } = await supabaseAdmin.from("projects").select("name,slug").eq("id", projectId).maybeSingle();
    projectName = p?.name ?? "";
    if (p?.slug && c.origin) projectUrl = `${c.origin}/p/${p.slug}?utm_source=facebook&utm_medium=comment`;
  }
  const vars = { name: c.authorName?.split(" ").slice(-1)[0] || "anh/chị", project: projectName || "dự án" };
  const errors: string[] = [];
  const patch: Record<string, unknown> = {};

  // 1. Bảo vệ lead: ẩn bình luận có SĐT / từ khoá nhạy cảm
  if (hideReason(c.message, cfg)) {
    try { await graph(c.commentId, token, { is_hidden: true }); patch.hidden = true; }
    catch (e) { errors.push((e as Error).message); }
  }
  // 2. Nếu có SĐT → tạo khách luôn
  if (phone) {
    const { ingestInboundLead } = await import("@/lib/inbound-leads.server");
    const r = await ingestInboundLead({
      tenantId: c.tenantId, source: "facebook_comment", sourceLabel: "Bình luận Facebook",
      name: c.authorName, phone, email: null, productCode: null, budget: null,
      note: c.message.slice(0, 500), projectId, externalId: c.commentId,
      meta: { fb_page_id: c.pageId, fb_post_id: c.postId },
    }).catch((e) => { errors.push(String(e)); return null; });
    if (r && (r as any).ok) patch.lead_id = (r as any).leadId;
  }
  // 3. Trả lời bình luận xoay vòng mẫu
  if (cfg.autoReply) {
    const text = buildReply(cfg.replyTemplates, c.commentId, vars);
    if (text) {
      try { await graph(`${c.commentId}/comments`, token, { message: text }); patch.replied = true; }
      catch (e) { errors.push((e as Error).message); }
    }
  }
  // 4. Nhắn riêng Messenger kèm nút xem dự án
  if (cfg.autoMessage && cfg.messageText) {
    const text = fill(cfg.messageText, vars).slice(0, 640);
    const message = projectUrl.startsWith("https://")
      ? { attachment: { type: "template", payload: { template_type: "button", text,
          buttons: [{ type: "web_url", url: projectUrl, title: cfg.buttonLabel || "Xem dự án" }] } } }
      : { text };
    try { await graph(`${c.pageId}/messages`, token, { recipient: { comment_id: c.commentId }, message }); patch.messaged = true; }
    catch (e) { errors.push((e as Error).message); }
  }

  await supabaseAdmin.from("social_comment_logs").update({ ...patch, errors }).eq("id", log.id);
  return { ok: true, ...patch, errors: errors.length };
}
