import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  useListOrders, getListOrdersQueryKey,
  useUpdateOrderStatus,
  useTransferOrder,
  useListTables, getListTablesQueryKey,
  useListMenuItems, getListMenuItemsQueryKey,
  useCreateOrder,
} from "@workspace/api-client-react";
import type { Order } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { formatDZD } from "@/lib/format";
import {
  Clock, User, ChevronDown, ChevronUp, ArrowRightLeft,
  Plus, Minus, Timer, Flame, Leaf, Wheat,
  ShoppingBag, UserPlus, Search, CreditCard,
  ChefHat, UtensilsCrossed, Banknote,
} from "lucide-react";

// ─── Status config ────────────────────────────────────────────────────────────
const SC: Record<string, { label: string; cls: string }> = {
  pending:   { label: "En attente",       cls: "bg-amber-100 text-amber-800 border-amber-200" },
  preparing: { label: "En préparation",   cls: "bg-blue-100 text-blue-800 border-blue-200" },
  served:    { label: "Servi",            cls: "bg-violet-100 text-violet-800 border-violet-200" },
  unpaid:    { label: "Non payé",         cls: "bg-orange-100 text-orange-800 border-orange-200" },
  completed: { label: "Payé",             cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  cancelled: { label: "Annulé",           cls: "bg-rose-100 text-rose-800 border-rose-200" },
};

function getNextStatus(isWalkin: boolean, current: string): string | null {
  switch (current) {
    case "pending":   return "preparing";
    case "preparing": return "served";
    case "served":    return isWalkin ? "completed" : "unpaid";
    case "unpaid":    return "completed";
    default:          return null;
  }
}

function getNextLabel(isWalkin: boolean, current: string): string {
  switch (current) {
    case "pending":   return "Accepter";
    case "preparing": return "Prêt à servir";
    case "served":    return isWalkin ? "Terminé" : "Table servie";
    case "unpaid":    return "";
    default:          return "";
  }
}

// ─── Live elapsed timer ───────────────────────────────────────────────────────
function ElapsedTimer({ since }: { since: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = new Date(since).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [since]);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  return (
    <span className={`font-mono text-xs font-semibold ${elapsed > 1800 ? "text-destructive animate-pulse" : "text-primary"}`}>
      {mm}:{ss}
    </span>
  );
}

// ─── Total prep badge ─────────────────────────────────────────────────────────
function TotalPrepBadge({ items }: { items: Order["items"] }) {
  const maxPrep = (items ?? []).reduce((acc, it) => Math.max(acc, (it.prepTimeMinutes ?? 15) * it.quantity), 0);
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Timer className="h-3 w-3" />
      <span>{maxPrep} min</span>
    </div>
  );
}

