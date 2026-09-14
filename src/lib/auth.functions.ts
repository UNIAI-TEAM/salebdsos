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
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: tenant, error: tErr } = await supabaseAdmin
      .from("tenants")
      .insert({ name: data.name, slug: data.slug })
      .select("id")
      .single();
    if (tErr || !tenant) throw new Error(tErr?.message ?? "Failed to create tenant");
    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ tenant_id: tenant.id, user_id: userId, role: "owner" });
    if (rErr) throw new Error(rErr.message);
    return { tenantId: tenant.id as string };
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

    // Trạng thái xác nhận email của từng thành viên
    const confirmed = new Map<string, string | null>();
    if (userIds.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await Promise.all(
        userIds.map(async (uid) => {
          const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
          confirmed.set(uid, u?.user?.email_confirmed_at ?? null);
        }),
      );
    }

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
          emailConfirmedAt: confirmed.get(r.user_id) ?? null,
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
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inv, error: iErr } = await supabaseAdmin
      .from("invitations")
      .select("id, tenant_id, role, status, expires_at")
      .eq("token", data.token)
      .maybeSingle();
    if (iErr) throw new Error(iErr.message);
    if (!inv) throw new Error("Invalid invitation");
    if (inv.status !== "pending") throw new Error("Invitation no longer pending");
    if (new Date(inv.expires_at) < new Date()) {
      await supabaseAdmin.from("invitations").update({ status: "expired" }).eq("id", inv.id);
      throw new Error("Invitation expired");
    }
    await supabaseAdmin
      .from("user_roles")
      .insert({ tenant_id: inv.tenant_id, user_id: userId, role: inv.role });
    await supabaseAdmin
      .from("invitations")
      .update({ status: "accepted", accepted_at: new Date().toISOString(), accepted_by: userId })
      .eq("id", inv.id);
    return { tenantId: inv.tenant_id as string };
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

/* ===================== Tạo tài khoản nhân viên thật ===================== */

const STAFF_ROLES = ["admin", "manager", "agent", "viewer"] as const;

async function assertTenantAdmin(supabase: any, userId: string, tenantId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  const ok = (data ?? []).some((r: any) => r.role === "owner" || r.role === "admin");
  if (!ok) throw new Error("Bạn không có quyền quản lý thành viên của workspace này");
}

export const createStaffAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        email: z.string().email().max(254),
        password: z.string().min(8).max(72),
        fullName: z.string().trim().min(2).max(120),
        phone: z.string().trim().max(30).optional(),
        role: z.enum(STAFF_ROLES),
        requireEmailVerification: z.boolean().optional().default(true),
        redirectTo: z.string().url().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertTenantAdmin(supabase, userId, data.tenantId);

    const email = data.email.toLowerCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Nếu email đã có tài khoản, chỉ gắn quyền vào workspace hiện tại
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("email", email)
      .maybeSingle();

    let newUserId = existing?.user_id as string | undefined;
    let created = false;
    let verificationSent = false;

    if (!newUserId) {
      const { data: createdUser, error: cErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: data.password,
        email_confirm: !data.requireEmailVerification,
        user_metadata: { full_name: data.fullName, phone: data.phone ?? null },
      });
      if (cErr || !createdUser?.user) throw new Error(cErr?.message ?? "Không tạo được tài khoản");
      newUserId = createdUser.user.id;
      created = true;

      if (data.requireEmailVerification) {
        const { error: sErr } = await supabaseAdmin.auth.resend({
          type: "signup",
          email,
          options: data.redirectTo ? { emailRedirectTo: data.redirectTo } : undefined,
        });
        verificationSent = !sErr;
      }
    }

    await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          user_id: newUserId,
          email,
          full_name: data.fullName,
          phone: data.phone ?? null,
          default_tenant_id: data.tenantId,
        } as never,
        { onConflict: "user_id" },
      );

    const { data: roleRow, error: rErr } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { tenant_id: data.tenantId, user_id: newUserId, role: data.role } as never,
        { onConflict: "user_id,role" },
      )
      .select("id")
      .single();
    if (rErr) throw new Error(rErr.message);

    return { userId: newUserId, roleRowId: roleRow?.id as string, created, email };
  });

export const resetStaffPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        targetUserId: z.string().uuid(),
        password: z.string().min(8).max(72),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertTenantAdmin(supabase, userId, data.tenantId);

    const { data: member, error: mErr } = await supabase
      .from("user_roles")
      .select("id")
      .eq("tenant_id", data.tenantId)
      .eq("user_id", data.targetUserId)
      .limit(1);
    if (mErr) throw new Error(mErr.message);
    if (!member?.length) throw new Error("Người dùng không thuộc workspace này");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.targetUserId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
