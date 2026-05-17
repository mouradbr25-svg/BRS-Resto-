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
  Search, X, Bell, Settings, Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { LANGUAGES, type Language } from "@/i18n/index";

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

  const current = LANGUAGES.find(l => l.code === i18n.language) ?? LANGUAGES[0];

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
        <div className="absolute right-0 top-11 w-36 bg-popover border rounded-lg shadow-lg z-50 overflow-hidden">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => { i18n.changeLanguage(lang.code); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-accent flex items-center justify-between ${
                current.code === lang.code ? "bg-primary/10 font-semibold text-primary" : ""
              }`}
              dir={lang.dir}
            >
              <span>{lang.label}</span>
              {current.code === lang.code && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
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

  const unread = notifications?.filter(n => !n.read) ?? [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleMarkAll = () => {
    markAll.mutate(undefined, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListNotificationsQueryKey({}) }),
    });
  };

  const handleDismiss = (id: number) => {
    deleteNotif.mutate({ id }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListNotificationsQueryKey({}) }),
    });
  };

  const handleMarkOne = (id: number) => {
    markRead.mutate({ id }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListNotificationsQueryKey({}) }),
    });
  };

  const typeLabel = (type: string) =>
    type === "call_waiter" ? t("notifications.callWaiter") : t("notifications.requestBill");
  const typeColor = (type: string) => type === "call_waiter"
    ? "bg-amber-100 text-amber-800 border-amber-200"
    : "bg-blue-100 text-blue-800 border-blue-200";

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
          <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
            {unread.length}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-popover border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="font-semibold text-sm">{t("notifications.title")}</h3>
            {unread.length > 0 && (
              <button onClick={handleMarkAll} className="text-xs text-primary hover:underline">
                {t("notifications.markAllRead")}
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y">
            {notifications?.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {t("notifications.noNotifications")}
              </div>
            )}
            {notifications?.map(n => (
              <div key={n.id} className={`px-4 py-3 flex items-start gap-3 ${!n.read ? "bg-primary/5" : ""}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge variant="outline" className={`text-xs px-1.5 py-0 ${typeColor(n.type)}`}>
                      {typeLabel(n.type)}
                    </Badge>
                    <span className="text-xs font-medium">Table {n.tableNumber}</span>
                    {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />}
                  </div>
                  {n.message && <p className="text-xs text-muted-foreground line-clamp-1">{n.message}</p>}
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {!n.read && (
                    <button onClick={() => handleMarkOne(n.id)} className="text-[11px] text-primary hover:underline">
                      {t("notifications.read")}
                    </button>
                  )}
                  <button onClick={() => handleDismiss(n.id)} className="text-[11px] text-muted-foreground hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
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
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder={`${t("common.search")}...`}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="pl-9 pr-8 w-52 md:w-64 h-9 bg-muted/50 border-muted focus:bg-background text-sm"
        />
        {query && (
          <button className="absolute right-2" onClick={() => setQuery("")}>
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-10 left-0 z-50 w-full min-w-[220px] bg-popover border rounded-md shadow-lg overflow-hidden">
          {results.map((r, i) => (
            <button
              key={i}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent flex items-center gap-2"
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
  const qc = useQueryClient();

  const { data: ingredients } = useListIngredients({
    query: { queryKey: getListIngredientsQueryKey() },
  });
  const lowStockCount = ingredients?.filter(i => i.isLow).length ?? 0;

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => { setUser(null); setLocation("/login"); },
    });
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
      <div className="p-6 pb-4">
        <h1 className="text-2xl font-serif font-bold text-primary">BRS Resto</h1>
        <p className="text-xs text-sidebar-foreground/60 uppercase tracking-widest mt-0.5">Management</p>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {visibleNavItems.map(item => {
          const isActive = location === item.href || location.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}>
              <div
                data-testid={`nav-${item.key}`}
                className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-md transition-colors cursor-pointer ${
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                    : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground/80"
                }`}
              >
                <span className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {t(`nav.${item.key}` as any)}
                </span>
                {item.badge != null && (
                  <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                    {item.badge}
                  </Badge>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-4 py-2.5 mb-1 rounded-md bg-sidebar-accent/50">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
            {user?.username.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">{user?.username}</p>
            <p className="text-xs text-sidebar-foreground/60 capitalize">
              {t(`auth.role.${user?.role}` as any)}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent text-sm"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-3" />
          {t("nav.logout")}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex w-64 flex-col border-r border-border h-screen sticky top-0 flex-shrink-0">
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
              <SheetContent side="left" className="p-0 w-64 bg-sidebar border-r-0">
                <SidebarContent />
              </SheetContent>
            </Sheet>
            <span className="md:hidden text-lg font-serif font-bold text-primary">BRS Resto</span>
          </div>

          <div className="flex-1 flex justify-center md:justify-start md:ml-4">
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-1 ml-3">
            <LanguageSwitcher />
            <NotificationBell />
            <Badge variant="outline" className="capitalize text-xs hidden md:flex ml-1">
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
