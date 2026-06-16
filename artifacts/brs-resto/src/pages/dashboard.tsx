import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import {
  useGetDashboardStats, getGetDashboardStatsQueryKey,
  useGetRevenueStats, getGetRevenueStatsQueryKey,
} from "@workspace/api-client-react";
import { formatDZD } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle, TrendingUp, ShoppingBag, Utensils,
  ClipboardList, BarChart3, UtensilsCrossed, Package,
  ArrowUpRight, Clock,
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
      <p className="text-muted-foreground mt-0.5">{payload[1]?.value ?? 0} commandes</p>
    </div>
  );
}

// ─── Revenue Trend Card ───────────────────────────────────────────────────────
function RevenueTrendCard() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<"day" | "week" | "month">("week");

  const { data: points, isLoading } = useGetRevenueStats(
    { period },
    { query: { queryKey: getGetRevenueStatsQueryKey({ period }) } }
  );

  const total = points?.reduce((s, p) => s + p.revenue, 0) ?? 0;
  const hasData = (points?.some(p => p.revenue > 0)) ?? false;

  const periods: { key: "day" | "week" | "month"; label: string }[] = [
    { key: "day",   label: t("analytics.today") },
    { key: "week",  label: t("analytics.week")  },
    { key: "month", label: t("analytics.month") },
  ];

  return (
    <Card className="shadow-sm col-span-full border-0 bg-card ring-1 ring-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="font-serif flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
              {t("analytics.revenueTrend")}
            </CardTitle>
            <CardDescription>
              Total période&nbsp;: <span className="text-primary font-semibold">{formatDZD(total)}</span>
            </CardDescription>
          </div>
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {periods.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  period === p.key
                    ? "bg-background shadow text-foreground"
                    : "text-muted-foreground hover:text-foreground"
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
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
              />
              <Tooltip content={<RevTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(12, 76%, 50%)"
                strokeWidth={2.5}
                fill="url(#revGrad)"
                dot={{ fill: "hsl(12, 76%, 50%)", r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  title: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  gradient: string;
  textClass?: string;
}

function StatCard({ title, value, sub, icon: Icon, gradient, textClass = "text-white" }: StatCardProps) {
  return (
    <div className={`relative rounded-2xl p-5 overflow-hidden shadow-lg ${gradient}`}>
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: "radial-gradient(circle at 85% 15%, rgba(255,255,255,0.8) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
      }} />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center ${textClass}`}>
            <Icon className="h-5 w-5" />
          </div>
          <ArrowUpRight className={`h-4 w-4 opacity-40 ${textClass}`} />
        </div>
        <p className={`text-xs font-semibold uppercase tracking-widest opacity-75 mb-1 ${textClass}`}>{title}</p>
        <p className={`text-3xl font-extrabold leading-none ${textClass}`}>{value}</p>
        <p className={`text-xs mt-2 opacity-60 ${textClass}`}>{sub}</p>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: stats, isLoading } = useGetDashboardStats({
    query: { queryKey: getGetDashboardStatsQueryKey() },
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-12 w-40" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-36 w-full rounded-2xl" />)}
        </div>
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── System Header ─────────────────────────────────────────────────── */}
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
            {t("analytics.welcomeBack")},&nbsp;
            <span className="font-semibold text-foreground">{user?.username}</span>
          </p>
        </div>
        <LiveClock />
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t("analytics.todayRevenue")}
          value={formatDZD(stats.todayRevenue)}
          sub={`Moy. commande : ${formatDZD(stats.avgOrderValue)}`}
          icon={TrendingUp}
          gradient="bg-gradient-to-br from-primary to-red-800"
        />
        <StatCard
          title={t("analytics.activeOrders")}
          value={String(stats.activeOrders)}
          sub={`${stats.totalOrders} commandes aujourd'hui`}
          icon={ShoppingBag}
          gradient="bg-gradient-to-br from-blue-500 to-blue-800"
        />
        <StatCard
          title={t("analytics.tablesOccupied")}
          value={`${stats.tablesOccupied} / ${stats.totalTables}`}
          sub={t("analytics.currentlyDining")}
          icon={Utensils}
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-700"
        />
        <StatCard
          title={t("inventory.lowStock")}
          value={String(stats.lowStockCount)}
          sub={t("inventory.lowStockNote")}
          icon={AlertCircle}
          gradient={stats.lowStockCount > 0
            ? "bg-gradient-to-br from-orange-500 to-red-600"
            : "bg-gradient-to-br from-slate-500 to-slate-700"}
        />
      </div>

      {/* ── Revenue Chart ──────────────────────────────────────────────────── */}
      <RevenueTrendCard />

      {/* ── Quick Actions + Today Summary ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <Card className="shadow-sm border-0 ring-1 ring-border/60 h-full">
            <CardHeader className="pb-4">
              <CardTitle className="font-serif text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                {t("analytics.quickActions")}
              </CardTitle>
              <CardDescription>{t("analytics.quickActionsSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    href: "/orders",
                    icon: ClipboardList,
                    label: t("orders.newOrder"),
                    isPrimary: true,
                    badge: stats.activeOrders > 0 ? String(stats.activeOrders) : undefined,
                  },
                  { href: "/tables",    icon: Utensils,      label: t("nav.tables"),    isPrimary: false },
                  { href: "/menu",      icon: UtensilsCrossed, label: t("nav.menu"),    isPrimary: false },
                  { href: "/inventory", icon: Package,        label: t("nav.inventory"), isPrimary: false,
                    badge: stats.lowStockCount > 0 ? String(stats.lowStockCount) : undefined },
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
              <CardTitle className="font-serif text-white text-base">{t("analytics.todaySummary")}</CardTitle>
              <CardDescription className="text-white/50 text-xs">Vue d'ensemble</CardDescription>
            </CardHeader>
            <CardContent className="relative space-y-4">
              {[
                { label: t("analytics.totalCustomers"), value: String(stats.totalCustomers) },
                { label: t("analytics.weekRevenue"),    value: formatDZD(stats.weekRevenue) },
                { label: t("analytics.monthRevenue"),   value: formatDZD(stats.monthRevenue) },
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
