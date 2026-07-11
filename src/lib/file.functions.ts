// Files — metadata CRUD + audit trail server functions.
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

// Helper: append an audit_logs row. Never throws — audit failure must not block the action.
async function logAudit(
  supabase: any,
  tenantId: string | null | undefined,
  userId: string | null | undefined,
  action: string,
  entityId: string | null | undefined,
  diff: Record<string, unknown> | null = null,
  entity: string = "file",
) {
  if (!tenantId) return;
  try {
    await supabase.from("audit_logs").insert({
      tenant_id: tenantId,
      actor_user_id: userId ?? null,
      action,
      entity,
      entity_id: entityId ? String(entityId) : null,
      diff: diff ?? null,
    });
  } catch {
    /* swallow */
  }
}

export const listFiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      tenantId: string;
      q?: string;
      folder?: string;
      tag?: string;
      leadId?: string;
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
    if (data.leadId && data.leadId !== "all") {
      if (data.leadId === "none") q = q.is("related_id", null);
      else q = q.eq("related_type", "lead").eq("related_id", data.leadId);
    }
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
    await logAudit(supabase, tenantId, userId, "file.upload", row.id, {
      name: row.name, size: row.size, folder: row.folder, tag: row.tag,
      related_type: row.related_type, related_id: row.related_id,
    });
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
    const { supabase, userId } = context;
    const { id, ...patch } = data;
    const { data: before } = await supabase
      .from("files")
      .select("tenant_id,name,folder,tag")
      .eq("id", id)
      .single();
    const { data: row, error } = await supabase
      .from("files")
      .update(patch)
      .eq("id", id)
      .select(SELECT)
      .single();
    if (error) throw new Error(error.message);
    await logAudit(supabase, row.tenant_id, userId, "file.update", id, { before, after: patch });
    return row;
  });

export const softDeleteFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("files")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id)
      .select("id,tenant_id,name")
      .single();
    if (error) throw new Error(error.message);
    await logAudit(supabase, row?.tenant_id, userId, "file.soft_delete", data.id, { name: row?.name });
    return { ok: true };
  });

export const restoreFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("files")
      .update({ deleted_at: null })
      .eq("id", data.id)
      .select("id,tenant_id,name")
      .single();
    if (error) throw new Error(error.message);
    await logAudit(supabase, row?.tenant_id, userId, "file.restore", data.id, { name: row?.name });
    return { ok: true };
  });

export const hardDeleteFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error: e1 } = await supabase
      .from("files")
      .select("bucket,path,name,tenant_id")
      .eq("id", data.id)
      .single();
    if (e1) throw new Error(e1.message);
    if (row?.bucket && row?.path) {
      await supabase.storage.from(row.bucket).remove([row.path]);
    }
    const { error } = await supabase.from("files").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(supabase, row?.tenant_id, userId, "file.hard_delete", data.id, { name: row?.name, path: row?.path });
    return { ok: true };
  });

export const getFileSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("files")
      .select("bucket,path,name,tenant_id")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    const { data: signed, error: e2 } = await supabase.storage
      .from(row.bucket)
      .createSignedUrl(row.path, 60 * 10, { download: row.name });
    if (e2) throw new Error(e2.message);
    await logAudit(supabase, row.tenant_id, userId, "file.download", data.id, { name: row.name });
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

// ---------- Bulk & taxonomy CRUD ----------

export const bulkUpdateFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        ids: z.array(z.string().uuid()).min(1).max(500),
        folder: z.string().trim().max(120).nullable().optional(),
        tag: z.string().trim().max(60).nullable().optional(),
      })
      .refine((v) => v.folder !== undefined || v.tag !== undefined, {
        message: "Cần chỉ định folder hoặc tag",
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: { folder?: string | null; tag?: string | null } = {};
    if (data.folder !== undefined) patch.folder = data.folder || null;
    if (data.tag !== undefined) patch.tag = data.tag || null;
    const { error, count } = await supabase
      .from("files")
      .update(patch, { count: "exact" })
      .eq("tenant_id", data.tenantId)
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    await logAudit(supabase, data.tenantId, userId, "file.bulk_update", null, {
      ids: data.ids, patch, affected: count ?? 0,
    });
    return { ok: true, updated: count ?? 0 };
  });

