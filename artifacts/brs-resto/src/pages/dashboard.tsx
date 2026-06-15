import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import {
  useGetDashboardStats, getGetDashboardStatsQueryKey,
  useGetRevenueStats, getGetRevenueStatsQueryKey,
} from "@workspace/api-client-react";
import { formatDZD } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  AlertCircle, TrendingUp, ShoppingBag, Users, Utensils,
  ClipboardList, BarChart3,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Revenue chart tooltip ────────────────────────────────────────────────────
function RevTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold mb-1">{label}</p>
      <p className="text-primary font-bold">{formatDZD(payload[0]?.value ?? 0)}</p>
      <p className="text-muted-foreground">{payload[1]?.value ?? 0} orders</p>
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
    { key: "day", label: t("analytics.today") },
    { key: "week", label: t("analytics.week") },
    { key: "month", label: t("analytics.month") },
  ];

  return (
    <Card className="shadow-sm col-span-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="font-serif flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              {t("analytics.revenueTrend")}
            </CardTitle>
            <CardDescription>
              {t("common.total")}: <span className="text-primary font-semibold">{formatDZD(total)}</span>
            </CardDescription>
          </div>
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {periods.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  period === p.key
                    ? "bg-background shadow-sm text-foreground"
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
          <Skeleton className="h-48 w-full" />
        ) : !hasData ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed rounded-lg">
            No revenue data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={points} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(12, 76%, 50%)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(12, 76%, 50%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(200, 40%, 40%)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(200, 40%, 40%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,15%,88%)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "hsl(30,10%,40%)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(30,10%,40%)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v =>
                  v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)
                }
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
                name="Revenue"
              />
              <Area
                type="monotone"
                dataKey="orders"
                stroke="hsl(200, 40%, 40%)"
                strokeWidth={1.5}
                fill="url(#ordGrad)"
                dot={false}
                name="Orders"
                yAxisId={undefined}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
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
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 mb-2" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      title: t("analytics.todayRevenue"),
      value: formatDZD(stats.todayRevenue),
      sub: `Avg: ${formatDZD(stats.avgOrderValue)}`,
      icon: TrendingUp,
      color: "text-primary",
      border: "border-s-4 border-s-primary",
    },
    {
      title: t("analytics.activeOrders"),
      value: String(stats.activeOrders),
      sub: `${stats.totalOrders} total today`,
      icon: ShoppingBag,
      color: "text-blue-500",
      border: "border-s-4 border-s-blue-500",
    },
    {
      title: t("analytics.tablesOccupied"),
      value: `${stats.tablesOccupied} / ${stats.totalTables}`,
      sub: t("analytics.currentlyDining"),
      icon: Utensils,
      color: "text-secondary",
      border: "border-s-4 border-s-secondary",
    },
    {
      title: t("inventory.lowStock"),
      value: String(stats.lowStockCount),
      sub: t("inventory.lowStockNote"),
      icon: AlertCircle,
      color: stats.lowStockCount > 0 ? "text-destructive" : "text-green-500",
      border: stats.lowStockCount > 0
        ? "border-s-4 border-s-destructive bg-destructive/5"
        : "border-s-4 border-s-green-500",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">
          {t("analytics.welcomeBack")}, {user?.username}
        </h1>
        <p className="text-muted-foreground mt-1">{t("analytics.dashboardSubtitle")}</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map(card => (
          <Card key={card.title} className={`shadow-sm hover:shadow-md transition-shadow ${card.border}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${card.color === "text-destructive" && stats.lowStockCount > 0 ? "text-destructive" : "text-foreground"}`}>
                {card.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue trend chart */}
      <RevenueTrendCard />

      {/* Quick actions + today summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="font-serif">{t("analytics.quickActions")}</CardTitle>
            <CardDescription>{t("analytics.quickActionsSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Link href="/orders">
              <div className="p-4 rounded-lg bg-primary text-primary-foreground flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-primary/90 active:scale-95 transition-all text-center shadow-md ring-2 ring-primary/20">
                <ClipboardList className="h-6 w-6" />
                <span className="font-semibold text-sm">{t("orders.newOrder")}</span>
              </div>
            </Link>
            <Link href="/tables">
              <div className="p-4 rounded-lg bg-accent/50 border-2 border-border flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-accent hover:border-primary/40 active:scale-95 transition-all text-center">
                <Utensils className="h-6 w-6 text-secondary" />
                <span className="font-medium text-sm">{t("nav.tables")}</span>
              </div>
            </Link>
            <Link href="/menu">
              <div className="p-4 rounded-lg bg-accent/50 border-2 border-border flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-accent hover:border-primary/40 active:scale-95 transition-all text-center">
                <ShoppingBag className="h-6 w-6 text-primary" />
                <span className="font-medium text-sm">{t("nav.menu")}</span>
              </div>
            </Link>
            <Link href="/analytics">
              <div className="p-4 rounded-lg bg-accent/50 border-2 border-border flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-accent hover:border-primary/40 active:scale-95 transition-all text-center">
                <BarChart3 className="h-6 w-6 text-chart-4" />
                <span className="font-medium text-sm">{t("nav.analytics")}</span>
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-primary text-primary-foreground overflow-hidden relative">
          <div className="absolute end-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 rtl:-translate-x-1/3" />
          <CardHeader>
            <CardTitle className="font-serif">{t("analytics.todaySummary")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-white/20 pb-2">
                <span className="text-primary-foreground/80">{t("analytics.totalCustomers")}</span>
                <span className="font-bold text-xl">{stats.totalCustomers}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/20 pb-2">
                <span className="text-primary-foreground/80">{t("analytics.weekRevenue")}</span>
                <span className="font-bold text-xl">{formatDZD(stats.weekRevenue)}</span>
              </div>
              <div className="flex justify-between items-center pb-2">
                <span className="text-primary-foreground/80">{t("analytics.monthRevenue")}</span>
                <span className="font-bold text-xl">{formatDZD(stats.monthRevenue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
