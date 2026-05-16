import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useLogout } from "@workspace/api-client-react";
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
  Menu as MenuIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, setUser } = useAuth();
  const [location, setLocation] = useLocation();
  const logout = useLogout();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        setUser(null);
        setLocation("/login");
      }
    });
  };

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["owner"] },
    { label: "Orders", href: "/orders", icon: ClipboardList, roles: ["owner", "receptionist"] },
    { label: "Tables", href: "/tables", icon: UtensilsCrossed, roles: ["owner", "receptionist"] },
    { label: "Menu", href: "/menu", icon: ChefHat, roles: ["owner", "receptionist"] },
    { label: "Inventory", href: "/inventory", icon: Package, roles: ["owner"] },
    { label: "Customers", href: "/customers", icon: Users, roles: ["owner", "receptionist"] },
    { label: "Quiz", href: "/quiz", icon: Gamepad2, roles: ["owner"] },
    { label: "Analytics", href: "/analytics", icon: LineChart, roles: ["owner"] },
  ];

  const visibleNavItems = navItems.filter(item => !item.roles || (user && item.roles.includes(user.role)));

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="p-6">
        <h1 className="text-2xl font-serif font-bold text-primary">BRS Resto</h1>
        <p className="text-sm text-sidebar-foreground/70 uppercase tracking-widest mt-1">Management</p>
      </div>
      
      <nav className="flex-1 px-4 space-y-2">
        {visibleNavItems.map((item) => {
          const isActive = location === item.href || location.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}>
              <div className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors cursor-pointer ${
                isActive 
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium" 
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground/80"
              }`}>
                <item.icon className="h-5 w-5" />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-4 py-3 mb-2 rounded-md bg-sidebar-accent/50">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
            {user?.username.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">{user?.username}</p>
            <p className="text-xs text-sidebar-foreground/60 capitalize">{user?.role}</p>
          </div>
        </div>
        <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent" onClick={handleLogout}>
          <LogOut className="h-5 w-5 mr-3" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar & Header */}
      <div className="flex-1 flex flex-col min-h-screen max-w-full">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card sticky top-0 z-10">
          <h1 className="text-xl font-serif font-bold text-primary">BRS Resto</h1>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <MenuIcon className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 bg-sidebar border-r-0">
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 p-6 lg:p-10 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
