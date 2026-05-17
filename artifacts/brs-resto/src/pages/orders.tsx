import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  useListOrders, getListOrdersQueryKey,
  useUpdateOrderStatus,
  useTransferOrder,
  useListTables, getListTablesQueryKey,
  useListMenuItems, getListMenuItemsQueryKey,
  useListCustomers, getListCustomersQueryKey,
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
import { Clock, User, ChevronDown, ChevronUp, ArrowRightLeft, Plus, Minus, Timer, Flame, Leaf, Wheat } from "lucide-react";

// ─── Status config ────────────────────────────────────────────────────────────
const SC: Record<string, { label: string; cls: string }> = {
  pending:   { label: "Pending",   cls: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  preparing: { label: "Preparing", cls: "bg-blue-100 text-blue-800 border-blue-200" },
  served:    { label: "Served",    cls: "bg-purple-100 text-purple-800 border-purple-200" },
  completed: { label: "Completed", cls: "bg-green-100 text-green-800 border-green-200" },
  cancelled: { label: "Cancelled", cls: "bg-red-100 text-red-800 border-red-200" },
};

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

// ─── Order progress stepper ───────────────────────────────────────────────────
const STEPS = [
  { status: "pending",   key: "received" },
  { status: "preparing", key: "cooking"  },
  { status: "served",    key: "serving"  },
  { status: "completed", key: "done"     },
] as const;

const STATUS_ORDER = ["pending", "preparing", "served", "completed"];

function OrderProgress({ status }: { status: string }) {
  const { t } = useTranslation();
  if (status === "cancelled") return null;
  const currentIdx = STATUS_ORDER.indexOf(status);
  return (
    <div className="flex items-center gap-0 w-full mt-2 mb-1">
      {STEPS.map((step, i) => {
        const done = STATUS_ORDER.indexOf(step.status) <= currentIdx;
        const isLast = i === STEPS.length - 1;
        return (
          <div key={step.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center text-[9px] font-bold transition-colors ${
                done ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30 text-muted-foreground/30"
              }`}>
                {done ? "✓" : i + 1}
              </div>
              <span className={`text-[9px] mt-0.5 font-medium whitespace-nowrap ${done ? "text-primary" : "text-muted-foreground/50"}`}>
                {t(`orders.progress.${step.key}` as any)}
              </span>
            </div>
            {!isLast && (
              <div className={`flex-1 h-0.5 mx-0.5 transition-colors ${
                STATUS_ORDER.indexOf(step.status) < currentIdx ? "bg-primary" : "bg-muted-foreground/20"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Total prep badge ─────────────────────────────────────────────────────────
function TotalPrepBadge({ items }: { items: Order["items"] }) {
  const { t } = useTranslation();
  const maxPrep = (items ?? []).reduce((acc, it) => Math.max(acc, (it.prepTimeMinutes ?? 15) * it.quantity), 0);
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Timer className="h-3 w-3" />
      <span>{t("orders.estPrep")} {maxPrep} min</span>
    </div>
  );
}

// ─── Transfer Dialog ──────────────────────────────────────────────────────────
function TransferDialog({ order, open, onClose }: { order: Order | null; open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const transfer = useTransferOrder();
  const { data: tables } = useListTables({ query: { queryKey: getListTablesQueryKey() } });
  const [newTableId, setNewTableId] = useState<string>("");

  const availableTables = tables?.filter(t => t.status === "available" && t.id !== order?.tableId) ?? [];

  const handleTransfer = () => {
    if (!order || !newTableId) return;
    transfer.mutate(
      { id: order.id, data: { newTableId: parseInt(newTableId, 10) } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListOrdersQueryKey({}) });
          qc.invalidateQueries({ queryKey: getListTablesQueryKey() });
          const tbl = availableTables.find(tb => tb.id === parseInt(newTableId));
          toast({ title: `Order #${order.id} moved to Table ${tbl?.number}` });
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
          <DialogTitle>{t("orders.transfer")} — Order #{order?.id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Currently on Table {order?.tableNumber}.</p>
          <div className="space-y-1.5">
            <Label>{t("tables.title")}</Label>
            <Select value={newTableId} onValueChange={setNewTableId}>
              <SelectTrigger><SelectValue placeholder={t("orders.selectTable")} /></SelectTrigger>
              <SelectContent>
                {availableTables.length === 0
                  ? <SelectItem value="__none" disabled>No available tables</SelectItem>
                  : availableTables.map(tb => (
                      <SelectItem key={tb.id} value={String(tb.id)}>Table {tb.number} ({tb.capacity} seats)</SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={handleTransfer} disabled={!newTableId || transfer.isPending}>
            <ArrowRightLeft className="h-4 w-4 mr-1.5" /> Transfer
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
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const createOrder = useCreateOrder();
  const { data: tables } = useListTables({ query: { queryKey: getListTablesQueryKey() } });
  const { data: menuItems } = useListMenuItems({}, { query: { queryKey: getListMenuItemsQueryKey({}) } });
  const { data: customers } = useListCustomers({ query: { queryKey: getListCustomersQueryKey() } });
  const [tableId, setTableId] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("none");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState("");
  const [editNotesFor, setEditNotesFor] = useState<number | null>(null);
  const [itemNoteValue, setItemNoteValue] = useState("");

  const availableTables = tables?.filter(t => t.status === "available") ?? [];

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

  const handleCreate = () => {
    if (!tableId || cart.length === 0) return;
    createOrder.mutate(
      {
        data: {
          tableId: parseInt(tableId, 10),
          customerId: customerId !== "none" ? parseInt(customerId, 10) : undefined,
          items: cart.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity, notes: i.notes || undefined })),
          notes: notes || undefined,
        } as any,
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListOrdersQueryKey({}) });
          qc.invalidateQueries({ queryKey: getListTablesQueryKey() });
          toast({ title: "Order placed" });
          setTableId(""); setCustomerId("none"); setCart([]); setNotes("");
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("orders.newOrder")}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: config + cart */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("tables.title")}</Label>
              <Select value={tableId} onValueChange={setTableId}>
                <SelectTrigger data-testid="select-order-table"><SelectValue placeholder={t("orders.selectTable")} /></SelectTrigger>
                <SelectContent>
                  {availableTables.map(tb => (
                    <SelectItem key={tb.id} value={String(tb.id)}>Table {tb.number} ({tb.capacity} seats)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Customer <span className="text-muted-foreground text-xs">optional</span></Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("orders.walkIn")}</SelectItem>
                  {customers?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("common.notes")}</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder={t("orders.specialRequests")} />
            </div>

            {/* Cart */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Order Summary</div>
              {cart.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground text-center">Tap items on the right to add</p>
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
                      {/* Item notes */}
                      {editNotesFor === item.menuItemId ? (
                        <div className="flex gap-1.5">
                          <Input
                            className="h-7 text-xs flex-1"
                            placeholder={t("orders.itemNotes")}
                            value={itemNoteValue}
                            onChange={e => setItemNoteValue(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") saveItemNote(item.menuItemId); if (e.key === "Escape") { setEditNotesFor(null); setItemNoteValue(""); } }}
                            autoFocus
                          />
                          <Button size="sm" className="h-7 text-xs px-2" onClick={() => saveItemNote(item.menuItemId)}>OK</Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditNotesFor(item.menuItemId); setItemNoteValue(item.notes); }}
                          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                        >
                          {item.notes ? `Note: ${item.notes}` : `+ ${t("orders.itemNotes")}`}
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="flex justify-between px-3 py-2.5 font-bold bg-muted/20 text-sm">
                    <span>{t("common.total")}</span>
                    <span className="text-primary">{formatDZD(total)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: menu browser */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("nav.menu")}</Label>
            <div className="max-h-96 overflow-y-auto space-y-1 pr-0.5">
              {menuItems?.filter(m => m.available).map(m => {
                const inCart = cart.find(c => c.menuItemId === m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => addToCart({ id: m.id, name: m.name, price: m.price, prepTimeMinutes: m.prepTimeMinutes ?? 15, isSpicy: m.isSpicy, isVegan: m.isVegan, isGlutenFree: m.isGlutenFree })}
                    className="w-full text-left flex items-center justify-between px-3 py-2.5 rounded-md border hover:bg-accent hover:border-primary/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-medium truncate">{m.name}</p>
                        {m.isSpicy && <Flame className="h-3 w-3 text-red-500 flex-shrink-0" />}
                        {m.isVegan && <Leaf className="h-3 w-3 text-green-600 flex-shrink-0" />}
                        {m.isGlutenFree && <Wheat className="h-3 w-3 text-amber-600 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{m.prepTimeMinutes ?? 15}m prep</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      {inCart && <Badge variant="secondary" className="text-xs h-5 px-1.5">{inCart.quantity}</Badge>}
                      <span className="text-sm font-bold text-primary">{formatDZD(m.price)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter className="mt-4 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={handleCreate} disabled={!tableId || cart.length === 0 || createOrder.isPending} data-testid="button-confirm-order">
            {t("orders.placeOrder")} — {formatDZD(total)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({ order, onTransfer }: { order: Order; onTransfer: (o: Order) => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const isActive = order.status === "pending" || order.status === "preparing";
  const [expanded, setExpanded] = useState(isActive);
  const updateStatus = useUpdateOrderStatus();
  const sc = SC[order.status] ?? SC.pending;

  const handleStatus = (s: string) => {
    updateStatus.mutate(
      { id: order.id, data: { status: s as any } },
      {
        onSuccess: u => qc.setQueryData(
          getListOrdersQueryKey({}),
          (old: Order[] | undefined) => old?.map(o => o.id === order.id ? u : o) ?? []
        ),
      }
    );
  };

  return (
    <Card className={`flex flex-col ${isActive ? "border-primary/30 shadow-sm" : "opacity-75"}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base">Order #{order.id}</CardTitle>
            <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(order.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
              </span>
              {order.customerName && <span className="flex items-center gap-1"><User className="h-3 w-3" />{order.customerName}</span>}
              {isActive && <ElapsedTimer since={order.createdAt} />}
            </div>
          </div>
          <Badge variant="outline" className={`text-xs flex-shrink-0 ${sc.cls}`}>{sc.label}</Badge>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-sm font-semibold">Table {order.tableNumber ?? "—"}</span>
          {isActive && <TotalPrepBadge items={order.items ?? []} />}
        </div>
        {/* Visual progress stepper */}
        <OrderProgress status={order.status} />
      </CardHeader>

      <CardContent className="flex-1 pt-0">
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground pb-2 border-b mb-2 transition-colors">
              <span>{order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? "s" : ""}</span>
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-2">
              {order.items?.map((item, i) => (
                <div key={i} className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm"><span className="font-semibold">{item.quantity}×</span> {item.menuItemName}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Clock className="h-3 w-3" />
                      <span>{item.prepTimeMinutes ?? 15} {t("orders.perPortion")} · {(item.prepTimeMinutes ?? 15) * item.quantity} min total</span>
                    </div>
                    {item.notes && <p className="text-xs text-muted-foreground italic mt-0.5 truncate">{item.notes}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap mt-1">{formatDZD(item.subtotal)}</span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>

      <CardFooter className="pt-3 border-t bg-muted/20 flex-col gap-2.5 items-stretch">
        <div className="flex justify-between font-bold text-sm">
          <span>{t("common.total")}</span>
          <span className="text-primary">{formatDZD(order.finalAmount ?? order.totalAmount)}</span>
        </div>

        {isActive && (
          <button
            onClick={() => onTransfer(order)}
            className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border rounded-md px-3 py-1.5 hover:bg-muted transition-colors w-full"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" /> {t("orders.transfer")}
          </button>
        )}

        {order.status !== "completed" && order.status !== "cancelled" && (
          <Select value={order.status} onValueChange={handleStatus}>
            <SelectTrigger className="w-full h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">{t("status.pending")}</SelectItem>
              <SelectItem value="preparing">{t("status.preparing")}</SelectItem>
              <SelectItem value="served">{t("status.served")}</SelectItem>
              <SelectItem value="completed">{t("status.completed")}</SelectItem>
              <SelectItem value="cancelled">{t("status.cancelled")}</SelectItem>
            </SelectContent>
          </Select>
        )}
      </CardFooter>
    </Card>
  );
}

// ─── Main Orders Page ─────────────────────────────────────────────────────────
export default function Orders() {
  const { t } = useTranslation();
  const [filterStatus, setFilterStatus] = useState<string>("active");
  const [transferTarget, setTransferTarget] = useState<Order | null>(null);
  const [newOrderOpen, setNewOrderOpen] = useState(false);

  const { data: orders, isLoading } = useListOrders(
    {},
    { query: { queryKey: getListOrdersQueryKey({}), refetchInterval: 15000 } }
  );

  const activeCount = orders?.filter(o => o.status === "pending" || o.status === "preparing").length ?? 0;

  const filtered = (orders ?? []).filter(o => {
    if (filterStatus === "active") return o.status === "pending" || o.status === "preparing";
    if (filterStatus === "all") return true;
    return o.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-serif font-bold">{t("orders.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {activeCount > 0
              ? `${activeCount} ${activeCount === 1 ? t("orders.activeOrders") : t("orders.activeOrdersPlural")} — ${t("orders.subtitle")}`
              : t("orders.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-44 h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active Orders</SelectItem>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="pending">{t("status.pending")}</SelectItem>
              <SelectItem value="preparing">{t("status.preparing")}</SelectItem>
              <SelectItem value="served">{t("status.served")}</SelectItem>
              <SelectItem value="completed">{t("status.completed")}</SelectItem>
              <SelectItem value="cancelled">{t("status.cancelled")}</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setNewOrderOpen(true)} data-testid="button-new-order">
            <Plus className="h-4 w-4 mr-1.5" /> {t("orders.newOrder")}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground border-2 border-dashed rounded-xl">
          {t("orders.noOrders")}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(order => (
            <OrderCard key={order.id} order={order} onTransfer={setTransferTarget} />
          ))}
        </div>
      )}

      <TransferDialog order={transferTarget} open={!!transferTarget} onClose={() => setTransferTarget(null)} />
      <NewOrderDialog open={newOrderOpen} onClose={() => setNewOrderOpen(false)} />
    </div>
  );
}
