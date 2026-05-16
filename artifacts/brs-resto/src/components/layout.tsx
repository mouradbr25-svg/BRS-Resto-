import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useLogout, useListIngredients, getListIngredientsQueryKey } from "@workspace/api-client-react";
import {
  LayoutDashboard,
  ChefHat,
  UtensilsCrossed,
  ClipboardList,
  Package,
  Users,
  LineChart,
  Gamepad2,
  LogOut,
  Menu as MenuIcon,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface SearchResult {
  type: "order" | "ingredient";
  label: string;
  href: string;
}

function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();

  const { data: ingredients } = useListIngredients({
    query: { queryKey: getListIngredientsQueryKey() },
  });

  const results: SearchResult[] = [];

  if (query.trim().length >= 2) {
    const q = query.toLowerCase();
    ingredients?.forEach(ing => {
      if (ing.name.toLowerCase().includes(q)) {
        results.push({ type: "ingredient", label: `${ing.name} (Inventory)`, href: "/inventory" });
      }
    });
  }

  const handleSelect = (href: string) => {
    setLocation(href);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          data-testid="input-global-search"
          placeholder="Search inventory, orders..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="pl-9 pr-8 w-56 md:w-72 h-9 bg-muted/50 border-muted focus:bg-background"
        />
        {query && (
          <button className="absolute right-2" onClick={() => setQuery("")}>
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-10 left-0 z-50 w-full bg-popover border rounded-md shadow-lg overflow-hidden">
          {results.map((r, i) => (
            <button
              key={i}
              data-testid={`search-result-${i}`}
              className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-2"
              onMouseDown={() => handleSelect(r.href)}
            >
              {r.type === "ingredient" ? (
                <Package className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, setUser } = useAuth();
  const [location, setLocation] = useLocation();
  const logout = useLogout();

  const { data: ingredients } = useListIngredients({
    query: { queryKey: getListIngredientsQueryKey() },
  });
  const lowStockCount = ingredients?.filter(i => i.isLow).length ?? 0;

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        setUser(null);
        setLocation("/login");
      },
    });
  };

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["owner"] },
    { label: "Orders", href: "/orders", icon: ClipboardList, roles: ["owner", "receptionist"] },
    { label: "Tables", href: "/tables", icon: UtensilsCrossed, roles: ["owner", "receptionist"] },
    { label: "Menu", href: "/menu", icon: ChefHat, roles: ["owner", "receptionist"] },
    {
      label: "Inventory",
      href: "/inventory",
      icon: Package,
      roles: ["owner"],
      badge: lowStockCount > 0 ? lowStockCount : undefined,
    },
    { label: "Customers", href: "/customers", icon: Users, roles: ["owner", "receptionist"] },
    { label: "Quiz", href: "/quiz", icon: Gamepad2, roles: ["owner"] },
    { label: "Analytics", href: "/analytics", icon: LineChart, roles: ["owner"] },
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
          const isActive =
            location === item.href || location.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}>
              <div
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-md transition-colors cursor-pointer ${
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                    : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground/80"
                }`}
              >
                <span className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {item.label}
                </span>
                {item.badge != null && (
                  <Badge
                    variant="destructive"
                    className="h-5 min-w-5 px-1.5 text-xs"
                    data-testid="badge-low-stock"
                  >
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
            <p className="text-xs text-sidebar-foreground/60 capitalize">{user?.role}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent text-sm"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-3" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border h-screen sticky top-0 flex-shrink-0">
        <SidebarContent />
      </aside>

      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top Header (desktop + mobile) */}
        <header className="flex items-center justify-between px-4 md:px-6 h-14 border-b border-border bg-card/80 backdrop-blur sticky top-0 z-10">
          {/* Mobile: hamburger + brand */}
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

          {/* Global search */}
          <div className="flex-1 flex justify-center md:justify-start md:ml-4">
            <GlobalSearch />
          </div>

          {/* Right: role badge */}
          <div className="hidden md:flex items-center gap-2 ml-4">
            <Badge variant="outline" className="capitalize text-xs">
              {user?.role}
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
