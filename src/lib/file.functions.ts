// Files — metadata CRUD server functions.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SELECT =
  "id,tenant_id,bucket,path,name,size,mime,folder,tag,related_type,related_id,uploaded_by,deleted_at,created_at,updated_at";

const CreateInput = z.object({
  tenantId: z.string().uuid(),
  bucket: z.string().trim().min(1).max(64).default("project-assets"),
  path: z.string().trim().min(1).max(500),
  name: z.string().trim().min(1).max(255),
  size: z.number().int().min(0).max(5_000_000_000),
  mime: z.string().trim().max(120).optional().nullable(),
  folder: z.string().trim().max(120).optional().nullable(),
  tag: z.string().trim().max(60).optional().nullable(),
  related_type: z.string().trim().max(40).optional().nullable(),
  related_id: z.string().uuid().optional().nullable(),
});

export const listFiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      tenantId: string;
      q?: string;
      folder?: string;
      tag?: string;
      includeDeleted?: boolean;
      page?: number;
      pageSize?: number;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const page = Math.max(1, data.page ?? 1);
    const pageSize = Math.min(Math.max(1, data.pageSize ?? 50), 200);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let q = supabase
      .from("files")
      .select(SELECT, { count: "exact" })
      .eq("tenant_id", data.tenantId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (!data.includeDeleted) q = q.is("deleted_at", null);
    if (data.folder && data.folder !== "all") q = q.eq("folder", data.folder);
    if (data.tag && data.tag !== "all") q = q.eq("tag", data.tag);
    if (data.q) {
      const term = data.q.replace(/[%,]/g, " ").trim();
      if (term) q = q.ilike("name", `%${term}%`);
    }

    const { data: items, error, count } = await q;
    if (error) throw new Error(error.message);
    return { items: items ?? [], total: count ?? 0, page, pageSize };
  });

export const createFileRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { tenantId, ...rest } = data;
    const { data: row, error } = await supabase
      .from("files")
      .insert({ tenant_id: tenantId, uploaded_by: userId, ...rest })
      .select(SELECT)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateFileMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().trim().min(1).max(255).optional(),
        folder: z.string().trim().max(120).nullable().optional(),
        tag: z.string().trim().max(60).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { data: row, error } = await context.supabase
      .from("files")
      .update(patch)
      .eq("id", id)
      .select(SELECT)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const softDeleteFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("files")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const restoreFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("files")
      .update({ deleted_at: null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const hardDeleteFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error: e1 } = await supabase
      .from("files")
      .select("bucket,path")
      .eq("id", data.id)
      .single();
    if (e1) throw new Error(e1.message);
    if (row?.bucket && row?.path) {
      await supabase.storage.from(row.bucket).remove([row.path]);
    }
    const { error } = await supabase.from("files").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getFileSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("files")
      .select("bucket,path,name")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    const { data: signed, error: e2 } = await supabase.storage
      .from(row.bucket)
      .createSignedUrl(row.path, 60 * 10, { download: row.name });
    if (e2) throw new Error(e2.message);
    return { url: signed.signedUrl, name: row.name };
  });

export const listFileFacets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("files")
      .select("folder,tag,size")
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null);
    if (error) throw new Error(error.message);
    const folders: Record<string, number> = {};
    const tags: Record<string, number> = {};
    let totalSize = 0;
    for (const r of rows ?? []) {
      if (r.folder) folders[r.folder] = (folders[r.folder] ?? 0) + 1;
      if (r.tag) tags[r.tag] = (tags[r.tag] ?? 0) + 1;
      totalSize += Number(r.size ?? 0);
    }
    return { folders, tags, totalFiles: rows?.length ?? 0, totalSize };
  });
