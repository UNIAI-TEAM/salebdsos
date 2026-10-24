import * as React from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "salebds-theme";

function readInitial(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark") return v;
  } catch { /* ignore */ }
  return "dark";
}

function apply(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = theme === "dark" ? "#0B0F1A" : "#FFFFFF";
}

let current: Theme = readInitial();
const listeners = new Set<() => void>();

function setTheme(theme: Theme) {
  if (theme === current) return;
  current = theme;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch { /* ignore */ }
  apply(theme);
  listeners.forEach((l) => l());
}

export function initTheme() {
  apply(current);
}

export function useTheme() {
  const theme = React.useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => "dark" as Theme,
  );
  return { theme, setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") };
}
