import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Ctx = { open: boolean; setOpen: (v: boolean) => void; toggle: () => void; close: () => void };
const MobileDrawerContext = createContext<Ctx | null>(null);

export function MobileDrawerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);
  return (
    <MobileDrawerContext.Provider value={{ open, setOpen, toggle, close }}>
      {children}
    </MobileDrawerContext.Provider>
  );
}

export function useMobileDrawer() {
  const ctx = useContext(MobileDrawerContext);
  if (!ctx) return { open: false, setOpen: () => {}, toggle: () => {}, close: () => {} };
  return ctx;
}
