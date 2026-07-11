import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";

type Ctx = { collapsed: boolean; toggle: () => void; setCollapsed: (v: boolean) => void };
const SidebarCollapsedContext = createContext<Ctx | null>(null);

const LEGACY_KEY = "sidebar:collapsed";
const PREFIX = "sidebar:collapsed:";
const GLOBAL_KEY = `${PREFIX}__global__`;

function storageKey(tenantId: string | null | undefined) {
  return tenantId ? `${PREFIX}${tenantId}` : GLOBAL_KEY;
}

function readValue(key: string, fallbackKey?: string): boolean {
  try {
    const v = localStorage.getItem(key);
    if (v === "1") return true;
    if (v === "0") return false;
    if (fallbackKey) {
      const f = localStorage.getItem(fallbackKey);
      if (f === "1") return true;
    }
  } catch {}
  return false;
}

export function SidebarCollapsedProvider({ children }: { children: ReactNode }) {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id ?? null;
  const key = useMemo(() => storageKey(tenantId), [tenantId]);

  const [collapsed, setCollapsed] = useState<boolean>(false);

  // Reload the value whenever the active workspace changes.
  useEffect(() => {
    setCollapsed(readValue(key, tenantId ? GLOBAL_KEY : LEGACY_KEY));
  }, [key, tenantId]);

  useEffect(() => {
    try {
      localStorage.setItem(key, collapsed ? "1" : "0");
    } catch {}
  }, [collapsed, key]);

  return (
    <SidebarCollapsedContext.Provider value={{ collapsed, toggle: () => setCollapsed((v) => !v), setCollapsed }}>
      {children}
    </SidebarCollapsedContext.Provider>
  );
}

export function useSidebarCollapsed() {
  const ctx = useContext(SidebarCollapsedContext);
  if (!ctx) return { collapsed: false, toggle: () => {}, setCollapsed: () => {} };
  return ctx;
}
