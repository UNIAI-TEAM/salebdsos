import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MANAGER = new Set(["owner", "admin", "manager", "platform_admin"]);

export const askAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tenantId: z.string().uuid(),
      messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) })).min(1).max(40),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("tenant_id", data.tenantId).eq("user_id", userId);
    const list = (roles ?? []).map((r: any) => r.role);
    if (!list.length) throw new Error("Bạn không thuộc sàn này");
    const { runAgent } = await import("./ai-agent.server");
    try {
      return await runAgent({ supabase, tenantId: data.tenantId, userId, canManage: list.some((r) => MANAGER.has(r)) }, data.messages);
    } catch (e: any) {
      const s = e?.statusCode ?? e?.status;
      if (s === 402) throw new Error("Hết lượt AI, vui lòng nạp thêm credit.");
      if (s === 429) throw new Error("AI đang quá tải, thử lại sau ít phút.");
      throw new Error(e?.message ?? "Lỗi trợ lý AI");
    }
  });
