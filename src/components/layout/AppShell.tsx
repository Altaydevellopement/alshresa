import { useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ChevronDown, LogOut, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NavGroup, NavLinkItem } from "./familyNav";

interface AppShellProps {
  brand: ReactNode;
  groups: NavGroup[];
  /** Liens secondaires en bas de la barre latérale */
  secondaryLinks?: NavLinkItem[];
  secondaryTitle?: string;
  /** Bloc utilisateur (nom, rôle) */
  userLabel: string;
  userSubLabel?: string;
  onLogout: () => void;
  /** Éléments affichés à droite de la barre supérieure (ex. cloche) */
  topbarExtras?: ReactNode;
  /** Onglets de la barre inférieure mobile (familles) */
  mobileTabs?: NavLinkItem[];
  badges?: Partial<Record<NonNullable<NavLinkItem["badge"]>, number>>;
  children: ReactNode;
}

const CountBadge = ({ count }: { count?: number }) =>
  count && count > 0 ? (
    <span className="ml-auto min-w-[20px] rounded-full bg-primary px-1.5 text-center text-[11px] font-bold leading-5 text-primary-foreground">
      {count > 9 ? "9+" : count}
      <span className="sr-only"> non lue{count > 1 ? "s" : ""}</span>
    </span>
  ) : null;

const isActivePath = (pathname: string, href: string) =>
  href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);

const SideLink = ({ item, onNavigate, badge }: { item: NavLinkItem; onNavigate?: () => void; badge?: number }) => {
  const { pathname } = useLocation();
  const active = isActivePath(pathname, item.href);
  return (
    <NavLink
      to={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
      )}
    >
      <item.icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-primary" : "")} aria-hidden="true" />
      <span className="truncate">{item.label}</span>
      <CountBadge count={badge} />
    </NavLink>
  );
};

const SideGroup = ({ group, onNavigate, badges }: { group: NavGroup; onNavigate?: () => void; badges?: AppShellProps["badges"] }) => {
  const { pathname } = useLocation();
  const containsActive = group.items.some((i) => isActivePath(pathname, i.href));
  const [open, setOpen] = useState(true);
  if (group.items.length === 0) return null;

  if (!group.label) {
    return (
      <div className="space-y-1">
        {group.items.map((item) => (
          <SideLink key={item.href} item={item} onNavigate={onNavigate} badge={item.badge ? badges?.[item.badge] : undefined} />
        ))}
      </div>
    );
  }

  const GroupIcon = group.icon;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          containsActive ? "text-foreground" : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
        )}
      >
        {GroupIcon && <GroupIcon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />}
        <span>{group.label}</span>
        <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", open ? "rotate-0" : "-rotate-90")} aria-hidden="true" />
      </button>
      {open && (
        <div className="mt-1 ml-[1.15rem] space-y-1 border-l-2 border-sidebar-border pl-3">
          {group.items.map((item) => (
            <SideLink key={item.href} item={item} onNavigate={onNavigate} badge={item.badge ? badges?.[item.badge] : undefined} />
          ))}
        </div>
      )}
    </div>
  );
};

const SidebarContent = ({
  brand, groups, secondaryLinks, secondaryTitle, userLabel, userSubLabel, onLogout, onNavigate, badges,
}: Omit<AppShellProps, "children" | "topbarExtras" | "mobileTabs"> & { onNavigate?: () => void }) => (
  <div className="flex h-full flex-col">
    <div className="px-5 pt-5 pb-4">{brand}</div>
    <nav aria-label="Navigation principale" className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
      {groups.map((group, i) => (
        <SideGroup key={group.label ?? i} group={group} onNavigate={onNavigate} badges={badges} />
      ))}
      {secondaryLinks && secondaryLinks.length > 0 && (
        <div className="space-y-1 pt-2">
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{secondaryTitle ?? "Informations"}</p>
          {secondaryLinks.map((item) => (
            <SideLink key={item.href} item={item} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </nav>
    <div className="border-t border-sidebar-border p-4">
      <div className="mb-3 min-w-0 px-1">
        <p className="truncate text-sm font-bold text-foreground">{userLabel}</p>
        {userSubLabel && <p className="truncate text-xs text-muted-foreground">{userSubLabel}</p>}
      </div>
      <Button variant="outline" className="w-full justify-start" onClick={onLogout}>
        <LogOut aria-hidden="true" />
        Se déconnecter
      </Button>
    </div>
  </div>
);

/** Structure commune : barre latérale (desktop), barre supérieure + tiroir + onglets (mobile). */
export const AppShell = (props: AppShellProps) => {
  const { brand, topbarExtras, mobileTabs, badges, children } = props;
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:shadow-lg"
      >
        Aller au contenu
      </a>

      {/* Barre latérale desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-sidebar-border bg-sidebar lg:block">
        <SidebarContent {...props} />
      </aside>

      {/* Barre supérieure mobile / tablette */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-card/95 px-4 backdrop-blur lg:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Ouvrir le menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[85vw] max-w-xs p-0">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <SheetDescription className="sr-only">Navigation de l'application</SheetDescription>
            <SidebarContent {...props} onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="min-w-0 flex-1">{brand}</div>
        {topbarExtras}
      </header>

      {/* Barre supérieure desktop (actions) */}
      {topbarExtras && (
        <div className="sticky top-0 z-30 hidden h-16 items-center justify-end gap-2 border-b border-border/60 bg-background/90 px-8 backdrop-blur lg:ml-72 lg:flex">
          {topbarExtras}
        </div>
      )}

      <main id="contenu" tabIndex={-1} className={cn("lg:ml-72 focus:outline-none", mobileTabs && "pb-24 lg:pb-0")}>
        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8 animate-fade-in" key={pathname}>
          {children}
        </div>
      </main>

      {/* Onglets mobiles */}
      {mobileTabs && (
        <nav
          aria-label="Raccourcis"
          className="fixed inset-x-0 bottom-0 z-30 grid border-t border-border bg-card/95 backdrop-blur lg:hidden"
          style={{ gridTemplateColumns: `repeat(${mobileTabs.length}, minmax(0, 1fr))`, paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {mobileTabs.map((tab) => {
            const active = isActivePath(pathname, tab.href);
            const count = tab.badge ? badges?.[tab.badge] : undefined;
            return (
              <Link
                key={tab.href}
                to={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span className={cn("relative flex h-7 w-12 items-center justify-center rounded-full", active && "bg-peach")}>
                  <tab.icon className="h-5 w-5" aria-hidden="true" />
                  {count ? <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card" aria-hidden="true" /> : null}
                </span>
                {tab.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
};
