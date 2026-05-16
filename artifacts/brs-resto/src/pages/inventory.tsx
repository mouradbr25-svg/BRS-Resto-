import { useState } from "react";
import {
  useListIngredients, getListIngredientsQueryKey,
  useRefillIngredients,
  useCreateIngredient, useUpdateIngredient, useDeleteIngredient,
} from "@workspace/api-client-react";
import type { Ingredient } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, RotateCcw, Plus, Pencil, Trash2, Calendar } from "lucide-react";

// ─── Ingredient Form Dialog ───────────────────────────────────────────────────
function IngredientDialog({
  ingredient,
  open,
  onClose,
}: {
  ingredient?: Ingredient;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const createIng = useCreateIngredient();
  const updateIng = useUpdateIngredient();

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      name: ingredient?.name ?? "",
      currentStock: ingredient?.currentStock ?? 0,
      maxStock: ingredient?.maxStock ?? 0,
      unit: ingredient?.unit ?? "",
    },
  });

  const onSubmit = (values: { name: string; currentStock: number; maxStock: number; unit: string }) => {
    const payload = {
      ...values,
      currentStock: parseFloat(String(values.currentStock)),
      maxStock: parseFloat(String(values.maxStock)),
    };

    if (ingredient) {
      updateIng.mutate(
        { id: ingredient.id, data: payload },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getListIngredientsQueryKey() });
            toast({ title: "Ingredient updated" });
            onClose();
          },
        }
      );
    } else {
      createIng.mutate(
        { data: payload },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getListIngredientsQueryKey() });
            toast({ title: "Ingredient added" });
            reset();
            onClose();
          },
        }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{ingredient ? "Edit Ingredient" : "Add Ingredient"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              data-testid="input-ingredient-name"
              {...register("name", { required: true })}
              placeholder="e.g. Tomatoes"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Current Stock</Label>
              <Input
                data-testid="input-ingredient-current"
                type="number"
                min="0"
                step="0.1"
                {...register("currentStock", { required: true })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Max Stock</Label>
              <Input
                data-testid="input-ingredient-max"
                type="number"
                min="0"
                step="0.1"
                {...register("maxStock", { required: true })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Unit</Label>
            <Input
              data-testid="input-ingredient-unit"
              {...register("unit", { required: true })}
              placeholder="kg, L, pièces..."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              disabled={createIng.isPending || updateIng.isPending}
              data-testid="button-save-ingredient"
            >
              {ingredient ? "Save Changes" : "Add Ingredient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Stock Adjust Dialog ──────────────────────────────────────────────────────
function StockAdjustDialog({
  ingredient,
  open,
  onClose,
}: {
  ingredient: Ingredient | null;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const updateIng = useUpdateIngredient();
  const { register, handleSubmit } = useForm({
    values: { currentStock: ingredient?.currentStock ?? 0 },
  });

  const onSubmit = (values: { currentStock: number }) => {
    if (!ingredient) return;
    updateIng.mutate(
      { id: ingredient.id, data: { currentStock: parseFloat(String(values.currentStock)) } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListIngredientsQueryKey() });
          toast({ title: `Stock updated for ${ingredient.name}` });
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Adjust Stock — {ingredient?.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>New Current Stock ({ingredient?.unit})</Label>
            <Input
              data-testid="input-adjust-stock"
              type="number"
              min="0"
              step="0.1"
              max={ingredient?.maxStock}
              {...register("currentStock", { required: true })}
            />
            <p className="text-xs text-muted-foreground">Max: {ingredient?.maxStock} {ingredient?.unit}</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={updateIng.isPending} data-testid="button-save-stock">
              Update Stock
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Inventory Page ──────────────────────────────────────────────────────
export default function Inventory() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [ingDialog, setIngDialog] = useState<{ open: boolean; item?: Ingredient }>({ open: false });
  const [adjustDialog, setAdjustDialog] = useState<{ open: boolean; item: Ingredient | null }>({ open: false, item: null });
  const [deleteTarget, setDeleteTarget] = useState<Ingredient | null>(null);

  const { data: ingredients, isLoading } = useListIngredients({
    query: { queryKey: getListIngredientsQueryKey() },
  });
  const refillMutation = useRefillIngredients();
  const deleteIng = useDeleteIngredient();

  const today = new Date().getDay(); // 0=Sun, 6=Sat
  const isSaturday = today === 6;

  const lowStockCount = ingredients?.filter(i => i.isLow).length ?? 0;

  const handleRefill = () => {
    refillMutation.mutate(undefined, {
      onSuccess: res => {
        qc.invalidateQueries({ queryKey: getListIngredientsQueryKey() });
        toast({ title: "Inventory Refilled", description: `${res.refilled} items restored to max stock.` });
      },
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteIng.mutate(
      { id: deleteTarget.id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListIngredientsQueryKey() });
          toast({ title: "Ingredient removed" });
          setDeleteTarget(null);
        },
      }
    );
  };

  const stockColor = (pct: number) => {
    if (pct <= 25) return "[&>div]:bg-destructive";
    if (pct <= 50) return "[&>div]:bg-orange-500";
    return "[&>div]:bg-primary";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground mt-1">Track ingredient levels. Deducted automatically when orders are accepted.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIngDialog({ open: true })}
            data-testid="button-add-ingredient"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add Ingredient
          </Button>
          <div className="relative group">
            <Button
              onClick={handleRefill}
              disabled={refillMutation.isPending || !isSaturday}
              data-testid="button-refill-all"
              className={isSaturday ? "" : "opacity-60"}
            >
              <RotateCcw className={`h-4 w-4 mr-1.5 ${refillMutation.isPending ? "animate-spin" : ""}`} />
              {refillMutation.isPending ? "Refilling..." : "Refill All Stock"}
            </Button>
            {!isSaturday && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-max bg-popover border rounded-md px-3 py-1.5 text-xs shadow-md hidden group-hover:block z-10">
                <Calendar className="h-3 w-3 inline mr-1" />
                Restock is only available on Saturdays
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Items</p>
            <p className="text-2xl font-bold mt-1">{ingredients?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card className={lowStockCount > 0 ? "border-orange-300 bg-orange-50/30" : ""}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Low Stock</p>
            <p className={`text-2xl font-bold mt-1 ${lowStockCount > 0 ? "text-orange-600" : ""}`}>{lowStockCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Saturday Restock</p>
              <Badge
                variant={isSaturday ? "default" : "secondary"}
                className="mt-1"
              >
                {isSaturday ? "Available Today" : "Not Available"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {lowStockCount > 0 && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg flex items-center border border-destructive/20">
          <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
          <span className="font-medium">{lowStockCount} ingredient{lowStockCount > 1 ? "s are" : " is"} below 50% — consider restocking.</span>
        </div>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full" />)}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3 pt-4 px-6">
            <CardTitle className="text-base font-semibold text-muted-foreground">Ingredient Stock Levels</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {ingredients?.map(item => (
                <div
                  key={item.id}
                  className={`px-6 py-4 flex items-center gap-4 group ${item.isLow ? "bg-orange-50/40" : ""}`}
                  data-testid={`row-ingredient-${item.id}`}
                >
                  <div className="w-48 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm">{item.name}</h3>
                      {item.isLow && (
                        <Badge variant="destructive" className="text-xs px-1.5 py-0">Low</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.lastRefillDate
                        ? `Refilled ${new Date(item.lastRefillDate).toLocaleDateString("en-DZ")}`
                        : "Never refilled"}
                    </p>
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className={item.isLow ? "text-destructive font-semibold" : "text-foreground"}>
                        {item.currentStock} {item.unit}
                      </span>
                      <span className="text-muted-foreground">
                        {item.stockPercentage}% of {item.maxStock} {item.unit}
                      </span>
                    </div>
                    <Progress
                      value={item.stockPercentage}
                      className={`h-2 ${stockColor(item.stockPercentage ?? 0)}`}
                    />
                  </div>

                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setAdjustDialog({ open: true, item })}
                      data-testid={`button-adjust-stock-${item.id}`}
                    >
                      Adjust
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setIngDialog({ open: true, item })}
                      data-testid={`button-edit-ingredient-${item.id}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 hover:text-destructive"
                      onClick={() => setDeleteTarget(item)}
                      data-testid={`button-delete-ingredient-${item.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              {ingredients?.length === 0 && (
                <div className="p-12 text-center text-muted-foreground">
                  No inventory items. Add ingredients to track stock levels.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <IngredientDialog
        open={ingDialog.open}
        ingredient={ingDialog.item}
        onClose={() => setIngDialog({ open: false })}
      />
      <StockAdjustDialog
        open={adjustDialog.open}
        ingredient={adjustDialog.item}
        onClose={() => setAdjustDialog({ open: false, item: null })}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Ingredient</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{deleteTarget?.name}</strong> from inventory? This will also unlink it from any menu items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-ingredient"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
