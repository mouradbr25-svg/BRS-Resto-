import { useState } from "react";
import {
  useListMenuItems, getListMenuItemsQueryKey,
  useListCategories, getListCategoriesQueryKey,
  useUpdateMenuItem, useCreateMenuItem, useDeleteMenuItem,
  useChangePassword,
} from "@workspace/api-client-react";
import type { MenuItem } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { formatDZD } from "@/lib/format";
import {
  DollarSign, Lock, Pencil, Check, X, Plus, Trash2, ChefHat,
  ImageIcon, Flame, Leaf, Wheat,
} from "lucide-react";

// ─── Inline price editor row ──────────────────────────────────────────────────
function PriceRow({ item }: { item: MenuItem }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const updateItem = useUpdateMenuItem();
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(String(item.price));

  const handleSave = () => {
    const parsed = parseFloat(price);
    if (isNaN(parsed) || parsed < 0) return;
    updateItem.mutate(
      { id: item.id, data: { price: parsed } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListMenuItemsQueryKey({}) });
          toast({ title: `${item.name} → ${formatDZD(parsed)}` });
          setEditing(false);
        },
      }
    );
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 group hover:bg-muted/30 transition-colors">
      <div className="flex-1 min-w-0">
        {item.imageUrl && (
          <img src={item.imageUrl} alt={item.name} className="w-8 h-8 rounded-md object-cover float-left me-2.5 mb-0.5" />
        )}
        <p className="text-sm font-medium truncate">{item.name}</p>
        {item.nameAr && <p className="text-xs text-muted-foreground" dir="rtl">{item.nameAr}</p>}
        <Badge variant="outline" className="text-xs mt-0.5 px-1.5 py-0">{item.categoryName}</Badge>
      </div>
      <div className="flex items-center gap-2 ms-3">
        {editing ? (
          <>
            <Input type="number" min="0" step="50" className="w-28 h-8 text-sm" value={price}
              onChange={e => setPrice(e.target.value)} autoFocus
              onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
            />
            <span className="text-xs text-muted-foreground">DZD</span>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={handleSave} disabled={updateItem.isPending}>
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(false); setPrice(String(item.price)); }}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <>
            <span className="font-bold text-sm text-primary">{formatDZD(item.price)}</span>
            <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function PricesTab() {
  const { data: menuItems, isLoading } = useListMenuItems({}, { query: { queryKey: getListMenuItemsQueryKey({}) } });
  const [search, setSearch] = useState("");
  const filtered = menuItems?.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.categoryName ?? "").toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input placeholder="Rechercher un plat..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs h-9" />
        <p className="text-sm text-muted-foreground">{filtered.length} articles</p>
      </div>
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
          ) : (
            <div className="divide-y">
              {filtered.map(item => <PriceRow key={item.id} item={item} />)}
              {filtered.length === 0 && <p className="p-8 text-center text-muted-foreground text-sm">Aucun résultat.</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Menu Management Tab ───────────────────────────────────────────────────────
type MenuItemFormValues = {
  name: string; nameAr: string; description: string;
  price: number; categoryId: number; imageUrl: string;
  prepTimeMinutes: number; available: boolean;
  isSpicy: boolean; isVegan: boolean; isGlutenFree: boolean;
};

function MenuItemDialog({ item, onClose }: { item?: MenuItem; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: categories } = useListCategories({ query: { queryKey: getListCategoriesQueryKey() } });
  const createItem = useCreateMenuItem();
  const updateItem = useUpdateMenuItem();

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<MenuItemFormValues>({
    defaultValues: {
      name: item?.name ?? "",
      nameAr: item?.nameAr ?? "",
      description: item?.description ?? "",
      price: item?.price ?? 0,
      categoryId: item?.categoryId ?? (categories?.[0]?.id ?? 0),
      imageUrl: item?.imageUrl ?? "",
      prepTimeMinutes: item?.prepTimeMinutes ?? 15,
      available: item?.available ?? true,
      isSpicy: item?.isSpicy ?? false,
      isVegan: item?.isVegan ?? false,
      isGlutenFree: item?.isGlutenFree ?? false,
    },
  });

  const imageUrl = watch("imageUrl");

  const onSubmit = (values: MenuItemFormValues) => {
    const data = {
      name: values.name,
      nameAr: values.nameAr || undefined,
      description: values.description || undefined,
      price: Number(values.price),
      categoryId: Number(values.categoryId),
      imageUrl: values.imageUrl || undefined,
      prepTimeMinutes: Number(values.prepTimeMinutes),
      available: values.available,
      isSpicy: values.isSpicy,
      isVegan: values.isVegan,
      isGlutenFree: values.isGlutenFree,
    };

    if (item) {
      updateItem.mutate({ id: item.id, data }, {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListMenuItemsQueryKey({}) });
          toast({ title: `${values.name} mis à jour` });
          onClose();
        },
        onError: () => toast({ title: "Erreur lors de la mise à jour", variant: "destructive" }),
      });
    } else {
      createItem.mutate({ data }, {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListMenuItemsQueryKey({}) });
          toast({ title: `${values.name} ajouté au menu` });
          onClose();
        },
        onError: () => toast({ title: "Erreur lors de l'ajout", variant: "destructive" }),
      });
    }
  };

  const isPending = createItem.isPending || updateItem.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Nom (FR) *</Label>
          <Input {...register("name", { required: true })} placeholder="Couscous Royal" className={errors.name ? "border-destructive" : ""} />
        </div>
        <div className="space-y-1.5">
          <Label>Nom (AR)</Label>
          <Input {...register("nameAr")} placeholder="كسكس رويال" dir="rtl" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Description</Label>
        <Input {...register("description")} placeholder="Description du plat..." />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>Prix (DZD) *</Label>
          <Input type="number" min="0" step="50" {...register("price", { required: true, min: 0 })} placeholder="1200" />
        </div>
        <div className="space-y-1.5">
          <Label>Catégorie *</Label>
          <select {...register("categoryId", { required: true })} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
            {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Prép. (min)</Label>
          <Input type="number" min="1" max="120" {...register("prepTimeMinutes")} placeholder="15" />
        </div>
      </div>

      {/* Image URL */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5"><ImageIcon className="h-3.5 w-3.5" /> URL de l'image</Label>
        <Input {...register("imageUrl")} placeholder="https://example.com/image.jpg" />
        {imageUrl && (
          <div className="relative h-28 rounded-lg overflow-hidden bg-muted border">
            <img src={imageUrl} alt="Aperçu" className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50 text-xs text-muted-foreground [&:has(+img)]:hidden" />
          </div>
        )}
      </div>

      {/* Toggles */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <Label className="text-sm">Disponible</Label>
          <Switch checked={watch("available")} onCheckedChange={v => setValue("available", v)} />
        </div>
        <div className="flex items-center gap-4 p-3 border rounded-lg">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" {...register("isSpicy")} className="sr-only" />
            <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border cursor-pointer transition-colors ${watch("isSpicy") ? "bg-red-100 border-red-300 text-red-700" : "bg-muted text-muted-foreground"}`}
              onClick={() => setValue("isSpicy", !watch("isSpicy"))}>
              <Flame className="h-3 w-3" /> Épicé
            </div>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border cursor-pointer transition-colors ${watch("isVegan") ? "bg-green-100 border-green-300 text-green-700" : "bg-muted text-muted-foreground"}`}
              onClick={() => setValue("isVegan", !watch("isVegan"))}>
              <Leaf className="h-3 w-3" /> Végane
            </div>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border cursor-pointer transition-colors ${watch("isGlutenFree") ? "bg-amber-100 border-amber-300 text-amber-700" : "bg-muted text-muted-foreground"}`}
              onClick={() => setValue("isGlutenFree", !watch("isGlutenFree"))}>
              <Wheat className="h-3 w-3" /> Sans gluten
            </div>
          </label>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Enregistrement..." : item ? "Mettre à jour" : "Ajouter au menu"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function MenuCard({ item }: { item: MenuItem }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const updateItem = useUpdateMenuItem();
  const deleteItem = useDeleteMenuItem();
  const [editOpen, setEditOpen] = useState(false);

  const toggleAvail = () => {
    updateItem.mutate({ id: item.id, data: { available: !item.available } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListMenuItemsQueryKey({}) });
        toast({ title: `${item.name} ${!item.available ? "activé" : "désactivé"}` });
      },
    });
  };

  const handleDelete = () => {
    if (!confirm(`Supprimer "${item.name}" ?`)) return;
    deleteItem.mutate({ id: item.id }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListMenuItemsQueryKey({}) });
        toast({ title: `${item.name} supprimé` });
      },
      onError: () => toast({ title: "Impossible de supprimer", variant: "destructive" }),
    });
  };

  return (
    <div className={`bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow ${!item.available ? "opacity-60" : ""}`}>
      {item.imageUrl ? (
        <div className="h-36 bg-muted overflow-hidden relative">
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
          {!item.available && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <Badge variant="secondary" className="text-xs">Indisponible</Badge>
            </div>
          )}
        </div>
      ) : (
        <div className="h-24 bg-muted/50 flex items-center justify-center">
          <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-start justify-between gap-1 mb-1">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{item.name}</p>
            {item.nameAr && <p className="text-xs text-muted-foreground" dir="rtl">{item.nameAr}</p>}
          </div>
          <div className="flex gap-0.5 flex-shrink-0">
            {item.isSpicy && <Flame className="h-3 w-3 text-red-500" />}
            {item.isVegan && <Leaf className="h-3 w-3 text-green-500" />}
            {item.isGlutenFree && <Wheat className="h-3 w-3 text-amber-500" />}
          </div>
        </div>
        <p className="font-bold text-primary text-sm mb-2">{formatDZD(item.price)}</p>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 mb-3">{item.categoryName}</Badge>

        <div className="flex items-center gap-1.5 pt-2 border-t">
          <button onClick={toggleAvail} className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${item.available ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
            {item.available ? "Disponible" : "Indisponible"}
          </button>
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <button className="p-1.5 rounded-md hover:bg-accent transition-colors" title="Modifier">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Modifier — {item.name}</DialogTitle></DialogHeader>
              <MenuItemDialog item={item} onClose={() => setEditOpen(false)} />
            </DialogContent>
          </Dialog>
          <button onClick={handleDelete} className="p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors" title="Supprimer">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MenuManagementTab() {
  const { data: menuItems, isLoading } = useListMenuItems({}, { query: { queryKey: getListMenuItemsQueryKey({}) } });
  const { data: categories } = useListCategories({ query: { queryKey: getListCategoriesQueryKey() } });
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const filtered = (menuItems ?? []).filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCat === null || m.categoryId === selectedCat;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs h-9" />
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCat(null)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${selectedCat === null ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
          >
            Tous
          </button>
          {categories?.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCat(c.id)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${selectedCat === c.id ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className="ms-auto">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Nouveau plat
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Ajouter un plat</DialogTitle></DialogHeader>
              <MenuItemDialog onClose={() => setAddOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} article{filtered.length !== 1 ? "s" : ""}</p>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-56 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ChefHat className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p>Aucun article trouvé.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(item => <MenuCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}

// ─── Credentials Tab ───────────────────────────────────────────────────────────
function CredentialCard({ userId, username, role }: { userId: number; username: string; role: string }) {
  const { toast } = useToast();
  const changePwd = useChangePassword();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ newPassword: string; confirm: string }>();

  const onSubmit = (values: { newPassword: string; confirm: string }) => {
    if (values.newPassword !== values.confirm) { toast({ title: "Les mots de passe ne correspondent pas", variant: "destructive" }); return; }
    if (values.newPassword.length < 6) { toast({ title: "Minimum 6 caractères", variant: "destructive" }); return; }
    changePwd.mutate({ data: { userId, newPassword: values.newPassword } }, {
      onSuccess: () => { toast({ title: `Mot de passe mis à jour — ${username}` }); reset(); },
      onError: () => toast({ title: "Erreur", variant: "destructive" }),
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">{username}</CardTitle>
          <Badge variant="outline" className="capitalize">{role}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nouveau mot de passe</Label>
              <Input type="password" {...register("newPassword", { required: true, minLength: 6 })} placeholder="Min. 6 caractères" className="h-9" data-testid={`input-password-${username}`} />
            </div>
            <div className="space-y-1.5">
              <Label>Confirmer</Label>
              <Input type="password" {...register("confirm", { required: true })} placeholder="Répéter" className="h-9" />
            </div>
          </div>
          <Button type="submit" size="sm" disabled={changePwd.isPending} data-testid={`button-change-password-${username}`}>
            <Lock className="h-3.5 w-3.5 me-1.5" />
            {changePwd.isPending ? "Mise à jour..." : "Changer le mot de passe"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function CredentialsTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Modifiez les mots de passe des comptes du personnel.</p>
      {[
        { userId: 1, username: "owner", role: "owner" },
        { userId: 2, username: "receptionist", role: "receptionist" },
      ].map(acc => <CredentialCard key={acc.userId} {...acc} />)}
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Paramètres</h1>
        <p className="text-muted-foreground mt-1">Configuration globale — menu, prix et accès.</p>
      </div>

      <Tabs defaultValue="menu">
        <TabsList className="mb-4">
          <TabsTrigger value="menu">
            <ChefHat className="h-4 w-4 me-2" /> Gestion du menu
          </TabsTrigger>
          <TabsTrigger value="prices">
            <DollarSign className="h-4 w-4 me-2" /> Prix rapide
          </TabsTrigger>
          <TabsTrigger value="credentials">
            <Lock className="h-4 w-4 me-2" /> Identifiants
          </TabsTrigger>
        </TabsList>

        <TabsContent value="menu">
          <MenuManagementTab />
        </TabsContent>
        <TabsContent value="prices">
          <PricesTab />
        </TabsContent>
        <TabsContent value="credentials">
          <CredentialsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
