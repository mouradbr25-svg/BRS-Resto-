import { useListCustomers, getListCustomersQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDZD } from "@/lib/format";
import { User, Phone, Mail, Award } from "lucide-react";

export default function Customers() {
  const { data: customers, isLoading } = useListCustomers(
    { query: { queryKey: getListCustomersQueryKey() } }
  );

  const getTierColor = (tier: string | undefined) => {
    switch(tier) {
      case 'gold': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'silver': return 'bg-gray-200 text-gray-800 border-gray-300';
      case 'bronze': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Customers</h1>
          <p className="text-muted-foreground mt-1">Loyalty programs and customer details.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers?.map(customer => (
            <Card key={customer.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-bold">
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold">{customer.name}</h3>
                      {customer.loyaltyTier && (
                        <Badge variant="outline" className={`text-xs ${getTierColor(customer.loyaltyTier)}`}>
                          <Award className="w-3 h-3 mr-1" /> {customer.loyaltyTier.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center"><Phone className="h-4 w-4 mr-2" /> {customer.phone}</div>
                  {customer.email && <div className="flex items-center"><Mail className="h-4 w-4 mr-2" /> {customer.email}</div>}
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">Orders</div>
                    <div className="font-bold">{customer.totalOrders}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">Total Spent</div>
                    <div className="font-bold text-primary">{formatDZD(customer.totalSpent)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {customers?.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              No customers found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