// ─── Transfer Dialog ──────────────────────────────────────────────────────────
function TransferDialog({ order, open, onClose }: { order: Order | null; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const transfer = useTransferOrder();
  const { data: tables } = useListTables({ query: { queryKey: getListTablesQueryKey() } });
  const [newTableId, setNewTableId] = useState<string>("");

  const availableTables = tables?.filter(t => t.status === "available" && t.id !== order?.tableId && t.number !== 0) ?? [];

  const handleTransfer = () => {
    if (!order || !newTableId) return;
    transfer.mutate(
      { id: order.id, data: { newTableId: parseInt(newTableId, 10) } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListOrdersQueryKey({}) });
          qc.invalidateQueries({ queryKey: getListTablesQueryKey() });
          toast({ title: `Commande #${order.id} transférée` });
          setNewTableId("");
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Transfert — Commande #{order?.id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Table actuelle : {order?.tableNumber ?? "Comptoir"}.</p>
          <div className="space-y-1.5">
            <Label>Nouvelle table</Label>
            <Select value={newTableId} onValueChange={setNewTableId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner une table" /></SelectTrigger>
              <SelectContent>
                {availableTables.length === 0
                  ? <SelectItem value="__none" disabled>Aucune table disponible</SelectItem>
                  : availableTables.map(tb => (
                      <SelectItem key={tb.id} value={String(tb.id)}>Table {tb.number} ({tb.capacity} places)</SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={handleTransfer} disabled={!newTableId || transfer.isPending}>
            <ArrowRightLeft className="h-4 w-4 mr-1.5" /> Transférer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── New Order Dialog ─────────────────────────────────────────────────────────
type CartItem = {
  menuItemId: number; name: string; price: number;
  prepTimeMinutes: number; quantity: number; notes: string;
  isSpicy?: boolean; isVegan?: boolean; isGlutenFree?: boolean;
};

function NewOrderDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const createOrder = useCreateOrder();
  const { data: tables } = useListTables({ query: { queryKey: getListTablesQueryKey() } });
  const { data: menuItems } = useListMenuItems({}, { query: { queryKey: getListMenuItemsQueryKey({}) } });
  const [tableId, setTableId] = useState<string>("");
  const [orderType, setOrderType] = useState<"walkin" | "seated">("walkin");
  const [guestName, setGuestName] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState("");
  const [editNotesFor, setEditNotesFor] = useState<number | null>(null);
  const [itemNoteValue, setItemNoteValue] = useState("");

  const availableTables = tables?.filter(t => t.status === "available" && t.number !== 0) ?? [];

  const addToCart = (item: { id: number; name: string; price: number; prepTimeMinutes: number; isSpicy?: boolean; isVegan?: boolean; isGlutenFree?: boolean }) => {
    setCart(c => {
      const ex = c.find(i => i.menuItemId === item.id);
      if (ex) return c.map(i => i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...c, { menuItemId: item.id, name: item.name, price: item.price, prepTimeMinutes: item.prepTimeMinutes ?? 15, quantity: 1, notes: "", isSpicy: item.isSpicy, isVegan: item.isVegan, isGlutenFree: item.isGlutenFree }];
    });
  };

  const removeFromCart = (menuItemId: number) =>
    setCart(c => c.map(i => i.menuItemId === menuItemId ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0));

  const saveItemNote = (menuItemId: number) => {
    setCart(c => c.map(i => i.menuItemId === menuItemId ? { ...i, notes: itemNoteValue } : i));
    setEditNotesFor(null);
    setItemNoteValue("");
  };

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  const canConfirm = cart.length > 0 && (orderType === "walkin" || tableId !== "");

  const handleCreate = () => {
    if (!canConfirm) return;
    const noteParts: string[] = [];
    if (orderType === "walkin") noteParts.push("Vente directe");
    else if (guestName.trim()) noteParts.push(`Client: ${guestName.trim()}`);
    if (notes.trim()) noteParts.push(notes.trim());

    createOrder.mutate(
      {
        data: {
          tableId: orderType === "seated" ? parseInt(tableId, 10) : undefined,
          customerId: undefined,
          items: cart.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity, notes: i.notes || undefined })),
          notes: noteParts.join(" — ") || undefined,
        } as any,
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListOrdersQueryKey({}) });
          qc.invalidateQueries({ queryKey: getListTablesQueryKey() });
          toast({ title: "Commande créée avec succès" });
          setTableId(""); setOrderType("walkin"); setGuestName(""); setCart([]); setNotes("");
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle commande</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: config + cart */}
          <div className="space-y-4">
            {/* Order type */}
            <div className="space-y-2">
              <Label>Type de vente</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setOrderType("walkin"); setTableId(""); setGuestName(""); }}
                  className={`flex flex-col gap-1.5 p-3 rounded-xl border-2 text-left transition-all ${
                    orderType === "walkin" ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30"
                  }`}
                >
                  <ShoppingBag className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Vente directe</span>
                  <span className="text-xs text-muted-foreground">Emporter / comptoir</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType("seated")}
                  className={`flex flex-col gap-1.5 p-3 rounded-xl border-2 text-left transition-all ${
                    orderType === "seated" ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30"
                  }`}
                >
                  <UserPlus className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Assis en salle</span>
                  <span className="text-xs text-muted-foreground">Table assignée</span>
                </button>
              </div>
            </div>

            {/* Table selector (only for seated) */}
            {orderType === "seated" && (
              <div className="space-y-1.5">
                <Label>Table <span className="text-destructive">*</span></Label>
                <Select value={tableId} onValueChange={setTableId}>
                  <SelectTrigger data-testid="select-order-table"><SelectValue placeholder="Sélectionner une table" /></SelectTrigger>
                  <SelectContent>
                    {availableTables.length === 0
                      ? <SelectItem value="__none" disabled>Aucune table disponible</SelectItem>
                      : availableTables.map(tb => (
                          <SelectItem key={tb.id} value={String(tb.id)}>Table {tb.number} ({tb.capacity} places)</SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Guest name (seated) */}
            {orderType === "seated" && (
              <div className="space-y-1.5">
                <Label>Prénom du client <span className="text-muted-foreground text-xs">optionnel</span></Label>
                <Input
                  placeholder="Ex : Ahmed, Fatima..."
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                />
              </div>
            )}

            {/* Special notes */}
            <div className="space-y-1.5">
              <Label>Remarques <span className="text-muted-foreground text-xs">optionnel</span></Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Allergies, préférences..." />
            </div>

            {/* Cart */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Commande</div>
              {cart.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground text-center">Appuyez sur les plats pour ajouter</p>
              ) : (
                <div className="divide-y">
                  {cart.map(item => (
                    <div key={item.menuItemId} className="px-3 py-2.5 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.prepTimeMinutes}m · {formatDZD(item.price)}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => removeFromCart(item.menuItemId)} className="h-6 w-6 rounded border flex items-center justify-center hover:bg-muted"><Minus className="h-3 w-3" /></button>
                          <span className="text-sm font-bold w-5 text-center">{item.quantity}</span>
                          <button onClick={() => setCart(c => c.map(i => i.menuItemId === item.menuItemId ? { ...i, quantity: i.quantity + 1 } : i))} className="h-6 w-6 rounded border flex items-center justify-center hover:bg-muted"><Plus className="h-3 w-3" /></button>
                        </div>
                        <span className="text-sm font-bold text-primary w-20 text-right">{formatDZD(item.price * item.quantity)}</span>
                      </div>
                      {editNotesFor === item.menuItemId ? (
                        <div className="flex gap-1.5">
                          <Input className="h-7 text-xs flex-1" placeholder="Note pour ce plat..." value={itemNoteValue} onChange={e => setItemNoteValue(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveItemNote(item.menuItemId); if (e.key === "Escape") { setEditNotesFor(null); setItemNoteValue(""); } }} autoFocus />
                          <Button size="sm" className="h-7 text-xs px-2" onClick={() => saveItemNote(item.menuItemId)}>OK</Button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditNotesFor(item.menuItemId); setItemNoteValue(item.notes); }} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                          {item.notes ? `Note: ${item.notes}` : "+ Ajouter une note"}
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="flex justify-between px-3 py-2.5 font-bold bg-muted/20 text-sm">
                    <span>Total</span>
                    <span className="text-primary">{formatDZD(total)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: menu browser */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Menu</Label>
            <div className="max-h-[480px] overflow-y-auto space-y-1.5 pr-0.5">
              {menuItems?.filter(m => m.available).map(m => {
                const inCart = cart.find(c => c.menuItemId === m.id);
                const imgUrl = (m as any).imageUrl as string | null | undefined;
                return (
                  <button
                    key={m.id}
                    onClick={() => addToCart({ id: m.id, name: m.name, price: m.price, prepTimeMinutes: m.prepTimeMinutes ?? 15, isSpicy: m.isSpicy, isVegan: m.isVegan, isGlutenFree: m.isGlutenFree })}
                    className={`w-full text-left flex items-center gap-3 px-2.5 py-2 rounded-xl border transition-all ${
                      inCart ? "border-primary/50 bg-primary/5 shadow-sm" : "border-border hover:bg-accent hover:border-primary/30"
                    }`}
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-muted">
                      {imgUrl ? (
                        <img src={imgUrl} alt={m.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><UtensilsCrossed className="h-5 w-5 text-muted-foreground/40" /></div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 flex-wrap">
                        <p className="text-sm font-semibold truncate">{m.name}</p>
                        {m.isSpicy && <Flame className="h-3 w-3 text-red-500 flex-shrink-0" />}
                        {m.isVegan && <Leaf className="h-3 w-3 text-green-600 flex-shrink-0" />}
                        {m.isGlutenFree && <Wheat className="h-3 w-3 text-amber-600 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{m.prepTimeMinutes ?? 15} min · {formatDZD(m.price)}</p>
                    </div>
                    {inCart && (
                      <Badge className="text-xs h-5 px-1.5 bg-primary text-white flex-shrink-0">{inCart.quantity}</Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter className="mt-4 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={handleCreate} disabled={!canConfirm || createOrder.isPending} data-testid="button-confirm-order">
            Passer la commande — {formatDZD(total)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({ order, onTransfer }: { order: Order; onTransfer: (o: Order) => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(true);
  const updateStatus = useUpdateOrderStatus();
  const sc = SC[order.status] ?? SC.pending;
  const isActive = order.status === "pending" || order.status === "preparing";
  const isWalkin = (order as any).isWalkin as boolean ?? order.notes?.includes("Vente directe") ?? false;
  const isUnpaid = order.status === "unpaid";

  const handleStatus = (s: string) => {
    updateStatus.mutate(
      { id: order.id, data: { status: s as any } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListOrdersQueryKey({}) });
          qc.invalidateQueries({ queryKey: getListTablesQueryKey() });
          if (s === "completed") toast({ title: `Commande #${order.id} — paiement confirmé`, description: formatDZD(order.finalAmount ?? order.totalAmount) });
        },
      }
    );
  };

  const nextStatus = getNextStatus(isWalkin, order.status);
  const nextLabel = getNextLabel(isWalkin, order.status);

  return (
    <Card className={`flex flex-col ${isUnpaid ? "ring-2 ring-orange-400 shadow-orange-100 shadow-lg" : isActive ? "border-primary/30 shadow-sm" : "opacity-80"}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">
                {order.customerName
                  ? <span className="flex items-center gap-1"><User className="h-3.5 w-3.5 text-muted-foreground" />{order.customerName}</span>
                  : `Commande #${order.id}`}
              </CardTitle>
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(order.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </span>
              {isActive && <ElapsedTimer since={order.createdAt} />}
            </div>
          </div>
          <Badge variant="outline" className={`text-xs flex-shrink-0 ${sc.cls}`}>{sc.label}</Badge>
        </div>
        <div className="flex items-center justify-between mt-1">
          {isWalkin ? (
            <span className="text-sm font-semibold flex items-center gap-1.5 text-muted-foreground">
              <ShoppingBag className="h-3.5 w-3.5" /> Comptoir
            </span>
          ) : (
            <span className="text-sm font-semibold">Table {order.tableNumber ?? "—"}</span>
          )}
          {isActive && <TotalPrepBadge items={order.items ?? []} />}
        </div>
      </CardHeader>

      <CardContent className="flex-1 pt-0">
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground pb-2 border-b mb-2 transition-colors">
              <span>{order.items?.length ?? 0} plat{(order.items?.length ?? 0) > 1 ? "s" : ""} · #{order.id}</span>
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-2">
              {order.items?.map((item, i) => (
                <div key={i} className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm"><span className="font-semibold">{item.quantity}×</span> {item.menuItemName}</p>
                    {item.notes && <p className="text-xs text-muted-foreground italic mt-0.5 truncate">{item.notes}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap mt-1">{formatDZD(item.subtotal)}</span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>

      <CardFooter className="pt-3 border-t bg-muted/20 flex-col gap-2 items-stretch">
        <div className="flex justify-between font-bold text-sm">
          <span>Total</span>
          <span className="text-primary text-base">{formatDZD(order.finalAmount ?? order.totalAmount)}</span>
        </div>

        {/* Payment button for unpaid orders */}
        {isUnpaid && (
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 h-11 text-base shadow-lg"
            onClick={() => handleStatus("completed")}
            disabled={updateStatus.isPending}
          >
            <Banknote className="h-5 w-5" />
            Encaisser {formatDZD(order.finalAmount ?? order.totalAmount)}
          </Button>
        )}

        {/* Next step button for active orders */}
        {nextLabel && !isUnpaid && (
          <Button
            variant={nextStatus === "unpaid" ? "outline" : "default"}
            className="w-full gap-2"
            onClick={() => nextStatus && handleStatus(nextStatus)}
            disabled={updateStatus.isPending}
          >
            {order.status === "pending" && <ChefHat className="h-4 w-4" />}
            {order.status === "preparing" && <UtensilsCrossed className="h-4 w-4" />}
            {order.status === "served" && <CreditCard className="h-4 w-4" />}
            {nextLabel}
          </Button>
        )}

        {/* Transfer + cancel row */}
        <div className="flex gap-2">
          {isActive && (
            <button
              onClick={() => onTransfer(order)}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border rounded-md px-3 py-1.5 hover:bg-muted transition-colors"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" /> Transférer
            </button>
          )}
          {order.status !== "completed" && order.status !== "cancelled" && (
            <button
              onClick={() => handleStatus("cancelled")}
              className="flex-1 flex items-center justify-center gap-1 text-xs text-destructive hover:bg-destructive/5 border border-destructive/20 rounded-md px-3 py-1.5 transition-colors"
              disabled={updateStatus.isPending}
            >
              Annuler
            </button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({
  icon: Icon, title, count, color = "default", badge,
}: {
  icon: React.ElementType;
  title: string;
  count: number;
  color?: "default" | "blue" | "violet" | "orange" | "green";
  badge?: React.ReactNode;
}) {
  const colorMap = {
    default: "text-foreground",
    blue:    "text-blue-700",
    violet:  "text-violet-700",
    orange:  "text-orange-700",
    green:   "text-emerald-700",
  };
  const bgMap = {
    default: "bg-muted",
    blue:    "bg-blue-100",
    violet:  "bg-violet-100",
    orange:  "bg-orange-100",
    green:   "bg-emerald-100",
  };
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bgMap[color]}`}>
        <Icon className={`h-4 w-4 ${colorMap[color]}`} />
      </div>
      <h2 className={`font-serif font-bold text-lg ${colorMap[color]}`}>{title}</h2>
      <Badge variant="secondary" className="text-xs">{count}</Badge>
      {badge}
    </div>
  );
}

// ─── Main Orders Page ─────────────────────────────────────────────────────────
export default function Orders() {
  const [search, setSearch] = useState("");
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState<Order | null>(null);

  const { data: orders, isLoading } = useListOrders(
    {},
    { query: { queryKey: getListOrdersQueryKey({}), refetchInterval: 10000 } }
  );

  const matchesSearch = (o: Order) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      (o.customerName?.toLowerCase().includes(q)) ||
      String(o.id).includes(q) ||
      (o.tableNumber != null && String(o.tableNumber).includes(q))
    );
  };

  const all = orders ?? [];
  const kitchenOrders  = all.filter(o => (o.status === "pending" || o.status === "preparing") && matchesSearch(o));
  const servedOrders   = all.filter(o => o.status === "served" && matchesSearch(o));
  const unpaidOrders   = all.filter(o => o.status === "unpaid" && matchesSearch(o));
  const completedOrders = all.filter(o => o.status === "completed" && matchesSearch(o));
  const cancelledOrders = all.filter(o => o.status === "cancelled" && matchesSearch(o));

  const activeCount = kitchenOrders.length;
  const unpaidCount = unpaidOrders.length;

  return (
    <div className="space-y-8">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold">Commandes</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {activeCount > 0 ? `${activeCount} commande${activeCount > 1 ? "s" : ""} en cuisine` : "Tableau de suivi des commandes"}
            {unpaidCount > 0 && ` · ${unpaidCount} en attente de paiement`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8 w-52 h-9 text-sm"
              placeholder="Nom, table, n°..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={() => setNewOrderOpen(true)} data-testid="button-new-order">
            <Plus className="h-4 w-4 mr-1.5" /> Nouvelle commande
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      ) : (
        <div className="space-y-10">

          {/* ── En cuisine ──────────────────────────────────────────────── */}
          <section>
            <SectionHeader icon={ChefHat} title="En cuisine" count={kitchenOrders.length} color="blue" />
            {kitchenOrders.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm border-2 border-dashed rounded-xl border-blue-200 bg-blue-50/30">
                Aucune commande en cours
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {kitchenOrders.map(o => <OrderCard key={o.id} order={o} onTransfer={setTransferTarget} />)}
              </div>
            )}
          </section>

          {/* ── Servis ──────────────────────────────────────────────────── */}
          {servedOrders.length > 0 && (
            <section>
              <SectionHeader icon={UtensilsCrossed} title="Servis en salle" count={servedOrders.length} color="violet" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {servedOrders.map(o => <OrderCard key={o.id} order={o} onTransfer={setTransferTarget} />)}
              </div>
            </section>
          )}

          {/* ── En attente de paiement ──────────────────────────────────── */}
          {unpaidOrders.length > 0 && (
            <section className="bg-orange-50/60 border-2 border-orange-200 rounded-2xl p-5">
              <SectionHeader
                icon={CreditCard}
                title="En attente de paiement"
                count={unpaidOrders.length}
                color="orange"
                badge={<span className="text-xs text-orange-600 font-semibold ml-1">Encaissements requis</span>}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unpaidOrders.map(o => <OrderCard key={o.id} order={o} onTransfer={setTransferTarget} />)}
              </div>
            </section>
          )}

          {/* ── Historique ──────────────────────────────────────────────── */}
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium py-2 px-3 rounded-lg hover:bg-muted w-full">
                {historyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Historique du jour
                <Badge variant="outline" className="ml-1">{completedOrders.length + cancelledOrders.length}</Badge>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-6 mt-4">
                {completedOrders.length > 0 && (
                  <section>
                    <SectionHeader icon={Banknote} title="Payés" count={completedOrders.length} color="green" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {completedOrders.map(o => <OrderCard key={o.id} order={o} onTransfer={setTransferTarget} />)}
                    </div>
                  </section>
                )}
                {cancelledOrders.length > 0 && (
                  <section>
                    <SectionHeader icon={Timer} title="Annulés" count={cancelledOrders.length} />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {cancelledOrders.map(o => <OrderCard key={o.id} order={o} onTransfer={setTransferTarget} />)}
                    </div>
                  </section>
                )}
                {completedOrders.length === 0 && cancelledOrders.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground text-sm">Aucun historique pour aujourd'hui</div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

        </div>
      )}

      <TransferDialog order={transferTarget} open={!!transferTarget} onClose={() => setTransferTarget(null)} />
      <NewOrderDialog open={newOrderOpen} onClose={() => setNewOrderOpen(false)} />
    </div>
  );
}
