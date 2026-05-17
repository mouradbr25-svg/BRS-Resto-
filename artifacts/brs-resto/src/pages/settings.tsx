import { useState } from "react";
import {
  useListMenuItems, getListMenuItemsQueryKey,
  useUpdateMenuItem,
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
import { useToast } from "@/hooks/use-toast";
import { formatDZD } from "@/lib/format";
import { DollarSign, Lock, Pencil, Check, X } from "lucide-react";

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
          toast({ title: `${item.name} updated to ${formatDZD(parsed)}` });
          setEditing(false);
        },
      }
    );
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.name}</p>
        {item.nameAr && <p className="text-xs text-muted-foreground" dir="rtl">{item.nameAr}</p>}
        <Badge variant="outline" className="text-xs mt-0.5 px-1.5 py-0">{item.categoryName}</Badge>
      </div>
      <div className="flex items-center gap-2 ml-3">
        {editing ? (
          <>
            <Input
              type="number"
              min="0"
              step="50"
              className="w-28 h-8 text-sm"
              value={price}
              onChange={e => setPrice(e.target.value)}
              autoFocus
              onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
            />
            <span className="text-xs text-muted-foreground">DZD</span>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={handleSave} disabled={updateItem.isPending}>
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => { setEditing(false); setPrice(String(item.price)); }}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <>
            <span className="font-bold text-sm text-primary">{formatDZD(item.price)}</span>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setEditing(true)}
              data-testid={`button-edit-price-${item.id}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Prices Tab ───────────────────────────────────────────────────────────────
function PricesTab() {
  const { data: menuItems, isLoading } = useListMenuItems(
    {},
    { query: { queryKey: getListMenuItemsQueryKey({}) } }
  );
  const [search, setSearch] = useState("");

  const filtered = menuItems?.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.categoryName ?? "").toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search dishes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs h-9"
        />
        <p className="text-sm text-muted-foreground">{filtered.length} items</p>
      </div>
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map(item => <PriceRow key={item.id} item={item} />)}
              {filtered.length === 0 && (
                <p className="p-8 text-center text-muted-foreground text-sm">No items match your search.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Credentials Tab ──────────────────────────────────────────────────────────
function CredentialCard({ userId, username, role }: { userId: number; username: string; role: string }) {
  const { toast } = useToast();
  const changePwd = useChangePassword();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ newPassword: string; confirm: string }>();

  const onSubmit = (values: { newPassword: string; confirm: string }) => {
    if (values.newPassword !== values.confirm) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (values.newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    changePwd.mutate(
      { data: { userId, newPassword: values.newPassword } },
      {
        onSuccess: () => {
          toast({ title: `Password updated for ${username}` });
          reset();
        },
        onError: () => {
          toast({ title: "Failed to update password", variant: "destructive" });
        },
      }
    );
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
              <Label>New Password</Label>
              <Input
                type="password"
                {...register("newPassword", { required: true, minLength: 6 })}
                placeholder="Min. 6 characters"
                className="h-9"
                data-testid={`input-password-${username}`}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Confirm Password</Label>
              <Input
                type="password"
                {...register("confirm", { required: true })}
                placeholder="Repeat password"
                className="h-9"
              />
            </div>
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={changePwd.isPending}
            data-testid={`button-change-password-${username}`}
          >
            <Lock className="h-3.5 w-3.5 mr-1.5" />
            {changePwd.isPending ? "Updating..." : "Change Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function CredentialsTab() {
  const accounts = [
    { userId: 1, username: "owner", role: "owner" },
    { userId: 2, username: "receptionist", role: "receptionist" },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Update login passwords for staff accounts. Changes take effect on next login.
      </p>
      {accounts.map(acc => (
        <CredentialCard key={acc.userId} {...acc} />
      ))}
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Global configuration — dish pricing, quiz questions, and access credentials.</p>
      </div>

      <Tabs defaultValue="prices">
        <TabsList className="mb-4">
          <TabsTrigger value="prices">
            <DollarSign className="h-4 w-4 mr-2" /> Dish Prices
          </TabsTrigger>
          <TabsTrigger value="credentials">
            <Lock className="h-4 w-4 mr-2" /> Credentials
          </TabsTrigger>
        </TabsList>

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
