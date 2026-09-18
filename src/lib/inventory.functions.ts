// Giỏ hàng đa loại hình — server functions.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LISTING_STATUSES, PROPERTY_KINDS } from "@/lib/property-types";

const SELECT =
  "id,tenant_id,project_id,product_type,sku,code,name,zone,floor,area,usable_area,bedrooms,bathrooms,direction,legal_status,price,currency,unit,status,listing_status,hold_expires_at,deal_id,is_public,description,image_url,attributes,created_at,updated_at";

const KindEnum = z.enum(PROPERTY_KINDS);
const ListingEnum = z.enum(LISTING_STATUSES);

const ItemInput = z.object({
  project_id: z.string().uuid().nullable().optional(),
  product_type: KindEnum,
  name: z.string().trim().max(200).optional().nullable(),
  code: z.string().trim().max(80).optional().nullable(),
  zone: z.string().trim().max(80).optional().nullable(),
  floor: z.number().int().optional().nullable(),
  area: z.number().nonnegative().optional().nullable(),
  usable_area: z.number().nonnegative().optional().nullable(),
  bedrooms: z.number().int().nonnegative().optional().nullable(),
  bathrooms: z.number().int().nonnegative().optional().nullable(),
  direction: z.string().trim().max(40).optional().nullable(),
  legal_status: z.string().trim().max(80).optional().nullable(),
  price: z.number().nonnegative().default(0),
  currency: z.string().trim().max(8).default("VND"),
  unit: z.string().trim().max(40).optional().nullable(),
  listing_status: ListingEnum.default("available"),
  hold_expires_at: z.string().optional().nullable(),
  is_public: z.boolean().default(false),
  description: z.string().trim().max(4000).optional().nullable(),
  image_url: z.string().trim().max(2000).optional().nullable(),
  attributes: z.record(z.string(), z.unknown()).default({}),
});

function displayName(v: { name?: string | null; code?: string | null; zone?: string | null }) {
  return (
    (v.name ?? "").trim() ||
    [v.zone, v.code].filter(Boolean).join("-") ||
    "Sản phẩm"
  );
}

export const listInventory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      tenantId: string;
      projectId?: string | null;
      kind?: string;
      listingStatus?: string;
      zone?: string;
      floor?: number | null;
      bedrooms?: number | null;
      search?: string;
      priceMin?: number | null;
      priceMax?: number | null;
      areaMin?: number | null;
      areaMax?: number | null;
      page?: number;
      pageSize?: number;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const page = Math.max(1, data.page ?? 1);
    const pageSize = Math.min(Math.max(1, data.pageSize ?? 60), 300);
    const from = (page - 1) * pageSize;

    let q = supabase
      .from("products")
      .select(SELECT, { count: "exact" })
      .eq("tenant_id", data.tenantId)
      .not("product_type", "is", null)
      .order("zone", { ascending: true })
      .order("floor", { ascending: true })
      .order("code", { ascending: true })
      .range(from, from + pageSize - 1);

    if (data.projectId) q = q.eq("project_id", data.projectId);
    if (data.kind && data.kind !== "all") q = q.eq("product_type", data.kind);
    if (data.listingStatus && data.listingStatus !== "all")
      q = q.eq("listing_status", data.listingStatus);
    if (data.zone && data.zone !== "all") q = q.eq("zone", data.zone);
    if (data.floor != null) q = q.eq("floor", data.floor);
    if (data.bedrooms != null) q = q.eq("bedrooms", data.bedrooms);
    if (data.priceMin != null) q = q.gte("price", data.priceMin);
    if (data.priceMax != null) q = q.lte("price", data.priceMax);
    if (data.areaMin != null) q = q.gte("area", data.areaMin);
    if (data.areaMax != null) q = q.lte("area", data.areaMax);
    const s = (data.search ?? "").trim();
    if (s) {
      const like = `%${s.replace(/[%_]/g, (m) => "\\" + m)}%`;
      q = q.or(`name.ilike.${like},code.ilike.${like},zone.ilike.${like},sku.ilike.${like}`);
    }

    const { data: items, error, count } = await q;
    if (error) throw new Error(error.message);

    // Tổng hợp theo trạng thái + danh sách khu/toà (toàn bộ, không theo trang)
    let sq = supabase
      .from("products")
      .select("listing_status,zone,price,product_type,project_id")
      .eq("tenant_id", data.tenantId)
      .not("product_type", "is", null)
      .limit(5000);
    if (data.projectId) sq = sq.eq("project_id", data.projectId);
    if (data.kind && data.kind !== "all") sq = sq.eq("product_type", data.kind);
    const { data: allRows, error: sErr } = await sq;
    if (sErr) throw new Error(sErr.message);

    const byStatus: Record<string, number> = {};
    const zones = new Set<string>();
    for (const r of allRows ?? []) {
      byStatus[r.listing_status as string] = (byStatus[r.listing_status as string] ?? 0) + 1;
      if (r.zone) zones.add(r.zone);
    }

    return {
      items: items ?? [],
      total: count ?? 0,
      page,
      pageSize,
      byStatus,
      totalAll: (allRows ?? []).length,
      zones: [...zones].sort((a, b) => a.localeCompare(b, "vi")),
    };
  });

