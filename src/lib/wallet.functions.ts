// Wallet Cards — server functions
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PLATFORMS = ["apple", "google"] as const;

const WalletInput = z.object({
  card_id: z.string().uuid(),
  platform: z.enum(PLATFORMS),
  serial_number: z.string().trim().optional().nullable(),
  pass_url: z.string().trim().url().or(z.literal("")).nullable().optional(),
});

export const listWalletCards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("wallet_cards")
      .select(
        "id,tenant_id,card_id,platform,serial_number,pass_url,install_count,last_updated_at,created_at," +
          "cards!inner(id,slug,display_name,title,company,avatar_url,theme,fields)",
      )
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

export const listCardsForWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("cards")
      .select("id,display_name,title,company,slug")
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const walletStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("wallet_cards")
      .select("platform,install_count,last_updated_at")
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null);
    if (error) throw new Error(error.message);
    const total = rows?.length ?? 0;
    let installs = 0, apple = 0, google = 0, updated30d = 0;
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    for (const r of rows ?? []) {
      installs += Number(r.install_count ?? 0);
      if (r.platform === "apple") apple++;
      if (r.platform === "google") google++;
      if (r.last_updated_at && new Date(r.last_updated_at).getTime() >= cutoff) updated30d++;
    }
    return { total, installs, apple, google, updated30d };
  });

export const createWalletCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid() }).and(WalletInput).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { tenantId, ...rest } = data;
    const insert = {
      tenant_id: tenantId,
      card_id: rest.card_id,
      platform: rest.platform,
      serial_number: rest.serial_number || null,
      pass_url: rest.pass_url || null,
      last_updated_at: new Date().toISOString(),
    };
    const { data: row, error } = await supabase.from("wallet_cards").insert(insert).select("*").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateWalletCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid() }).and(WalletInput).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { id, ...rest } = data;
    const patch = {
      card_id: rest.card_id,
      platform: rest.platform,
      serial_number: rest.serial_number || null,
      pass_url: rest.pass_url || null,
      last_updated_at: new Date().toISOString(),
    };
    const { data: row, error } = await supabase
      .from("wallet_cards").update(patch).eq("id", id).select("*").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteWalletCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("wallet_cards")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
