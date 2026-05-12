import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type Role = Database["public"]["Enums"]["app_role"];

export const listMyTenants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: roles, error } = await supabase
      .from("user_roles")
      .select("tenant_id, role, tenants:tenant_id(id, name, slug, plan)")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    const isPlatformAdmin = roles?.some((r) => r.role === "platform_admin") ?? false;
    const tenants = (roles ?? [])
      .filter((r) => r.tenants)
      .map((r) => ({
        id: (r.tenants as any).id as string,
        name: (r.tenants as any).name as string,
        slug: (r.tenants as any).slug as string,
        plan: (r.tenants as any).plan as string,
        role: r.role as Role,
      }));
    return { tenants, isPlatformAdmin };
  });

export const registerAgency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string; slug: string }) =>
    z.object({
      name: z.string().min(2).max(120),
      slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, "Chỉ chữ thường, số, gạch ngang"),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: tid, error } = await supabase.rpc("register_agency", {
      _name: data.name,
      _slug: data.slug,
    });
    if (error) throw new Error(error.message);
    return { tenantId: tid as string };
  });

export const listMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) =>
    z.object({ tenantId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: roles, error } = await supabase
      .from("user_roles")
      .select("id, user_id, role, created_at")
      .eq("tenant_id", data.tenantId);
    if (error) throw new Error(error.message);
    const userIds = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
    let profiles: any[] = [];
    if (userIds.length) {
      const { data: ps } = await supabase
        .from("profiles")
        .select("user_id, email, full_name, avatar_url")
        .in("user_id", userIds);
      profiles = ps ?? [];
    }
    const { data: invites } = await supabase
      .from("invitations")
      .select("id, email, role, status, expires_at, created_at, token")
      .eq("tenant_id", data.tenantId)
      .order("created_at", { ascending: false });
    return {
      members: (roles ?? []).map((r) => {
        const p = profiles.find((x) => x.user_id === r.user_id);
        return {
          roleRowId: r.id as string,
          userId: r.user_id as string,
          role: r.role as Role,
          email: p?.email ?? null,
          fullName: p?.full_name ?? null,
          avatarUrl: p?.avatar_url ?? null,
          joinedAt: r.created_at as string,
        };
      }),
      invitations: invites ?? [],
    };
  });

export const inviteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string; email: string; role: Role }) =>
    z.object({
      tenantId: z.string().uuid(),
      email: z.string().email().max(254),
      role: z.enum(["owner", "admin", "manager", "agent", "viewer"]),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("invitations")
      .insert({
        tenant_id: data.tenantId,
        email: data.email.toLowerCase(),
        role: data.role,
        invited_by: userId,
      })
      .select("id, token, email, role, expires_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const revokeInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("invitations")
      .update({ status: "revoked" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const acceptInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { token: string }) =>
    z.object({ token: z.string().min(8).max(128) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: tid, error } = await context.supabase.rpc("accept_invitation", {
      _token: data.token,
    });
    if (error) throw new Error(error.message);
    return { tenantId: tid as string };
  });

export const updateMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { roleRowId: string; role: Role }) =>
    z.object({
      roleRowId: z.string().uuid(),
      role: z.enum(["owner", "admin", "manager", "agent", "viewer"]),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("user_roles")
      .update({ role: data.role })
      .eq("id", data.roleRowId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { roleRowId: string }) =>
    z.object({ roleRowId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("user_roles")
      .delete()
      .eq("id", data.roleRowId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
