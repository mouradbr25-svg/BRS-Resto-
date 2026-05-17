import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useListCategories, getListCategoriesQueryKey,
  useListMenuItems, getListMenuItemsQueryKey,
  useCreateCategory, useUpdateCategory, useDeleteCategory,
  useCreateMenuItem, useUpdateMenuItem, useDeleteMenuItem,
  useListIngredients, getListIngredientsQueryKey,
  useGetMenuItemIngredients, getGetMenuItemIngredientsQueryKey,
  useSetMenuItemIngredients,
} from "@workspace/api-client-react";
import type { Category, MenuItem } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatDZD } from "@/lib/format";
import { Plus, Pencil, Trash2, ChevronRight, Minus, Flame, Leaf, Wheat } from "lucide-react";

// ─── Dietary badge helpers ─────────────────────────────────────────────────────
function DietaryBadges({ item }: { item: Pick<MenuItem, "isSpicy" | "isVegan" | "isGlutenFree"> }) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-1 flex-wrap">
      {item.isSpicy && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
          <Flame className="h-2.5 w-2.5" />{t("dietary.spicy")}
        </span>
      )}
      {item.isVegan && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700">
          <Leaf className="h-2.5 w-2.5" />{t("dietary.vegan")}
        </span>
      )}
      {item.isGlutenFree && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
          <Wheat className="h-2.5 w-2.5" />{t("dietary.glutenFree")}
        </span>
      )}
    </div>
  );
}

