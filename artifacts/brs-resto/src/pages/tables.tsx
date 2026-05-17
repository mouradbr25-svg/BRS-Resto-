import { useState, useEffect } from "react";
import {
  useListTables, getListTablesQueryKey,
  useCreateTable, useUpdateTable, useDeleteTable,
} from "@workspace/api-client-react";
import type { Table } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, QrCode, Copy, Check, Pencil, Trash2, Link, Clock } from "lucide-react";

// ─── Live elapsed timer for occupied tables ───────────────────────────────────
function ElapsedTimer({ since }: { since: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = new Date(since).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [since]);
  const hh = Math.floor(elapsed / 3600);
  const mm = Math.floor((elapsed % 3600) / 60);
  const ss = elapsed % 60;
  const display = hh > 0
    ? `${hh}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
    : `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  const isLong = elapsed > 3600; // >1hr = warn
  return (
    <div className={`flex items-center gap-1 text-xs font-mono font-semibold ${isLong ? "text-destructive animate-pulse" : "text-red-700"}`}>
      <Clock className="h-3 w-3" />
      {display}
    </div>
  );
}

// ─── Table Dialog ─────────────────────────────────────────────────────────────
function TableDialog({
  table,
  open,
  onClose,
}: {
  table?: Table;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const createTable = useCreateTable();
  const updateTable = useUpdateTable();
  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      number: table?.number ?? "",
      capacity: table?.capacity ?? 4,
      status: table?.status ?? "available",
    },
  });
  const status = watch("status");

  const onSubmit = (values: { number: number | string; capacity: number; status: string }) => {
    if (table) {
      updateTable.mutate(
        { id: table.id, data: { number: Number(values.number), capacity: Number(values.capacity), status: values.status as any } },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getListTablesQueryKey() });
            toast({ title: "Table updated" });
            onClose();
          },
        }
      );
    } else {
      createTable.mutate(
        { data: { number: Number(values.number), capacity: Number(values.capacity) } },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getListTablesQueryKey() });
            toast({ title: "Table created" });
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
          <DialogTitle>{table ? `Edit Table ${table.number}` : "Add New Table"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Table Number</Label>
              <Input
                data-testid="input-table-number"
                type="number"
                min="1"
                {...register("number", { required: true })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Capacity (seats)</Label>
              <Input
                data-testid="input-table-capacity"
                type="number"
                min="1"
                {...register("capacity", { required: true })}
              />
            </div>
          </div>
          {table && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={val => setValue("status", val as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              disabled={createTable.isPending || updateTable.isPending}
              data-testid="button-save-table"
            >
              {table ? "Save Changes" : "Add Table"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── QR / URL Drawer ──────────────────────────────────────────────────────────
function TableQRPanel({
  table,
  open,
  onClose,
}: {
  table: Table | null;
  open: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  if (!table) return null;

  const portalUrl = `${window.location.origin}/portal/table/${table.number}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(portalUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Table {table.number} — Digital ID
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* QR Code Visual */}
          <div className="bg-muted rounded-xl p-6 flex flex-col items-center gap-3 text-center">
            <div className="w-36 h-36 bg-white rounded-lg border-2 border-border flex items-center justify-center relative">
              {/* Simple QR placeholder grid — purely visual */}
              <div className="grid grid-cols-7 gap-0.5 p-2">
                {Array.from({ length: 49 }, (_, i) => (
                  <div
                    key={i}
                    className={`w-3.5 h-3.5 rounded-sm ${
                      [0,1,2,3,4,5,6,7,13,14,20,21,27,28,34,35,41,42,43,44,45,46,48,15,16,17,18,19,22,30,38].includes(i)
                        ? "bg-foreground"
                        : "bg-transparent"
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-mono">Table ID: T{String(table.number).padStart(3, "0")}</p>
          </div>

          {/* Portal URL */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs">
              <Link className="h-3.5 w-3.5" />
              Customer Portal URL
            </Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={portalUrl}
                className="text-xs font-mono bg-muted/60 flex-1"
                data-testid={`input-table-url-${table.id}`}
              />
              <Button size="icon" variant="outline" onClick={copyUrl} data-testid="button-copy-url">
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Customers scan or visit this URL to place orders from Table {table.number}.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  available: { label: "Available", bg: "bg-green-100", text: "text-green-800", dot: "bg-green-500" },
  occupied:  { label: "Occupied",  bg: "bg-red-100",   text: "text-red-800",   dot: "bg-red-500"   },
  reserved:  { label: "Reserved",  bg: "bg-blue-100",  text: "text-blue-800",  dot: "bg-blue-500"  },
};

// ─── Main Tables Page ─────────────────────────────────────────────────────────
export default function Tables() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tableDialog, setTableDialog] = useState<{ open: boolean; item?: Table }>({ open: false });
  const [qrPanel, setQrPanel] = useState<{ open: boolean; item: Table | null }>({ open: false, item: null });
  const [deleteTarget, setDeleteTarget] = useState<Table | null>(null);

  const { data: tables, isLoading } = useListTables({
    query: { queryKey: getListTablesQueryKey() },
  });
  const deleteTable = useDeleteTable();

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteTable.mutate(
      { id: deleteTarget.id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListTablesQueryKey() });
          toast({ title: `Table ${deleteTarget.number} removed` });
          setDeleteTarget(null);
        },
      }
    );
  };

  const available = tables?.filter(t => t.status === "available").length ?? 0;
  const occupied  = tables?.filter(t => t.status === "occupied").length ?? 0;
  const reserved  = tables?.filter(t => t.status === "reserved").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Tables</h1>
          <p className="text-muted-foreground mt-1">Manage dining areas. Each table has a unique customer portal link.</p>
        </div>
        <Button
          onClick={() => setTableDialog({ open: true })}
          data-testid="button-add-table"
        >
          <Plus className="h-4 w-4 mr-1.5" /> Add Table
        </Button>
      </div>

      {/* Summary */}
      <div className="flex gap-4 flex-wrap">
        {[
          { label: "Available", count: available, color: "text-green-700 bg-green-100" },
          { label: "Occupied",  count: occupied,  color: "text-red-700 bg-red-100"   },
          { label: "Reserved",  count: reserved,  color: "text-blue-700 bg-blue-100" },
        ].map(s => (
          <div key={s.label} className={`px-4 py-2 rounded-lg text-sm font-medium ${s.color}`}>
            {s.count} {s.label}
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-44 w-full" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {tables?.map(table => {
            const sc = STATUS_CONFIG[table.status] ?? STATUS_CONFIG.available;
            return (
              <Card
                key={table.id}
                className={`group relative transition-shadow hover:shadow-md ${table.status === "occupied" ? "border-red-200" : table.status === "reserved" ? "border-blue-200" : ""}`}
                data-testid={`card-table-${table.number}`}
              >
                <CardContent className="p-4 flex flex-col items-center gap-3">
                  {/* Table number circle */}
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-2xl border-2 ${
                    table.status === "occupied" ? "border-red-300 bg-red-50 text-red-800" :
                    table.status === "reserved" ? "border-blue-300 bg-blue-50 text-blue-800" :
                    "border-primary/30 bg-primary/10 text-primary"
                  }`}>
                    {table.number}
                  </div>

                  {/* Capacity */}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {table.capacity} seats
                  </div>

                  {/* Status badge */}
                  <Badge
                    variant="outline"
                    className={`w-full justify-center text-xs gap-1.5 ${sc.bg} ${sc.text} border-0`}
                    data-testid={`badge-table-status-${table.id}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                    {sc.label}
                  </Badge>

                  {/* Live timer for occupied tables */}
                  {table.status === "occupied" && (table as any).occupiedSince && (
                    <ElapsedTimer since={(table as any).occupiedSince} />
                  )}

                  {/* Digital ID */}
                  <p className="text-xs font-mono text-muted-foreground">T{String(table.number).padStart(3, "0")}</p>

                  {/* Action buttons (visible on hover) */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity w-full">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7 flex-1"
                          onClick={() => setQrPanel({ open: true, item: table })}
                          data-testid={`button-qr-table-${table.id}`}
                        >
                          <QrCode className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>View QR / Portal URL</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7 flex-1"
                          onClick={() => setTableDialog({ open: true, item: table })}
                          data-testid={`button-edit-table-${table.id}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 flex-1 hover:text-destructive"
                          onClick={() => setDeleteTarget(table)}
                          data-testid={`button-delete-table-${table.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <TableDialog
        open={tableDialog.open}
        table={tableDialog.item}
        onClose={() => setTableDialog({ open: false })}
      />
      <TableQRPanel
        open={qrPanel.open}
        table={qrPanel.item}
        onClose={() => setQrPanel({ open: false, item: null })}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Table {deleteTarget?.number}</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove Table {deleteTarget?.number} ({deleteTarget?.capacity} seats). This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-table"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
