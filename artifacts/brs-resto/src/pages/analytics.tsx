import { useGetRevenueStats, getGetRevenueStatsQueryKey, useGetTopMenuItems, getGetTopMenuItemsQueryKey, useGetOrdersByStatus, getGetOrdersByStatusQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDZD } from "@/lib/format";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

export default function Analytics() {
  const { data: revenueData, isLoading: isLoadingRev } = useGetRevenueStats(
    { period: 'week' },
    { query: { queryKey: getGetRevenueStatsQueryKey({ period: 'week' }) } }
  );

  const { data: topItems, isLoading: isLoadingTop } = useGetTopMenuItems(
    { query: { queryKey: getGetTopMenuItemsQueryKey() } }
  );

  const { data: statusData, isLoading: isLoadingStatus } = useGetOrdersByStatus(
    { query: { queryKey: getGetOrdersByStatusQueryKey() } }
  );

  const COLORS = ['#e65100', '#2e7d32', '#0277bd', '#f57c00', '#c62828'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">Deep dive into restaurant performance.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1 lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle>Revenue (Last 7 Days)</CardTitle>
            <CardDescription>Daily revenue breakdown in DZD</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {isLoadingRev ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData || []} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                  <RechartsTooltip 
                    formatter={(value: number) => [formatDZD(value), "Revenue"]}
                    cursor={{fill: '#f3f4f6'}}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Top Menu Items</CardTitle>
            <CardDescription>Best sellers by volume</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingTop ? (
              <div className="space-y-4">
                {[1,2,3,4].map(i => <Skeleton key={i} className="w-full h-12" />)}
              </div>
            ) : (
              <div className="space-y-4">
                {topItems?.map((item, i) => (
                  <div key={item.menuItemId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-sm text-muted-foreground">
                        {i + 1}
                      </div>
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{item.totalOrdered} ordered</div>
                      <div className="text-xs text-muted-foreground">{formatDZD(item.totalRevenue)}</div>
                    </div>
                  </div>
                ))}
                {(!topItems || topItems.length === 0) && (
                  <div className="text-center text-muted-foreground py-8">No data available</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Orders by Status</CardTitle>
            <CardDescription>Current distribution of all orders</CardDescription>
          </CardHeader>
          <CardContent className="h-80 flex flex-col justify-center">
            {isLoadingStatus ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="status"
                    label={({status, percent}) => `${status} ${(percent * 100).toFixed(0)}%`}
                  >
                    {(statusData || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: number) => [value, "Orders"]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
