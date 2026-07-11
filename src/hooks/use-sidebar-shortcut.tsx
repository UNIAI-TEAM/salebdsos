import { useEffect } from "react";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import { useMobileDrawer } from "@/hooks/use-mobile-drawer";

/**
 * Global keyboard shortcut: Ctrl+B (Windows/Linux) or Cmd+B (macOS)
 * toggles the main navigation — sidebar on desktop, drawer on mobile.
 */
export function useSidebarShortcut() {
  const { toggle: toggleCollapsed } = useSidebarCollapsed();
  const { toggle: toggleDrawer } = useMobileDrawer();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key !== "b" && e.key !== "B") return;

      // Skip when the user is typing in an input/textarea/contenteditable
      const t = e.target as HTMLElement | null;
      if (t) {
        const tag = t.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable) {
          return;
        }
      }

      e.preventDefault();
      const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
      if (isMobile) toggleDrawer();
      else toggleCollapsed();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleCollapsed, toggleDrawer]);
}
