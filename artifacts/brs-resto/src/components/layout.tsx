import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "react-i18next";
import {
  useLogout,
  useListIngredients, getListIngredientsQueryKey,
  useListNotifications, getListNotificationsQueryKey,
  useMarkNotificationRead, useMarkAllNotificationsRead, useDeleteNotification,
} from "@workspace/api-client-react";
import {
  LayoutDashboard, ChefHat, UtensilsCrossed, ClipboardList,
  Package, Users, LineChart, Gamepad2, LogOut, Menu as MenuIcon,
  Search, X, Bell, Settings, Globe, AlertTriangle, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { LANGUAGES } from "@/i18n/index";

// ─── Language Switcher ────────────────────────────────────────────────────────
function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = LANGUAGES.find(l => l.code === i18n.language) ?? LANGUAGES[1];

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        onClick={() => setOpen(v => !v)}
        title="Language / Langue / اللغة"
      >
        <Globe className="h-4 w-4" />
      </Button>
      {open && (
        <div className="absolute end-0 top-11 w-40 bg-popover border rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Language</p>
          </div>
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => { i18n.changeLanguage(lang.code); setOpen(false); }}
              className={`w-full text-start px-4 py-2.5 text-sm hover:bg-accent flex items-center justify-between transition-colors ${
                current.code === lang.code ? "bg-primary/10 font-semibold text-primary" : "text-foreground"
              }`}
              dir={lang.dir}
            >
              <span>{lang.label}</span>
              {current.code === lang.code && (
                <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Notification Bell ────────────────────────────────────────────────────────
function NotificationBell() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: notifications } = useListNotifications(
    {},
    { query: { queryKey: getListNotificationsQueryKey({}), refetchInterval: 8000 } }
  );
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const deleteNotif = useDeleteNotification();

  const all = notifications ?? [];
  const unread = all.filter(n => !n.read);
  const urgent = all.filter(n => n.type === "call_waiter");
  const standard = all.filter(n => n.type !== "call_waiter");
  const urgentUnread = urgent.filter(n => !n.read).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleMarkAll = () =>
    markAll.mutate(undefined, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListNotificationsQueryKey({}) }),
    });

  const handleDismiss = (id: number) =>
    deleteNotif.mutate({ id }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListNotificationsQueryKey({}) }),
    });

  const handleMarkOne = (id: number) =>
    markRead.mutate({ id }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListNotificationsQueryKey({}) }),
    });

  const NotifRow = ({ n }: { n: (typeof all)[0] }) => (
    <div key={n.id} className={`px-4 py-3 flex items-start gap-3 hover:bg-muted/40 transition-colors ${!n.read ? "bg-primary/5" : ""}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          {n.type === "call_waiter" ? (
            <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium border border-red-200">
              <AlertTriangle className="h-2.5 w-2.5" /> {t("notifications.callWaiter")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium border border-blue-200">
              <Info className="h-2.5 w-2.5" /> {t("notifications.requestBill")}
            </span>
          )}
          <span className="text-xs font-medium text-foreground">Table {n.tableNumber}</span>
          {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />}
        </div>
        {n.message && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{n.message}</p>}
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
        </p>
      </div>
      <div className="flex gap-1 flex-shrink-0 items-center">
        {!n.read && (
          <button onClick={() => handleMarkOne(n.id)} className="text-[11px] text-primary hover:underline whitespace-nowrap">
            {t("notifications.read")}
          </button>
        )}
        <button onClick={() => handleDismiss(n.id)} className="text-[11px] text-muted-foreground hover:text-destructive p-0.5 rounded">
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        onClick={() => setOpen(v => !v)}
        data-testid="button-notification-bell"
      >
        <Bell className="h-5 w-5" />
        {unread.length > 0 && (
          <span className={`absolute top-1 end-1 h-4 min-w-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
            urgentUnread > 0 ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-blue-500 text-white"
          }`}>
            {unread.length}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute end-0 top-11 w-80 bg-popover border rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <h3 className="font-semibold text-sm">{t("notifications.title")}</h3>
            <div className="flex items-center gap-2">
              {unread.length > 0 && (
                <button onClick={handleMarkAll} className="text-xs text-primary hover:underline">
                  {t("notifications.markAllRead")}
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {all.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                {t("notifications.noNotifications")}
              </div>
            )}

            {/* URGENT section */}
            {urgent.length > 0 && (
              <>
                <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border-b border-red-100">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                  <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">
                    Urgent — {urgent.filter(n => !n.read).length > 0 && `${urgent.filter(n => !n.read).length} unread`}
                  </span>
                </div>
                <div className="divide-y divide-red-50">
                  {urgent.map(n => <NotifRow key={n.id} n={n} />)}
                </div>
              </>
            )}

            {/* STANDARD section */}
            {standard.length > 0 && (
              <>
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-b border-blue-100 border-t">
                  <Info className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                    Standard
                  </span>
                </div>
                <div className="divide-y">
                  {standard.map(n => <NotifRow key={n.id} n={n} />)}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Global Search ────────────────────────────────────────────────────────────
function GlobalSearch() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();

  const { data: ingredients } = useListIngredients({
    query: { queryKey: getListIngredientsQueryKey() },
  });

  const results: { label: string; href: string }[] = [];
  if (query.trim().length >= 2) {
    const q = query.toLowerCase();
    ingredients?.forEach(ing => {
      if (ing.name.toLowerCase().includes(q))
        results.push({ label: `${ing.name} — ${t("nav.inventory")}`, href: "/inventory" });
    });
  }

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <Search className="absolute start-3 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder={`${t("common.search")}...`}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="ps-9 pe-8 w-52 md:w-64 h-9 bg-muted/50 border-muted focus:bg-background text-sm"
        />
        {query && (
          <button className="absolute end-2" onClick={() => setQuery("")}>
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-10 start-0 z-50 w-full min-w-[220px] bg-popover border rounded-md shadow-lg overflow-hidden">
          {results.map((r, i) => (
            <button
              key={i}
              className="w-full text-start px-4 py-2.5 text-sm hover:bg-accent flex items-center gap-2"
              onMouseDown={() => { setLocation(r.href); setQuery(""); setOpen(false); }}
            >
              <Package className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── App Layout ───────────────────────────────────────────────────────────────
export function AppLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
  const [location, setLocation] = useLocation();
  const logout = useLogout();

  const { data: ingredients } = useListIngredients({
    query: { queryKey: getListIngredientsQueryKey() },
  });
  const lowStockCount = ingredients?.filter(i => i.isLow).length ?? 0;

  const handleLogout = () => {
    setUser(null);
    setLocation("/login");
    logout.mutate(undefined);
  };

  const navItems = [
    { key: "dashboard",  href: "/dashboard",  icon: LayoutDashboard, roles: ["owner"] },
    { key: "orders",     href: "/orders",      icon: ClipboardList,   roles: ["owner", "receptionist"] },
    { key: "tables",     href: "/tables",      icon: UtensilsCrossed, roles: ["owner", "receptionist"] },
    { key: "menu",       href: "/menu",        icon: ChefHat,         roles: ["owner", "receptionist"] },
    { key: "inventory",  href: "/inventory",   icon: Package,         roles: ["owner"],
      badge: lowStockCount > 0 ? lowStockCount : undefined },
    { key: "customers",  href: "/customers",   icon: Users,           roles: ["owner", "receptionist"] },
    { key: "quiz",       href: "/quiz",        icon: Gamepad2,        roles: ["owner"] },
    { key: "analytics",  href: "/analytics",   icon: LineChart,       roles: ["owner"] },
    { key: "settings",   href: "/settings",    icon: Settings,        roles: ["owner"] },
  ];

  const visibleNavItems = navItems.filter(
    item => !item.roles || (user && item.roles.includes(user.role))
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="px-6 py-5 border-b border-sidebar-border">
        <h1 className="text-2xl font-serif font-bold text-primary">BRS Resto</h1>
        <p className="text-[9px] text-sidebar-foreground/50 uppercase tracking-widest mt-0.5 leading-tight">Système de Gestion</p>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {visibleNavItems.map(item => {
          const isActive = location === item.href || location.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}>
              <div
                data-testid={`nav-${item.key}`}
                className={`group flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 cursor-pointer relative ${
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:translate-x-0.5 rtl:hover:-translate-x-0.5"
                }`}
              >
                {isActive && (
                  <span className="absolute start-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-e-full bg-primary-foreground/60" />
                )}
                <span className="flex items-center gap-3 min-w-0">
                  <item.icon className={`h-[18px] w-[18px] flex-shrink-0 transition-transform ${!isActive ? "group-hover:scale-110" : ""}`} />
                  <span className="truncate text-sm">{t(`nav.${item.key}` as any)}</span>
                </span>
                {item.badge != null && (
                  <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs flex-shrink-0">
                    {item.badge}
                  </Badge>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="px-2 py-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2.5 mb-1 rounded-lg bg-sidebar-accent/40">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0 ring-2 ring-primary/20">
            {user?.username.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">{user?.username}</p>
            <p className="text-[11px] text-sidebar-foreground/50 capitalize">
              {t(`auth.role.${user?.role}` as any)}
            </p>
          </div>
        </div>
        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-150 group"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform" />
          {t("nav.logout")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex w-64 flex-col border-e border-border h-screen sticky top-0 flex-shrink-0">
        <SidebarContent />
      </aside>

      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <header className="flex items-center justify-between px-4 md:px-6 h-14 border-b border-border bg-card/80 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <MenuIcon className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 bg-sidebar border-e-0">
                <SidebarContent />
              </SheetContent>
            </Sheet>
            <span className="md:hidden text-lg font-serif font-bold text-primary">BRS Resto</span>
          </div>

          <div className="flex-1 flex justify-center md:justify-start md:ms-4">
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-1 ms-3">
            <LanguageSwitcher />
            <NotificationBell />
            <Badge variant="outline" className="capitalize text-xs hidden md:flex ms-1">
              {t(`auth.role.${user?.role}` as any)}
            </Badge>
          </div>
        </header>

        <main className="flex-1 p-5 md:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
