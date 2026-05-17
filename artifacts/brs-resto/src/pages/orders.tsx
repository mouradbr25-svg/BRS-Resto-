import { useState, useEffect } from "react";
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
import { Clock, User, ChevronDown, ChevronUp, ArrowRightLeft, Plus, Minus, Timer } from "lucide-react";

// ─── Live elapsed timer since order created ───────────────────────────────────
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
  const isLong = elapsed > 1800;
  return (
    <span className={`font-mono text-xs font-semibold ${isLong ? "text-destructive animate-pulse" : "text-primary"}`}>
      {mm}:{ss}
    </span>
  );
}

// ─── Total estimated prep time (max across items, scaled by qty) ──────────────
function TotalPrepBadge({ items }: { items: Order["items"] }) {
  const maxPrep = (items ?? []).reduce((acc, it) => {
    return Math.max(acc, (it.prepTimeMinutes ?? 15) * it.quantity);
  }, 0);
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Timer className="h-3 w-3" />
      <span>Est. {maxPrep} min</span>
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

  const availableTables = tables?.filter(t => t.status === "available" && t.id !== order?.tableId) ?? [];

  const handleTransfer = () => {
    if (!order || !newTableId) return;
    transfer.mutate(
      { id: order.id, data: { newTableId: parseInt(newTableId, 10) } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListOrdersQueryKey({}) });
          qc.invalidateQueries({ queryKey: getListTablesQueryKey() });
          const tbl = availableTables.find(t => t.id === parseInt(newTableId));
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
          <DialogTitle>Transfer Order #{order?.id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Currently on Table {order?.tableNumber}. Choose a free table.
          </p>
          <div className="space-y-1.5">
            <Label>New Table</Label>
            <Select value={newTableId} onValueChange={setNewTableId}>
              <SelectTrigger><SelectValue placeholder="Select table..." /></SelectTrigger>
              <SelectContent>
                {availableTables.length === 0
                  ? <SelectItem value="__none" disabled>No available tables</SelectItem>
                  : availableTables.map(t => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        Table {t.number} ({t.capacity} seats)
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleTransfer} disabled={!newTableId || availableTables.length === 0 || transfer.isPending}>
            <ArrowRightLeft className="h-4 w-4 mr-1.5" /> Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── New Order Dialog ─────────────────────────────────────────────────────────
type CartItem = { menuItemId: number; name: string; price: number; prepTimeMinutes: number; quantity: number };

function NewOrderDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
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

  const availableTables = tables?.filter(t => t.status === "available") ?? [];

  const addToCart = (item: { menuItemId: number; name: string; price: number; prepTimeMinutes: number }) => {
    setCart(c => {
      const ex = c.find(i => i.menuItemId === item.menuItemId);
      if (ex) return c.map(i => i.menuItemId === item.menuItemId ? { ...i, quantity: i.quantity + 1 } : i);
      return [...c, { menuItemId: item.menuItemId, name: item.name, price: item.price, prepTimeMinutes: item.prepTimeMinutes ?? 15, quantity: 1 }];
    });
  };

  const removeFromCart = (menuItemId: number) => {
    setCart(c => c.map(i => i.menuItemId === menuItemId ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0));
  };

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  const handleCreate = () => {
    if (!tableId || cart.length === 0) return;
    createOrder.mutate(
      {
        data: {
          tableId: parseInt(tableId, 10),
          customerId: customerId !== "none" ? parseInt(customerId, 10) : undefined,
          items: cart.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
          notes: notes || undefined,
        } as any,
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListOrdersQueryKey({}) });
          qc.invalidateQueries({ queryKey: getListTablesQueryKey() });
          toast({ title: "Order placed", description: `Table ${tables?.find(t => t.id === parseInt(tableId))?.number}` });
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
          <DialogTitle>New Order</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: order config + cart */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Table</Label>
              <Select value={tableId} onValueChange={setTableId}>
                <SelectTrigger data-testid="select-order-table"><SelectValue placeholder="Select available table..." /></SelectTrigger>
                <SelectContent>
                  {availableTables.map(t => (
                    <SelectItem key={t.id} value={String(t.id)}>Table {t.number} ({t.capacity} seats)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Customer <span className="text-muted-foreground text-xs">optional</span></Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Walk-in</SelectItem>
                  {customers?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Allergies, special requests..." />
            </div>

            {/* Cart */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Order Summary
              </div>
              {cart.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground text-center">Tap items on the right to add them</p>
              ) : (
                <div className="divide-y">
                  {cart.map(item => (
                    <div key={item.menuItemId} className="flex items-center gap-2 px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.prepTimeMinutes}m · {formatDZD(item.price)}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => removeFromCart(item.menuItemId)} className="h-6 w-6 rounded border flex items-center justify-center hover:bg-muted text-muted-foreground">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-sm font-bold w-5 text-center">{item.quantity}</span>
                        <button onClick={() => addToCart(item)} className="h-6 w-6 rounded border flex items-center justify-center hover:bg-muted text-muted-foreground">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="text-sm font-bold w-20 text-right text-primary">{formatDZD(item.price * item.quantity)}</span>
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
            <div className="max-h-96 overflow-y-auto space-y-1 pr-0.5">
              {menuItems?.filter(m => m.available).map(m => {
                const inCart = cart.find(c => c.menuItemId === m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => addToCart({ menuItemId: m.id, name: m.name, price: m.price, prepTimeMinutes: m.prepTimeMinutes ?? 15 })}
                    className="w-full text-left flex items-center justify-between px-3 py-2.5 rounded-md border hover:bg-accent hover:border-primary/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.prepTimeMinutes ?? 15}m prep · {m.categoryName}</p>
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
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleCreate}
            disabled={!tableId || cart.length === 0 || createOrder.isPending}
            data-testid="button-confirm-order"
          >
            Place Order — {formatDZD(total)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Status config ────────────────────────────────────────────────────────────
const SC: Record<string, { label: string; cls: string }> = {
  pending:   { label: "Pending",   cls: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  preparing: { label: "Preparing", cls: "bg-blue-100 text-blue-800 border-blue-200" },
  served:    { label: "Served",    cls: "bg-purple-100 text-purple-800 border-purple-200" },
  completed: { label: "Completed", cls: "bg-green-100 text-green-800 border-green-200" },
  cancelled: { label: "Cancelled", cls: "bg-red-100 text-red-800 border-red-200" },
};

// ─── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({ order, onTransfer }: { order: Order; onTransfer: (o: Order) => void }) {
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
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base">Order #{order.id}</CardTitle>
            <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(order.createdAt).toLocaleTimeString("fr-DZ", { hour: "2-digit", minute: "2-digit" })}
              </span>
              {order.customerName && (
                <span className="flex items-center gap-1"><User className="h-3 w-3" />{order.customerName}</span>
              )}
              {isActive && <ElapsedTimer since={order.createdAt} />}
            </div>
          </div>
          <Badge variant="outline" className={`text-xs flex-shrink-0 ${sc.cls}`}>{sc.label}</Badge>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-sm font-semibold">Table {order.tableNumber ?? "—"}</span>
          {isActive && <TotalPrepBadge items={order.items ?? []} />}
        </div>
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
                    <p className="text-sm">
                      <span className="font-semibold">{item.quantity}×</span> {item.menuItemName}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Clock className="h-3 w-3" />
                      <span>{(item.prepTimeMinutes ?? 15)} min/portion · {(item.prepTimeMinutes ?? 15) * item.quantity} min total</span>
                    </div>
                    {item.notes && <p className="text-xs text-muted-foreground italic mt-0.5">{item.notes}</p>}
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
          <span>Total</span>
          <span className="text-primary">{formatDZD(order.finalAmount ?? order.totalAmount)}</span>
        </div>

        {isActive && (
          <button
            onClick={() => onTransfer(order)}
            className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border rounded-md px-3 py-1.5 hover:bg-muted transition-colors w-full"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" /> Transfer Table
          </button>
        )}

        {order.status !== "completed" && order.status !== "cancelled" && (
          <Select value={order.status} onValueChange={handleStatus}>
            <SelectTrigger className="w-full h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="preparing">Preparing (starts kitchen)</SelectItem>
              <SelectItem value="served">Served</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        )}
      </CardFooter>
    </Card>
  );
}

// ─── Main Orders Page ─────────────────────────────────────────────────────────
export default function Orders() {
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
          <h1 className="text-3xl font-serif font-bold">Live Orders</h1>
          <p className="text-muted-foreground mt-1">
            {activeCount > 0
              ? `${activeCount} active order${activeCount !== 1 ? "s" : ""} — refreshes every 15s`
              : "No active orders right now"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-44 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active Orders</SelectItem>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="preparing">Preparing</SelectItem>
              <SelectItem value="served">Served</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setNewOrderOpen(true)} data-testid="button-new-order">
            <Plus className="h-4 w-4 mr-1.5" /> New Order
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground border-2 border-dashed rounded-xl">
          No orders match this filter.
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
