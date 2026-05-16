import { useListTables, getListTablesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Users, Plus } from "lucide-react";

export default function Tables() {
  const { data: tables, isLoading } = useListTables(
    { query: { queryKey: getListTablesQueryKey() } }
  );

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'available': return 'bg-green-100 text-green-800 border-green-200';
      case 'occupied': return 'bg-red-100 text-red-800 border-red-200';
      case 'reserved': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Tables</h1>
          <p className="text-muted-foreground mt-1">Manage dining areas and table status.</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" /> Add Table</Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {tables?.map(table => (
            <Card key={table.id} className={`cursor-pointer hover:border-primary transition-colors ${table.status === 'occupied' ? 'border-red-200 bg-red-50/30' : ''}`}>
              <CardContent className="p-6 text-center space-y-3">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="font-bold text-xl text-primary">{table.number}</span>
                </div>
                <div className="flex items-center justify-center text-sm text-muted-foreground">
                  <Users className="h-4 w-4 mr-1" /> {table.capacity}
                </div>
                <Badge variant="outline" className={`w-full justify-center ${getStatusColor(table.status)}`}>
                  {table.status.toUpperCase()}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
