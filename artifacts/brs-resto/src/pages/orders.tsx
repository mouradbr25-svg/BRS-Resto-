import { useState } from "react";
import { useListOrders, getListOrdersQueryKey, useUpdateOrderStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { formatDZD } from "@/lib/format";
import { Clock, User } from "lucide-react";

export default function Orders() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  const { data: orders, isLoading } = useListOrders(
    {}, 
    { query: { queryKey: getListOrdersQueryKey({}) } }
  );

  const updateStatus = useUpdateOrderStatus();

  const handleStatusChange = (orderId: number, newStatus: any) => {
    updateStatus.mutate(
      { id: orderId, data: { status: newStatus } },
      {
        onSuccess: (updatedOrder) => {
          queryClient.setQueryData(getListOrdersQueryKey({}), (old: any) => {
            if (!old) return old;
            return old.map((o: any) => o.id === orderId ? updatedOrder : o);
          });
        }
      }
    );
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'preparing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'served': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredOrders = orders?.filter(o => filterStatus === 'all' || o.status === filterStatus) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Live Orders</h1>
          <p className="text-muted-foreground mt-1">Manage current and past orders.</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="preparing">Preparing</SelectItem>
              <SelectItem value="served">Served</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Button>New Order</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map(order => (
            <Card key={order.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">Order #{order.id}</CardTitle>
                    <div className="flex items-center text-sm text-muted-foreground mt-1 gap-2">
                      <span className="flex items-center"><Clock className="h-3 w-3 mr-1"/> {new Date(order.createdAt).toLocaleTimeString()}</span>
                      {order.customerName && <span className="flex items-center"><User className="h-3 w-3 mr-1"/> {order.customerName}</span>}
                    </div>
                  </div>
                  <Badge variant="outline" className={getStatusColor(order.status)}>
                    {order.status.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="font-medium text-sm mb-2 pb-2 border-b">Table {order.tableNumber || 'Takeaway'}</div>
                <div className="space-y-2 text-sm">
                  {order.items?.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between">
                      <span>{item.quantity}x {item.menuItemName}</span>
                      <span className="text-muted-foreground">{formatDZD(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="pt-3 border-t bg-muted/20 flex-col gap-3 items-stretch">
                <div className="flex justify-between font-bold w-full">
                  <span>Total</span>
                  <span>{formatDZD(order.finalAmount || order.totalAmount)}</span>
                </div>
                {order.status !== 'completed' && order.status !== 'cancelled' && (
                  <Select 
                    value={order.status} 
                    onValueChange={(val) => handleStatusChange(order.id, val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="preparing">Preparing</SelectItem>
                      <SelectItem value="served">Served</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </CardFooter>
            </Card>
          ))}
          {filteredOrders.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              No orders found for the current filter.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
