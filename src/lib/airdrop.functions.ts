// AirDrop shares — CRUD server functions.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SELECT =
  "id,tenant_id,card_id,sender_id,recipient_name,device_name,device_kind,direction,status,distance_m,notes,created_at,updated_at";

const KindEnum = z.enum(["phone", "tablet", "laptop", "watch"]);
const DirEnum = z.enum(["sent", "received"]);
const StatusEnum = z.enum(["pending", "delivered", "declined", "canceled"]);

const Input = z.object({
  device_name: z.string().trim().min(1).max(200),
  device_kind: KindEnum.default("phone"),
  direction: DirEnum.default("sent"),
  status: StatusEnum.default("delivered"),
  recipient_name: z.string().trim().max(200).optional().nullable(),
  distance_m: z.number().min(0).max(1000).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  card_id: z.string().uuid().nullable().optional(),
});

export const listAirdropShares = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { tenantId: string; direction?: string; status?: string; page?: number; pageSize?: number }) => d,
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const page = Math.max(1, data.page ?? 1);
    const pageSize = Math.min(Math.max(1, data.pageSize ?? 50), 200);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let q = supabase
      .from("airdrop_shares")
      .select(SELECT, { count: "exact" })
      .eq("tenant_id", data.tenantId)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (data.direction && data.direction !== "all") q = q.eq("direction", data.direction);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);

    const { data: items, error, count } = await q;
    if (error) throw new Error(error.message);
    return { items: items ?? [], total: count ?? 0, page, pageSize };
  });

export const airdropStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) => d)
  .handler(async ({ data, context }) => {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const { data: rows, error } = await context.supabase
      .from("airdrop_shares")
      .select("direction,status,created_at")
      .eq("tenant_id", data.tenantId)
      .gte("created_at", since.toISOString());
    if (error) throw new Error(error.message);
    const sent = rows?.filter((r) => r.direction === "sent").length ?? 0;
    const received = rows?.filter((r) => r.direction === "received").length ?? 0;
    const delivered = rows?.filter((r) => r.status === "delivered").length ?? 0;
    const total = rows?.length ?? 0;
    const rate = total ? Math.round((delivered / total) * 100) : 0;
    return { sent, received, delivered, total, rate };
  });

export const createAirdropShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).and(Input).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { tenantId, ...rest } = data;
    const { data: row, error } = await supabase
      .from("airdrop_shares")
      .insert({ tenant_id: tenantId, sender_id: userId, ...rest })
      .select(SELECT)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateAirdropShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid() }).and(Input.partial()).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { data: row, error } = await context.supabase
      .from("airdrop_shares")
      .update(patch)
      .eq("id", id)
      .select(SELECT)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteAirdropShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("airdrop_shares").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAirdropCards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string; ids: string[] }) =>
    z.object({ tenantId: z.string().uuid(), ids: z.array(z.string().uuid()).max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.ids.length === 0) return { items: [] };
    const { data: items, error } = await context.supabase
      .from("cards")
      .select("id,slug,display_name,title,company,avatar_url,is_published")
      .eq("tenant_id", data.tenantId)
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return { items: items ?? [] };
  });
