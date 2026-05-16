import { useListCategories, getListCategoriesQueryKey, useListMenuItems, getListMenuItemsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDZD } from "@/lib/format";
import { Plus } from "lucide-react";
import { useState } from "react";

export default function Menu() {
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  
  const { data: categories, isLoading: isLoadingCat } = useListCategories(
    { query: { queryKey: getListCategoriesQueryKey() } }
  );

  const { data: menuItems, isLoading: isLoadingMenu } = useListMenuItems(
    { categoryId: selectedCategory },
    { query: { queryKey: getListMenuItemsQueryKey({ categoryId: selectedCategory }) } }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Menu Items</h1>
          <p className="text-muted-foreground mt-1">Manage categories, dishes, and availability.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">New Category</Button>
          <Button><Plus className="h-4 w-4 mr-2" /> New Item</Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button 
          variant={selectedCategory === undefined ? "default" : "outline"}
          onClick={() => setSelectedCategory(undefined)}
          className="rounded-full"
        >
          All Categories
        </Button>
        {isLoadingCat ? (
          [1,2,3].map(i => <Skeleton key={i} className="h-10 w-24 rounded-full" />)
        ) : (
          categories?.map(cat => (
            <Button 
              key={cat.id}
              variant={selectedCategory === cat.id ? "default" : "outline"}
              onClick={() => setSelectedCategory(cat.id)}
              className="rounded-full"
            >
              {cat.name}
            </Button>
          ))
        )}
      </div>

      {isLoadingMenu ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {menuItems?.map(item => (
            <Card key={item.id} className="overflow-hidden flex flex-col">
              <div className="h-40 bg-muted relative">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">No image</div>
                )}
                {!item.available && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center font-bold text-destructive">
                    OUT OF STOCK
                  </div>
                )}
              </div>
              <CardContent className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-lg">{item.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                  </div>
                  <Badge variant="secondary">{item.categoryName}</Badge>
                </div>
                <div className="mt-auto pt-4 flex justify-between items-center font-medium">
                  <span className="text-primary">{formatDZD(item.price)}</span>
                  <span className="text-sm text-muted-foreground">{item.prepTimeMinutes} min prep</span>
                </div>
              </CardContent>
            </Card>
          ))}
          {menuItems?.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              No menu items found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
