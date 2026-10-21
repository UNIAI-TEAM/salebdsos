import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ADMIN_ROLES, TEAM_VIEW_ROLES } from "@/lib/permissions";
import { BANK_KEY, parseBankSettings } from "@/lib/bank-recon";

async function roles(context: any, tenantId: string) {
  const { data } = await context.supabase.from("user_roles").select("role").eq("tenant_id", tenantId).eq("user_id", context.userId);
  const r = (data ?? []).map((x: any) => x.role as string);
  if (!r.some((x: string) => TEAM_VIEW_ROLES.has(x))) throw new Error("Bạn không có quyền xem đối soát ngân hàng");
  return { canWrite: r.some((x: string) => ADMIN_ROLES.has(x)) };
}

export const getBankOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { canWrite } = await roles(context, data.tenantId);
    const sb = (context as any).supabase;
    const [{ data: s }, { data: txs }, { data: contracts }] = await Promise.all([
      sb.from("settings").select("value").eq("tenant_id", data.tenantId).eq("key", BANK_KEY).maybeSingle(),
      sb
        .from("bank_transactions")
        .select("id,bank_name,account_number,amount,content,transferred_at,status,matched_contract_id,note,allocation")
        .eq("tenant_id", data.tenantId)
        .order("transferred_at", { ascending: false })
        .limit(200),
      sb.from("contracts").select("id,code,net_price,status").eq("tenant_id", data.tenantId).is("deleted_at", null).neq("status", "cancelled").order("created_at", { ascending: false }).limit(300),
    ]);
    const cfg = parseBankSettings(s?.value);
    return { canWrite, settings: { ...cfg, keyHash: cfg.keyHash ? "set" : null }, transactions: txs ?? [], contracts: contracts ?? [] };
  });

export const saveBankSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        enabled: z.boolean(),
        provider: z.enum(["sepay", "casso", "other"]),
        bankName: z.string().trim().max(80),
        accountNumber: z.string().trim().max(40),
        accountName: z.string().trim().max(120),
        rotateKey: z.boolean().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { canWrite } = await roles(context, data.tenantId);
    if (!canWrite) throw new Error("Chỉ quản trị viên được cấu hình");
    const sb = (context as any).supabase;
    const { data: s } = await sb.from("settings").select("value").eq("tenant_id", data.tenantId).eq("key", BANK_KEY).maybeSingle();
    const prev = parseBankSettings(s?.value);
    let newKey: string | null = null;
    let keyHash = prev.keyHash;
    let keyHint = prev.keyHint;
    if (data.rotateKey || !prev.keyHash) {
      const { sha256 } = await import("@/lib/inbound-leads.server");
      const bytes = crypto.getRandomValues(new Uint8Array(24));
      newKey = "bank_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
      keyHash = sha256(newKey);
      keyHint = newKey.slice(-4);
    }
    const value = { enabled: data.enabled, provider: data.provider, bankName: data.bankName, accountNumber: data.accountNumber, accountName: data.accountName, keyHash, keyHint };
    const { error } = await sb
      .from("settings")
      .upsert({ tenant_id: data.tenantId, key: BANK_KEY, value, updated_by: context.userId } as never, { onConflict: "tenant_id,key" });
    if (error) throw new Error(error.message);
    return { ok: true, newKey };
  });

export const matchBankTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid(), txId: z.string().uuid(), contractId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { canWrite } = await roles(context, data.tenantId);
    if (!canWrite) throw new Error("Chỉ quản trị viên được khớp giao dịch");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { applyTransaction } = await import("@/lib/bank-recon.server");
    return applyTransaction(supabaseAdmin, { ...data, actorId: context.userId });
  });

export const ignoreBankTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid(), txId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { canWrite } = await roles(context, data.tenantId);
    if (!canWrite) throw new Error("Chỉ quản trị viên");
    const { error } = await (context as any).supabase
      .from("bank_transactions")
      .update({ status: "ignored" })
      .eq("id", data.txId)
      .eq("tenant_id", data.tenantId)
      .neq("status", "matched");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
