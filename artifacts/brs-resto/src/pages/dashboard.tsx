import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  useGetDashboardStats, getGetDashboardStatsQueryKey,
  useGetRevenueStats, getGetRevenueStatsQueryKey,
} from "@workspace/api-client-react";
import type { DashboardStats } from "@workspace/api-client-react";
import { formatDZD } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle, TrendingUp, Utensils,
  ClipboardList, BarChart3, UtensilsCrossed, Package,
  ArrowUpRight, Clock, Users, ShoppingBag, Banknote,
  CreditCard, ChevronRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Live clock ───────────────────────────────────────────────────────────────
function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="text-right flex-shrink-0">
      <p className="text-3xl font-mono font-bold text-foreground tabular-nums leading-none">{timeStr}</p>
      <p className="text-xs text-muted-foreground mt-1 capitalize">{dateStr}</p>
    </div>
  );
}

// ─── Revenue chart tooltip ────────────────────────────────────────────────────
function RevTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="font-semibold mb-1.5 text-foreground">{label}</p>
      <p className="text-primary font-bold text-base">{formatDZD(payload[0]?.value ?? 0)}</p>
      <p className="text-muted-foreground mt-0.5">{payload[0]?.payload?.orders ?? 0} commandes</p>
    </div>
  );
}

// ─── Revenue Trend Card ───────────────────────────────────────────────────────
function RevenueTrendCard() {
  const [period, setPeriod] = useState<"day" | "week" | "month">("week");

  const { data: points, isLoading } = useGetRevenueStats(
    { period },
    { query: { queryKey: getGetRevenueStatsQueryKey({ period }) } }
  );

  const total = points?.reduce((s, p) => s + p.revenue, 0) ?? 0;
  const hasData = (points?.some(p => p.revenue > 0)) ?? false;

  const periods: { key: "day" | "week" | "month"; label: string }[] = [
    { key: "day",   label: "Auj." },
    { key: "week",  label: "7 jours" },
    { key: "month", label: "30 jours" },
  ];

  return (
    <Card className="shadow-sm col-span-full border-0 bg-card ring-1 ring-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="font-serif flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
              Tendance des revenus
            </CardTitle>
            <CardDescription>
              Total période : <span className="text-primary font-semibold">{formatDZD(total)}</span>
            </CardDescription>
          </div>
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {periods.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  period === p.key ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-52 w-full" />
        ) : !hasData ? (
          <div className="h-52 flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed rounded-xl">
            Aucune donnée de revenu pour le moment
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={points} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="hsl(12, 76%, 50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(12, 76%, 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} />
              <Tooltip content={<RevTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(12, 76%, 50%)" strokeWidth={2.5} fill="url(#revGrad)" dot={{ fill: "hsl(12, 76%, 50%)", r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Gradient KPI Card ────────────────────────────────────────────────────────
function StatCard({ title, value, sub, icon: Icon, gradient }: {
  title: string; value: string; sub: string; icon: React.ElementType; gradient: string;
}) {
  return (
    <div className={`relative rounded-2xl p-5 overflow-hidden shadow-lg ${gradient}`}>
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 85% 15%, rgba(255,255,255,0.8) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
            <Icon className="h-5 w-5" />
          </div>
          <ArrowUpRight className="h-4 w-4 opacity-40 text-white" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest opacity-75 mb-1 text-white">{title}</p>
        <p className="text-3xl font-extrabold leading-none text-white">{value}</p>
        <p className="text-xs mt-2 opacity-60 text-white">{sub}</p>
      </div>
    </div>
  );
}

// ─── Receptionist Dashboard ───────────────────────────────────────────────────
function ReceptionistDashboard({ stats }: { stats: DashboardStats }) {
  const { user } = useAuth();

  const navItems = [
    {
      href: "/orders",
      icon: ClipboardList,
      label: "Commandes",
      value: stats.activeOrders > 0 ? String(stats.activeOrders) : undefined,
      valueLabel: stats.activeOrders > 0 ? "en cuisine" : "aucune active",
      accent: "bg-blue-50 border-blue-200 hover:border-blue-400",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-700",
      badgeVariant: "default" as const,
    },
    {
      href: "/tables",
      icon: Utensils,
      label: "Tables",
      value: `${stats.tablesOccupied ?? 0}/${stats.totalTables ?? 0}`,
      valueLabel: "occupées",
      accent: "bg-violet-50 border-violet-200 hover:border-violet-400",
      iconBg: "bg-violet-100",
      iconColor: "text-violet-700",
    },
    {
      href: "/menu",
      icon: UtensilsCrossed,
      label: "Menu",
      value: undefined,
      valueLabel: "consulter",
      accent: "bg-amber-50 border-amber-200 hover:border-amber-400",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-700",
    },
    {
      href: "/inventory",
      icon: Package,
      label: "Inventaire",
      value: stats.lowStockCount > 0 ? String(stats.lowStockCount) : undefined,
      valueLabel: stats.lowStockCount > 0 ? "stocks bas" : "tout OK",
      accent: stats.lowStockCount > 0 ? "bg-red-50 border-red-200 hover:border-red-400" : "bg-green-50 border-green-200 hover:border-green-400",
      iconBg: stats.lowStockCount > 0 ? "bg-red-100" : "bg-green-100",
      iconColor: stats.lowStockCount > 0 ? "text-red-700" : "text-green-700",
      badgeVariant: "destructive" as const,
    },
    {
      href: "/customers",
      icon: Users,
      label: "Clients",
      value: undefined,
      valueLabel: "base clients",
      accent: "bg-slate-50 border-slate-200 hover:border-slate-400",
      iconBg: "bg-slate-100",
      iconColor: "text-slate-700",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-6 border-b-2 border-border/60">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-11 h-11 rounded-xl bg-primary shadow-lg shadow-primary/30 flex items-center justify-center flex-shrink-0">
              <UtensilsCrossed className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-foreground leading-none">BRS Resto</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-0.5">
                Tableau de bord &nbsp;·&nbsp; Réceptionniste
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2 ms-14">
            Bonjour, <span className="font-semibold text-foreground">{user?.username}</span>
          </p>
        </div>
        <LiveClock />
      </div>

      {/* Navigation shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {navItems.map(item => (
          <Link key={item.href} href={item.href}>
            <div className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all active:scale-95 hover:shadow-md ${item.accent}`}>
              {item.value && (
                <Badge className={`absolute top-2 right-2 text-[10px] h-5 px-1.5 ${item.badgeVariant === "destructive" ? "bg-red-500" : "bg-primary"} text-white`}>
                  {item.value}
                </Badge>
              )}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${item.iconBg}`}>
                <item.icon className={`h-5 w-5 ${item.iconColor}`} />
              </div>
              <p className="font-bold text-sm text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.valueLabel}</p>
              <ChevronRight className="absolute bottom-3 right-3 h-3.5 w-3.5 text-muted-foreground/40" />
            </div>
          </Link>
        ))}
      </div>

      {/* Unpaid alert */}
      {(stats.unpaidCount ?? 0) > 0 && (
        <Link href="/orders">
          <div className="flex items-center gap-4 bg-orange-50 border-2 border-orange-300 rounded-2xl p-4 cursor-pointer hover:bg-orange-100 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
              <CreditCard className="h-6 w-6 text-orange-700" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-orange-800">{stats.unpaidCount} commande{(stats.unpaidCount ?? 0) > 1 ? "s" : ""} en attente de paiement</p>
              <p className="text-xs text-orange-600 mt-0.5">Appuyez pour accéder aux encaissements</p>
            </div>
            <ChevronRight className="h-5 w-5 text-orange-500 flex-shrink-0" />
          </div>
        </Link>
      )}

      {/* Today's 3 key stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-lg shadow-blue-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/3 translate-x-1/3" />
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-4">
            <Users className="h-5 w-5 text-white" />
          </div>
          <p className="text-xs uppercase tracking-widest opacity-70 mb-1">Clients aujourd'hui</p>
          <p className="text-5xl font-extrabold">{stats.todayCustomersCount ?? 0}</p>
          <p className="text-xs opacity-50 mt-2">Visites du jour</p>
        </div>

        <div className="bg-gradient-to-br from-violet-600 to-violet-800 rounded-2xl p-6 text-white shadow-lg shadow-violet-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/3 translate-x-1/3" />
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-4">
            <ShoppingBag className="h-5 w-5 text-white" />
          </div>
          <p className="text-xs uppercase tracking-widest opacity-70 mb-1">Commandes du jour</p>
          <p className="text-5xl font-extrabold">{stats.todayOrdersCount ?? 0}</p>
          <p className="text-xs opacity-50 mt-2">Toutes commandes</p>
        </div>

        <div className="bg-gradient-to-br from-primary to-red-800 rounded-2xl p-6 text-white shadow-lg shadow-red-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/3 translate-x-1/3" />
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-4">
            <Banknote className="h-5 w-5 text-white" />
          </div>
          <p className="text-xs uppercase tracking-widest opacity-70 mb-1">Total du jour</p>
          <p className="text-2xl font-extrabold leading-tight">{formatDZD(stats.todayRevenue)}</p>
          <p className="text-xs opacity-50 mt-2">Revenus encaissés</p>
        </div>
      </div>
    </div>
  );
}

// ─── Owner Dashboard ──────────────────────────────────────────────────────────
function OwnerDashboard({ stats }: { stats: DashboardStats }) {
  const { user } = useAuth();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* System Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-6 border-b-2 border-border/60">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-11 h-11 rounded-xl bg-primary shadow-lg shadow-primary/30 flex items-center justify-center flex-shrink-0">
              <UtensilsCrossed className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-foreground leading-none">BRS Resto</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-0.5">
                Système de Gestion &nbsp;·&nbsp; Point de Vente &amp; CRM
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2 ms-14">
            Bienvenue, <span className="font-semibold text-foreground">{user?.username}</span>
          </p>
        </div>
        <LiveClock />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Revenus aujourd'hui"
          value={formatDZD(stats.todayRevenue)}
          sub={`Moy. commande : ${formatDZD(stats.avgOrderValue)}`}
          icon={TrendingUp}
          gradient="bg-gradient-to-br from-primary to-red-800"
        />
        <StatCard
          title="Commandes actives"
          value={String(stats.activeOrders)}
          sub={`${stats.todayOrdersCount ?? 0} commandes ce jour`}
          icon={ShoppingBag}
          gradient="bg-gradient-to-br from-blue-500 to-blue-800"
        />
        <StatCard
          title="Tables occupées"
          value={`${stats.tablesOccupied ?? 0} / ${stats.totalTables ?? 0}`}
          sub="Occupation en ce moment"
          icon={Utensils}
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-700"
        />
        <StatCard
          title="Stocks bas"
          value={String(stats.lowStockCount)}
          sub="Ingrédients sous 50%"
          icon={AlertCircle}
          gradient={stats.lowStockCount > 0 ? "bg-gradient-to-br from-orange-500 to-red-600" : "bg-gradient-to-br from-slate-500 to-slate-700"}
        />
      </div>

      {/* Unpaid alert for owner too */}
      {(stats.unpaidCount ?? 0) > 0 && (
        <Link href="/orders">
          <div className="flex items-center gap-4 bg-orange-50 border-2 border-orange-300 rounded-2xl p-4 cursor-pointer hover:bg-orange-100 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
              <CreditCard className="h-6 w-6 text-orange-700" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-orange-800">{stats.unpaidCount} commande{(stats.unpaidCount ?? 0) > 1 ? "s" : ""} en attente de paiement</p>
              <p className="text-xs text-orange-600 mt-0.5">Cliquer pour accéder aux encaissements</p>
            </div>
            <ChevronRight className="h-5 w-5 text-orange-500 flex-shrink-0" />
          </div>
        </Link>
      )}

      {/* Revenue Chart */}
      <RevenueTrendCard />

      {/* Quick Actions + Today Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <Card className="shadow-sm border-0 ring-1 ring-border/60 h-full">
            <CardHeader className="pb-4">
              <CardTitle className="font-serif text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Accès rapide
              </CardTitle>
              <CardDescription>Naviguer vers les sections clés</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { href: "/orders",    icon: ClipboardList,   label: "Commandes", isPrimary: true,  badge: stats.activeOrders > 0 ? String(stats.activeOrders) : undefined },
                  { href: "/tables",    icon: Utensils,        label: "Tables",    isPrimary: false },
                  { href: "/menu",      icon: UtensilsCrossed, label: "Menu",      isPrimary: false },
                  { href: "/inventory", icon: Package,         label: "Inventaire",isPrimary: false, badge: stats.lowStockCount > 0 ? String(stats.lowStockCount) : undefined },
                ].map(item => (
                  <Link key={item.href} href={item.href}>
                    <div className={`relative p-4 rounded-xl flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all active:scale-95 text-center min-h-[90px] border-2 ${
                      item.isPrimary
                        ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25 hover:bg-primary/90"
                        : "bg-muted/40 border-border hover:bg-muted hover:border-primary/40"
                    }`}>
                      {item.badge && (
                        <Badge className="absolute top-1.5 right-1.5 h-5 min-w-5 px-1.5 text-[10px]" variant={item.isPrimary ? "secondary" : "destructive"}>
                          {item.badge}
                        </Badge>
                      )}
                      <item.icon className="h-6 w-6" />
                      <span className="font-semibold text-sm leading-tight">{item.label}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today Summary */}
        <div>
          <Card className="shadow-sm border-0 ring-1 ring-border/60 h-full overflow-hidden relative bg-gradient-to-br from-zinc-900 to-zinc-800 text-white">
            <div className="absolute end-0 top-0 w-48 h-48 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <CardHeader className="relative">
              <CardTitle className="font-serif text-white text-base">Bilan</CardTitle>
              <CardDescription className="text-white/50 text-xs">Vue d'ensemble</CardDescription>
            </CardHeader>
            <CardContent className="relative space-y-4">
              {[
                { label: "Clients total", value: String(stats.totalCustomers) },
                { label: "Revenus semaine", value: formatDZD(stats.weekRevenue ?? 0) },
                { label: "Revenus mois", value: formatDZD(stats.monthRevenue ?? 0) },
              ].map((item, i) => (
                <div key={i} className={`flex justify-between items-center ${i < 2 ? "border-b border-white/10 pb-3" : ""}`}>
                  <span className="text-white/60 text-sm">{item.label}</span>
                  <span className="font-bold text-lg text-white">{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useGetDashboardStats({
    query: { queryKey: getGetDashboardStatsQueryKey() },
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-12 w-80" />
          <Skeleton className="h-12 w-44" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-36 w-full rounded-2xl" />)}
        </div>
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  if (!stats) return null;

  if (user?.role === "receptionist") {
    return <ReceptionistDashboard stats={stats} />;
  }

  return <OwnerDashboard stats={stats} />;
}