// ─── Category Dialog ──────────────────────────────────────────────────────────
function CategoryDialog({ category, open, onClose }: { category?: Category; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const createCat = useCreateCategory();
  const updateCat = useUpdateCategory();
  const { register, handleSubmit, reset } = useForm({
    defaultValues: { name: category?.name ?? "", description: category?.description ?? "" },
  });

  const onSubmit = (values: { name: string; description: string }) => {
    if (category) {
      updateCat.mutate({ id: category.id, data: values }, {
        onSuccess: () => { qc.invalidateQueries({ queryKey: getListCategoriesQueryKey() }); toast({ title: "Category updated" }); onClose(); },
      });
    } else {
      createCat.mutate({ data: values }, {
        onSuccess: () => { qc.invalidateQueries({ queryKey: getListCategoriesQueryKey() }); toast({ title: "Category created" }); reset(); onClose(); },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? "Edit Category" : "New Category"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input data-testid="input-category-name" {...register("name", { required: true })} placeholder="e.g. Starters" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea data-testid="input-category-description" {...register("description")} placeholder="Short description" rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createCat.isPending || updateCat.isPending} data-testid="button-save-category">
              {category ? "Save Changes" : "Create Category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Ingredient Picker Row ────────────────────────────────────────────────────
function IngredientRow({ ingredientId, quantity, availableIngredients, onChange, onRemove }: {
  ingredientId: number | null; quantity: number;
  availableIngredients: { id: number; name: string; unit: string }[];
  onChange: (ingredientId: number, quantity: number) => void; onRemove: () => void;
}) {
  const selected = availableIngredients.find(i => i.id === ingredientId);
  return (
    <div className="flex items-center gap-2">
      <Select value={ingredientId != null ? String(ingredientId) : ""} onValueChange={val => onChange(parseInt(val, 10), quantity)}>
        <SelectTrigger className="flex-1 h-8 text-sm"><SelectValue placeholder="Select ingredient" /></SelectTrigger>
        <SelectContent>
          {availableIngredients.map(ing => (
            <SelectItem key={ing.id} value={String(ing.id)}>{ing.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="number" min="0.01" step="0.01" className="w-20 h-8 text-sm"
        value={quantity}
        onChange={e => { if (ingredientId != null) onChange(ingredientId, parseFloat(e.target.value) || 0); }}
      />
      {selected && <span className="text-xs text-muted-foreground w-8">{selected.unit}</span>}
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove}>
        <Minus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ─── Menu Item Dialog ─────────────────────────────────────────────────────────
function MenuItemDialog({ item, categories, open, onClose }: {
  item?: MenuItem; categories: Category[]; open: boolean; onClose: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const createItem = useCreateMenuItem();
  const updateItem = useUpdateMenuItem();
  const setIngredients = useSetMenuItemIngredients();

  const { data: existingIngredients } = useGetMenuItemIngredients(item?.id ?? 0, {
    query: { enabled: !!item, queryKey: getGetMenuItemIngredientsQueryKey(item?.id ?? 0) },
  });
  const { data: allIngredients } = useListIngredients({
    query: { queryKey: getListIngredientsQueryKey() },
  });

  const [ingredientRows, setIngredientRows] = useState<{ ingredientId: number | null; quantity: number }[]>(() =>
    existingIngredients?.map(e => ({ ingredientId: e.ingredientId, quantity: e.quantity })) ?? []
  );

  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      name: item?.name ?? "",
      nameAr: item?.nameAr ?? "",
      description: item?.description ?? "",
      price: item?.price ?? 0,
      categoryId: item?.categoryId ?? (categories[0]?.id ?? 0),
      available: item?.available ?? true,
      prepTimeMinutes: item?.prepTimeMinutes ?? 15,
      isSpicy: item?.isSpicy ?? false,
      isVegan: item?.isVegan ?? false,
      isGlutenFree: item?.isGlutenFree ?? false,
    },
  });

  const available = watch("available");
  const isSpicy = watch("isSpicy");
  const isVegan = watch("isVegan");
  const isGlutenFree = watch("isGlutenFree");

  const handleSave = handleSubmit(async values => {
    const payload = {
      ...values,
      price: parseFloat(String(values.price)),
      categoryId: parseInt(String(values.categoryId), 10),
      prepTimeMinutes: parseInt(String(values.prepTimeMinutes), 10),
    };
    const validRows = ingredientRows.filter(r => r.ingredientId != null && r.quantity > 0);

    const afterSave = (itemId: number) => {
      if (validRows.length >= 0) {
        setIngredients.mutate(
          { id: itemId, data: { ingredients: validRows.map(r => ({ ingredientId: r.ingredientId!, quantity: r.quantity })) } },
          { onSuccess: () => qc.invalidateQueries({ queryKey: getGetMenuItemIngredientsQueryKey(itemId) }) }
        );
      }
      qc.invalidateQueries({ queryKey: getListMenuItemsQueryKey({}) });
    };

    if (item) {
      updateItem.mutate({ id: item.id, data: payload }, {
        onSuccess: updated => { afterSave(updated.id); toast({ title: "Menu item updated" }); onClose(); },
      });
    } else {
      createItem.mutate({ data: payload }, {
        onSuccess: created => { afterSave(created.id); toast({ title: "Menu item created" }); onClose(); },
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Menu Item" : "New Menu Item"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("menu.nameFr")}</Label>
              <Input data-testid="input-item-name" {...register("name", { required: true })} placeholder="Couscous Royal" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("menu.nameAr")} <span className="text-muted-foreground text-xs">optional</span></Label>
              <Input data-testid="input-item-name-ar" {...register("nameAr")} placeholder="كسكس ملكي" dir="rtl" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("menu.description")}</Label>
            <Textarea data-testid="input-item-description" {...register("description")} rows={2} placeholder="Brief description..." />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Price (DZD)</Label>
              <Input data-testid="input-item-price" type="number" min="0" step="50" {...register("price", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("menu.category")}</Label>
              <Select defaultValue={String(item?.categoryId ?? categories[0]?.id ?? "")} onValueChange={val => setValue("categoryId", parseInt(val, 10))}>
                <SelectTrigger data-testid="select-item-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("menu.prepTime")}</Label>
              <Input data-testid="input-item-prep-time" type="number" min="1" {...register("prepTimeMinutes")} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={available} onCheckedChange={val => setValue("available", val)} data-testid="switch-item-available" />
            <Label>{t("menu.availableOnMenu")}</Label>
          </div>

          {/* Dietary Tags */}
          <div className="border rounded-lg p-3 space-y-2">
            <Label className="text-sm font-medium">{t("menu.dietaryTags")}</Label>
            <div className="flex flex-wrap gap-3">
              <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-md border text-sm transition-colors ${isSpicy ? "bg-red-50 border-red-300 text-red-700" : "hover:bg-muted"}`}>
                <input type="checkbox" className="sr-only" checked={isSpicy} onChange={e => setValue("isSpicy", e.target.checked)} />
                <Flame className="h-4 w-4" /> {t("dietary.spicy")}
              </label>
              <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-md border text-sm transition-colors ${isVegan ? "bg-green-50 border-green-300 text-green-700" : "hover:bg-muted"}`}>
                <input type="checkbox" className="sr-only" checked={isVegan} onChange={e => setValue("isVegan", e.target.checked)} />
                <Leaf className="h-4 w-4" /> {t("dietary.vegan")}
              </label>
              <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-md border text-sm transition-colors ${isGlutenFree ? "bg-amber-50 border-amber-300 text-amber-700" : "hover:bg-muted"}`}>
                <input type="checkbox" className="sr-only" checked={isGlutenFree} onChange={e => setValue("isGlutenFree", e.target.checked)} />
                <Wheat className="h-4 w-4" /> {t("dietary.glutenFree")}
              </label>
            </div>
          </div>

          {/* Ingredients */}
          <div className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{t("menu.ingredients")}</Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => setIngredientRows(r => [...r, { ingredientId: null, quantity: 1 }])} className="h-7 text-xs gap-1">
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
            {ingredientRows.length === 0 && (
              <p className="text-xs text-muted-foreground py-2 text-center">{t("menu.noIngredients")}</p>
            )}
            {ingredientRows.map((row, idx) => (
              <IngredientRow
                key={idx}
                ingredientId={row.ingredientId}
                quantity={row.quantity}
                availableIngredients={allIngredients?.map(i => ({ id: i.id, name: i.name, unit: i.unit })) ?? []}
                onChange={(ingId, qty) => setIngredientRows(r => r.map((x, i) => i === idx ? { ingredientId: ingId, quantity: qty } : x))}
                onRemove={() => setIngredientRows(r => r.filter((_, i) => i !== idx))}
              />
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={createItem.isPending || updateItem.isPending} data-testid="button-save-menu-item">
              {item ? t("common.save") : "Create Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Menu Page ───────────────────────────────────────────────────────────
type DietaryFilter = "all" | "spicy" | "vegan" | "glutenFree";

export default function Menu() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [dietaryFilter, setDietaryFilter] = useState<DietaryFilter>("all");
  const [catDialog, setCatDialog] = useState<{ open: boolean; item?: Category }>({ open: false });
  const [itemDialog, setItemDialog] = useState<{ open: boolean; item?: MenuItem }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<{ type: "category" | "item"; id: number; name: string } | null>(null);

  const { data: categories, isLoading: isLoadingCat } = useListCategories({ query: { queryKey: getListCategoriesQueryKey() } });
  const { data: menuItems, isLoading: isLoadingMenu } = useListMenuItems(
    { categoryId: selectedCategory },
    { query: { queryKey: getListMenuItemsQueryKey({ categoryId: selectedCategory }) } }
  );

  const deleteCat = useDeleteCategory();
  const deleteItem = useDeleteMenuItem();

  const filteredItems = (menuItems ?? []).filter(item => {
    if (dietaryFilter === "spicy") return item.isSpicy;
    if (dietaryFilter === "vegan") return item.isVegan;
    if (dietaryFilter === "glutenFree") return item.isGlutenFree;
    return true;
  });

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "category") {
      deleteCat.mutate({ id: deleteTarget.id }, {
        onSuccess: () => { qc.invalidateQueries({ queryKey: getListCategoriesQueryKey() }); toast({ title: "Category deleted" }); setDeleteTarget(null); },
      });
    } else {
      deleteItem.mutate({ id: deleteTarget.id }, {
        onSuccess: () => { qc.invalidateQueries({ queryKey: getListMenuItemsQueryKey({ categoryId: selectedCategory }) }); toast({ title: "Menu item deleted" }); setDeleteTarget(null); },
      });
    }
  };

  const dietaryOptions: { key: DietaryFilter; label: string; icon: React.ReactNode; activeClass: string }[] = [
    { key: "all", label: t("dietary.all"), icon: null, activeClass: "bg-primary text-primary-foreground border-primary" },
    { key: "spicy", label: t("dietary.spicy"), icon: <Flame className="h-3.5 w-3.5" />, activeClass: "bg-red-100 text-red-700 border-red-300" },
    { key: "vegan", label: t("dietary.vegan"), icon: <Leaf className="h-3.5 w-3.5" />, activeClass: "bg-green-100 text-green-700 border-green-300" },
    { key: "glutenFree", label: t("dietary.glutenFree"), icon: <Wheat className="h-3.5 w-3.5" />, activeClass: "bg-amber-100 text-amber-700 border-amber-300" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-serif font-bold">{t("menu.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("menu.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCatDialog({ open: true })} data-testid="button-new-category">
            <Plus className="h-4 w-4 mr-1.5" /> {t("menu.newCategory")}
          </Button>
          <Button onClick={() => setItemDialog({ open: true })} data-testid="button-new-menu-item">
            <Plus className="h-4 w-4 mr-1.5" /> {t("menu.newDish")}
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedCategory(undefined)}
          data-testid="tab-all-categories"
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            selectedCategory === undefined ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground/70 hover:border-primary"
          }`}
        >
          {t("common.all")}
        </button>
        {isLoadingCat
          ? [1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-24 rounded-full" />)
          : categories?.map(cat => (
              <div key={cat.id} className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedCategory(cat.id)}
                  data-testid={`tab-category-${cat.id}`}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    selectedCategory === cat.id ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground/70 hover:border-primary"
                  }`}
                >
                  {cat.name}
                </button>
                <button onClick={() => setCatDialog({ open: true, item: cat })} className="p-1 rounded hover:bg-muted text-muted-foreground" data-testid={`button-edit-category-${cat.id}`}>
                  <Pencil className="h-3 w-3" />
                </button>
                <button onClick={() => setDeleteTarget({ type: "category", id: cat.id, name: cat.name })} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive" data-testid={`button-delete-category-${cat.id}`}>
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
      </div>

      {/* Dietary Filter Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{t("dietary.filterLabel")}:</span>
        {dietaryOptions.map(opt => (
          <button
            key={opt.key}
            onClick={() => setDietaryFilter(opt.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              dietaryFilter === opt.key ? opt.activeClass : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}
      </div>

      {/* Menu Items Grid */}
      {isLoadingMenu ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredItems.map(item => (
            <Card
              key={item.id}
              className={`overflow-hidden flex flex-col group relative ${!item.available ? "opacity-60" : ""}`}
              data-testid={`card-menu-item-${item.id}`}
            >
              <div className="h-36 bg-muted/60 relative">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl text-muted-foreground/30 font-serif">
                    {item.name.charAt(0)}
                  </div>
                )}
                {!item.available && (
                  <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                    <Badge variant="destructive" className="text-xs">{t("common.unavailable")}</Badge>
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => setItemDialog({ open: true, item })} data-testid={`button-edit-item-${item.id}`}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => setDeleteTarget({ type: "item", id: item.id, name: item.name })} data-testid={`button-delete-item-${item.id}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-4 flex-1 flex flex-col gap-2">
                <div>
                  <h3 className="font-semibold text-sm leading-tight">{item.name}</h3>
                  {item.nameAr && <p className="text-xs text-muted-foreground" dir="rtl">{item.nameAr}</p>}
                  {item.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>}
                </div>
                <DietaryBadges item={item} />
                <div className="mt-auto flex items-center justify-between">
                  <span className="font-bold text-primary text-sm">{formatDZD(item.price)}</span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-xs px-1.5 py-0">{item.categoryName}</Badge>
                    <span className="text-xs text-muted-foreground">{item.prepTimeMinutes}m</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredItems.length === 0 && (
            <div className="col-span-full py-16 text-center text-muted-foreground border-2 border-dashed rounded-xl">
              <ChevronRight className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p>{t("common.noData")}</p>
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <CategoryDialog open={catDialog.open} category={catDialog.item} onClose={() => setCatDialog({ open: false })} />
      {categories && (
        <MenuItemDialog open={itemDialog.open} item={itemDialog.item} categories={categories} onClose={() => setItemDialog({ open: false })} />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === "category" ? "Category" : "Menu Item"}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground" data-testid="button-confirm-delete">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