export const renameFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        from: z.string().trim().min(1).max(120),
        to: z.string().trim().min(1).max(120),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.from === data.to) return { ok: true, updated: 0 };
    const { error, count } = await supabase
      .from("files")
      .update({ folder: data.to }, { count: "exact" })
      .eq("tenant_id", data.tenantId)
      .eq("folder", data.from);
    if (error) throw new Error(error.message);
    await logAudit(supabase, data.tenantId, userId, "folder.rename", null, {
      from: data.from, to: data.to, affected: count ?? 0,
    }, "files.folder");
    return { ok: true, updated: count ?? 0 };
  });

export const deleteFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        folder: z.string().trim().min(1).max(120),
        moveTo: z.string().trim().max(120).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error, count } = await supabase
      .from("files")
      .update({ folder: data.moveTo || null }, { count: "exact" })
      .eq("tenant_id", data.tenantId)
      .eq("folder", data.folder);
    if (error) throw new Error(error.message);
    await logAudit(supabase, data.tenantId, userId, "folder.delete", null, {
      folder: data.folder, moveTo: data.moveTo ?? null, affected: count ?? 0,
    }, "files.folder");
    return { ok: true, updated: count ?? 0 };
  });

export const renameTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        from: z.string().trim().min(1).max(60),
        to: z.string().trim().min(1).max(60),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.from === data.to) return { ok: true, updated: 0 };
    const { error, count } = await supabase
      .from("files")
      .update({ tag: data.to }, { count: "exact" })
      .eq("tenant_id", data.tenantId)
      .eq("tag", data.from);
    if (error) throw new Error(error.message);
    await logAudit(supabase, data.tenantId, userId, "tag.rename", null, {
      from: data.from, to: data.to, affected: count ?? 0,
    }, "files.tag");
    return { ok: true, updated: count ?? 0 };
  });

export const deleteTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        tag: z.string().trim().min(1).max(60),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error, count } = await supabase
      .from("files")
      .update({ tag: null }, { count: "exact" })
      .eq("tenant_id", data.tenantId)
      .eq("tag", data.tag);
    if (error) throw new Error(error.message);
    await logAudit(supabase, data.tenantId, userId, "tag.delete", null, {
      tag: data.tag, affected: count ?? 0,
    }, "files.tag");
    return { ok: true, updated: count ?? 0 };
  });

// ---------- Audit trail ----------

const FILE_AUDIT_ENTITIES = ["file", "files.folder", "files.tag"];

export const listFileAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      tenantId: string;
      fileId?: string;
      action?: string;
      actorUserId?: string;
      limit?: number;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const limit = Math.min(Math.max(1, data.limit ?? 100), 500);

    let q = supabase
      .from("audit_logs")
      .select("id,tenant_id,actor_user_id,action,entity,entity_id,diff,occurred_at")
      .eq("tenant_id", data.tenantId)
      .in("entity", FILE_AUDIT_ENTITIES)
      .order("occurred_at", { ascending: false })
      .limit(limit);

    if (data.fileId) q = q.eq("entity", "file").eq("entity_id", data.fileId);
    if (data.action) q = q.eq("action", data.action);
    if (data.actorUserId) q = q.eq("actor_user_id", data.actorUserId);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    // Enrich with actor display name/email via profiles.
    const actorIds = Array.from(
      new Set((rows ?? []).map((r: any) => r.actor_user_id).filter(Boolean)),
    ) as string[];
    let actors: Record<string, { name: string | null; email: string | null }> = {};
    if (actorIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id,full_name,email")
        .in("user_id", actorIds);
      for (const p of profs ?? []) {
        actors[p.user_id] = { name: p.full_name ?? null, email: p.email ?? null };
      }
    }
    return {
      rows: (rows ?? []).map((r: any) => ({
        ...r,
        actor: r.actor_user_id ? actors[r.actor_user_id] ?? null : null,
      })),
    };
  });