export const listInventoryProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("projects")
      .select("id,name,property_type")
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createInventoryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid() }).and(ItemInput).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { tenantId, ...rest } = data;
    const { data: row, error } = await context.supabase
      .from("products")
      .insert({
        tenant_id: tenantId,
        created_by: context.userId,
        ...rest,
        name: displayName(rest),
        category: rest.product_type,
        hold_expires_at: rest.hold_expires_at || null,
      })
      .select(SELECT)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateInventoryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid() }).and(ItemInput.partial()).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const body: Record<string, unknown> = { ...patch };
    if (patch.name !== undefined || patch.code !== undefined || patch.zone !== undefined) {
      body["name"] = displayName(patch as { name?: string | null });
    }
    if (patch.hold_expires_at !== undefined) body["hold_expires_at"] = patch.hold_expires_at || null;
    const { data: row, error } = await context.supabase
      .from("products")
      .update(body)
      .eq("id", id)
      .select(SELECT)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteInventoryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const changeListingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        listing_status: ListingEnum,
        note: z.string().trim().max(500).optional().nullable(),
        hold_expires_at: z.string().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("products")
      .update({
        listing_status: data.listing_status,
        hold_expires_at:
          data.listing_status === "reserved" || data.listing_status === "deposited"
            ? data.hold_expires_at || null
            : null,
      })
      .eq("id", data.id)
      .select(SELECT)
      .single();
    if (error) throw new Error(error.message);

    if (data.note) {
      const { data: last } = await supabase
        .from("product_status_history")
        .select("id")
        .eq("product_id", data.id)
        .order("occurred_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (last?.id) {
        await supabase
          .from("product_status_history")
          .update({ note: data.note })
          .eq("id", last.id);
      }
    }
    return row;
  });

export const listStatusHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { productId: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("product_status_history")
      .select("id,from_status,to_status,note,changed_by,occurred_at")
      .eq("product_id", data.productId)
      .order("occurred_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Tạo hàng loạt theo dải: mỗi tầng/khu N sản phẩm. */
export const bulkCreateInventory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        project_id: z.string().uuid().nullable().optional(),
        product_type: KindEnum,
        zone: z.string().trim().max(80),
        floorFrom: z.number().int().min(0).default(1),
        floorTo: z.number().int().min(0).default(1),
        perFloor: z.number().int().min(1).max(100).default(8),
        codePattern: z.string().trim().max(60).default("{zone}-{floor}.{index}"),
        area: z.number().nonnegative().optional().nullable(),
        bedrooms: z.number().int().nonnegative().optional().nullable(),
        price: z.number().nonnegative().default(0),
        currency: z.string().max(8).default("VND"),
        useFloors: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const rows: Record<string, unknown>[] = [];
    const floors = data.useFloors
      ? Array.from(
          { length: Math.max(0, data.floorTo - data.floorFrom + 1) },
          (_, i) => data.floorFrom + i,
        )
      : [null];

    for (const floor of floors) {
      for (let i = 1; i <= data.perFloor; i++) {
        const code = data.codePattern
          .replaceAll("{zone}", data.zone)
          .replaceAll("{floor}", floor == null ? "" : String(floor))
          .replaceAll("{index}", String(i).padStart(2, "0"));
        rows.push({
          tenant_id: data.tenantId,
          created_by: context.userId,
          project_id: data.project_id ?? null,
          product_type: data.product_type,
          category: data.product_type,
          zone: data.zone,
          floor,
          code,
          name: code,
          area: data.area ?? null,
          bedrooms: data.bedrooms ?? null,
          price: data.price,
          currency: data.currency,
          listing_status: "available",
          status: "active",
          attributes: {},
        });
      }
    }
    if (rows.length === 0) return { created: 0 };
    if (rows.length > 500) throw new Error("Tối đa 500 sản phẩm mỗi lần tạo");

    const { data: inserted, error } = await context.supabase
      .from("products")
      .insert(rows)
      .select("id");
    if (error) throw new Error(error.message);
    return { created: inserted?.length ?? 0 };
  });

/** Nhập từ tệp CSV/Excel đã được phân tích ở phía giao diện. */
export const importInventory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        project_id: z.string().uuid().nullable().optional(),
        product_type: KindEnum,
        rows: z.array(ItemInput.partial()).min(1).max(500),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const rows = data.rows.map((r) => ({
      tenant_id: data.tenantId,
      created_by: context.userId,
      project_id: data.project_id ?? null,
      product_type: data.product_type,
      category: data.product_type,
      status: "active",
      listing_status: r.listing_status ?? "available",
      ...r,
      name: displayName(r),
      attributes: r.attributes ?? {},
    }));
    const { data: inserted, error } = await context.supabase
      .from("products")
      .insert(rows)
      .select("id");
    if (error) throw new Error(error.message);
    return { created: inserted?.length ?? 0 };
  });
