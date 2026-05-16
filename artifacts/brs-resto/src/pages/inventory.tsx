import { useListIngredients, getListIngredientsQueryKey, useRefillIngredients } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function Inventory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: ingredients, isLoading } = useListIngredients(
    { query: { queryKey: getListIngredientsQueryKey() } }
  );

  const refillMutation = useRefillIngredients();

  const handleRefill = () => {
    refillMutation.mutate(
      undefined,
      {
        onSuccess: (res) => {
          queryClient.invalidateQueries({ queryKey: getListIngredientsQueryKey() });
          toast({
            title: "Inventory Refilled",
            description: `Successfully refilled ${res.refilled} items to max stock.`,
          });
        }
      }
    );
  };

  const lowStockCount = ingredients?.filter(i => i.isLow).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground mt-1">Track ingredient levels and manage stock.</p>
        </div>
        <Button onClick={handleRefill} disabled={refillMutation.isPending}>
          <RotateCcw className={`h-4 w-4 mr-2 ${refillMutation.isPending ? 'animate-spin' : ''}`} />
          {refillMutation.isPending ? "Refilling..." : "Refill All Stock"}
        </Button>
      </div>

      {lowStockCount > 0 && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg flex items-center border border-destructive/20">
          <AlertCircle className="h-5 w-5 mr-3" />
          <span className="font-medium">{lowStockCount} items are running low. Consider refilling stock.</span>
        </div>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {ingredients?.map(item => (
                <div key={item.id} className="p-6 flex items-center gap-6">
                  <div className="w-1/3">
                    <h3 className="font-medium">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Last refilled: {item.lastRefillDate ? new Date(item.lastRefillDate).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className={item.isLow ? "text-destructive font-medium" : ""}>
                        {item.currentStock} {item.unit}
                      </span>
                      <span className="text-muted-foreground">
                        Max: {item.maxStock} {item.unit}
                      </span>
                    </div>
                    <Progress 
                      value={item.stockPercentage} 
                      className={`h-2 ${item.isLow ? '[&>div]:bg-destructive' : '[&>div]:bg-primary'}`}
                    />
                  </div>
                </div>
              ))}
              {ingredients?.length === 0 && (
                <div className="p-12 text-center text-muted-foreground">
                  No inventory items found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
