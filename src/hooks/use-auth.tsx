import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { listMyTenants } from "@/lib/auth.functions";
import type { Database } from "@/integrations/supabase/types";
import { permissionsFor } from "@/lib/permissions";

export type Role = Database["public"]["Enums"]["app_role"];

export type TenantSummary = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  role: Role;
};

type AuthCtx = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  tenants: TenantSummary[];
  /** Đã tải xong danh sách workspace của người dùng */
  tenantsLoaded: boolean;
  isPlatformAdmin: boolean;
  currentTenant: TenantSummary | null;
  currentRole: Role | null;
  switchTenant: (tenantId: string) => void;
  refreshTenants: () => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (roles: Role | Role[]) => boolean;
  /** Quyền xem dữ liệu workspace hiện tại */
  canView: boolean;
  /** Quyền chỉnh sửa dữ liệu workspace hiện tại */
  canEdit: boolean;
  /** Quyền quản lý thành viên & vai trò */
  canManageMembers: boolean;
};

const Ctx = createContext<AuthCtx | null>(null);
const TENANT_KEY = "active_tenant_id";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [tenantsLoaded, setTenantsLoaded] = useState(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem(TENANT_KEY) : null,
  );

  const fetchTenants = useServerFn(listMyTenants);

  const refreshTenants = useCallback(async () => {
    try {
      const r = (await fetchTenants()) ?? { tenants: [], isPlatformAdmin: false };
      const ts = Array.isArray(r.tenants) ? r.tenants : [];
      setTenants(ts);
      setIsPlatformAdmin(!!r.isPlatformAdmin);
      if (!currentTenantId && ts.length) {
        const first = ts[0].id;
        setCurrentTenantId(first);
        if (typeof window !== "undefined") localStorage.setItem(TENANT_KEY, first);
      } else if (currentTenantId && !ts.some((t) => t.id === currentTenantId) && ts.length) {
        const first = ts[0].id;
        setCurrentTenantId(first);
        if (typeof window !== "undefined") localStorage.setItem(TENANT_KEY, first);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTenantsLoaded(true);
    }
  }, [fetchTenants, currentTenantId]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) {
        setTenants([]);
        setTenantsLoaded(false);
        setIsPlatformAdmin(false);
        setCurrentTenantId(null);
        if (typeof window !== "undefined") localStorage.removeItem(TENANT_KEY);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) refreshTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const switchTenant = useCallback((id: string) => {
    setCurrentTenantId(id);
    if (typeof window !== "undefined") localStorage.setItem(TENANT_KEY, id);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") localStorage.removeItem(TENANT_KEY);
  }, []);

  const value = useMemo<AuthCtx>(() => {
    const currentTenant = tenants.find((t) => t.id === currentTenantId) ?? null;
    const currentRole = currentTenant?.role ?? (isPlatformAdmin ? "platform_admin" : null);
    return {
      session,
      user: session?.user ?? null,
      loading,
      tenants,
      tenantsLoaded,
      isPlatformAdmin,
      currentTenant,
      currentRole,
      switchTenant,
      refreshTenants,
      signOut,
      hasRole: (r) => {
        if (!currentRole) return false;
        if (currentRole === "platform_admin") return true;
        const arr = Array.isArray(r) ? r : [r];
        return arr.includes(currentRole);
      },
      canView: permissionsFor(currentRole).view,
      canEdit: permissionsFor(currentRole).edit,
      canManageMembers: permissionsFor(currentRole).manageMembers,
    };
  }, [session, loading, tenants, tenantsLoaded, isPlatformAdmin, currentTenantId, switchTenant, refreshTenants, signOut]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
