import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { capabilityForPath } from "@/lib/permissions";
import { hubForPath, type HubTab } from "@/lib/nav-hubs";

/** Tab điều hướng giữa các trang con của cùng một trung tâm menu. */
export function HubTabs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { currentRole, isPlatformAdmin, can } = useAuth();
  const hub = hubForPath(pathname);
  if (!hub) return null;

  const allowed = (t: HubTab) => {
    if (isPlatformAdmin) return true;
    const cap = capabilityForPath(t.to);
    if (cap && !can(cap)) return false;
    if (!t.roles) return true;
    return currentRole !== null && (t.roles as string[]).includes(currentRole);
  };
  const tabs = hub.tabs.filter(allowed);
  if (tabs.length < 2) return null;

  return (
    <nav aria-label="Trang con" className="-mx-4 lg:mx-0 mb-6 border-b border-border">
      <div className="flex gap-1 overflow-x-auto scrollbar-thin px-4 lg:px-0 snap-x">
        {tabs.map((t) => {
          const active = pathname === t.to || pathname.startsWith(t.to + "/");
          return (
            <Link
              key={t.to}
              to={t.to}
              aria-current={active ? "page" : undefined}
              className={[
                "snap-start shrink-0 inline-flex items-center h-11 px-3 text-sm font-medium border-b-2 -mb-px transition-colors duration-150",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
