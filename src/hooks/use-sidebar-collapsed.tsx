import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Ctx = { collapsed: boolean; toggle: () => void; setCollapsed: (v: boolean) => void };
const SidebarCollapsedContext = createContext<Ctx | null>(null);

const KEY = "sidebar:collapsed";

export function SidebarCollapsedProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v === "1") setCollapsed(true);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, collapsed ? "1" : "0");
    } catch {}
  }, [collapsed]);

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
