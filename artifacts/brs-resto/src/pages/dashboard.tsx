import { useGetDashboardStats, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { formatDZD } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, TrendingUp, ShoppingBag, Users, Utensils } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useGetDashboardStats({ 
    query: { 
      queryKey: getGetDashboardStatsQueryKey()
    } 
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Welcome back, {user?.username}</h1>
        <p className="text-muted-foreground mt-1">Here is what's happening at your restaurant today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatDZD(stats.todayRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg order: {formatDZD(stats.avgOrderValue)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.activeOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Out of {stats.totalOrders} total today
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-secondary shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tables Occupied</CardTitle>
            <Utensils className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.tablesOccupied} / {stats.totalTables}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently dining
            </p>
          </CardContent>
        </Card>

        <Card className={`border-l-4 shadow-sm hover:shadow-md transition-shadow ${stats.lowStockCount > 0 ? 'border-l-destructive bg-destructive/5' : 'border-l-green-500'}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className={`text-sm font-medium ${stats.lowStockCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>Low Stock Alerts</CardTitle>
            <AlertCircle className={`h-4 w-4 ${stats.lowStockCount > 0 ? 'text-destructive' : 'text-green-500'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.lowStockCount > 0 ? 'text-destructive' : 'text-foreground'}`}>{stats.lowStockCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Ingredients below 50%
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="font-serif">Quick Actions</CardTitle>
            <CardDescription>Frequent tasks for the day</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {/* Quick links handled via wouter/layout */}
            <div className="p-4 rounded-lg bg-accent/30 border border-border flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-accent hover:border-primary/50 transition-all text-center">
              <ShoppingBag className="h-6 w-6 text-primary" />
              <span className="font-medium text-sm">New Order</span>
            </div>
            <div className="p-4 rounded-lg bg-accent/30 border border-border flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-accent hover:border-primary/50 transition-all text-center">
              <Utensils className="h-6 w-6 text-secondary" />
              <span className="font-medium text-sm">Manage Tables</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-primary text-primary-foreground overflow-hidden relative">
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <CardHeader>
            <CardTitle className="font-serif">Today's Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-white/20 pb-2">
                <span className="text-primary-foreground/80">Total Customers</span>
                <span className="font-bold text-xl">{stats.totalCustomers}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/20 pb-2">
                <span className="text-primary-foreground/80">Week Revenue</span>
                <span className="font-bold text-xl">{formatDZD(stats.weekRevenue)}</span>
              </div>
              <div className="flex justify-between items-center pb-2">
                <span className="text-primary-foreground/80">Month Revenue</span>
                <span className="font-bold text-xl">{formatDZD(stats.monthRevenue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
