import { Router, type IRouter } from "express";
import { db, ordersTable, customersTable, tablesTable, ingredientsTable, orderItemsTable, menuItemsTable } from "@workspace/db";
import { eq, sql, gte, and, inArray } from "drizzle-orm";

const router: IRouter = Router();

router.get("/analytics/dashboard", async (_req, res): Promise<void> => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const allOrders = await db.select().from(ordersTable);
  const completedOrders = allOrders.filter(o => o.status === "completed");

  const todayOrders = completedOrders.filter(o => new Date(o.createdAt) >= startOfDay);
  const weekOrders = completedOrders.filter(o => new Date(o.createdAt) >= startOfWeek);
  const monthOrders = completedOrders.filter(o => new Date(o.createdAt) >= startOfMonth);

  const todayRevenue = todayOrders.reduce((sum, o) => sum + parseFloat(o.finalAmount), 0);
  const weekRevenue = weekOrders.reduce((sum, o) => sum + parseFloat(o.finalAmount), 0);
  const monthRevenue = monthOrders.reduce((sum, o) => sum + parseFloat(o.finalAmount), 0);

  // Today's all orders (not cancelled)
  const todayAllOrders = allOrders.filter(o => new Date(o.createdAt) >= startOfDay && o.status !== "cancelled");
  const todayOrdersCount = todayAllOrders.length;
  // Today's customers: unique registered + walk-in orders
  const todayRegisteredCustomers = new Set(todayAllOrders.filter(o => o.customerId).map(o => o.customerId));
  const todayWalkinCount = todayAllOrders.filter(o => !o.customerId).length;
  const todayCustomersCount = todayRegisteredCustomers.size + todayWalkinCount;

  const activeOrders = allOrders.filter(o => o.status === "pending" || o.status === "preparing").length;
  const unpaidCount = allOrders.filter(o => o.status === "unpaid").length;
  const avgOrderValue = completedOrders.length > 0
    ? completedOrders.reduce((sum, o) => sum + parseFloat(o.finalAmount), 0) / completedOrders.length
    : 0;

  const customers = await db.select().from(customersTable);
  const tables = await db.select().from(tablesTable);
  const ingredients = await db.select().from(ingredientsTable);

  const tablesOccupied = tables.filter(t => t.status === "occupied").length;
  const lowStockCount = ingredients.filter(i => {
    const pct = parseFloat(i.maxStock) > 0 ? (parseFloat(i.currentStock) / parseFloat(i.maxStock)) * 100 : 0;
    return pct <= 50;
  }).length;

  res.json({
    todayRevenue,
    weekRevenue,
    monthRevenue,
    totalOrders: allOrders.length,
    todayOrdersCount,
    todayCustomersCount,
    activeOrders,
    unpaidCount,
    totalCustomers: customers.length,
    lowStockCount,
    avgOrderValue,
    tablesOccupied,
    totalTables: tables.length,
  });
});

router.get("/analytics/revenue", async (req, res): Promise<void> => {
  const period = (req.query.period as string) || "week";
  const now = new Date();
  const points: { label: string; revenue: number; orders: number }[] = [];

  if (period === "day") {
    for (let h = 0; h < 24; h++) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h + 1);
      const orders = await db.select().from(ordersTable)
        .where(and(eq(ordersTable.status, "completed"), gte(ordersTable.createdAt, start)));
      const filtered = orders.filter(o => new Date(o.createdAt) < end);
      points.push({
        label: `${h}:00`,
        revenue: filtered.reduce((sum, o) => sum + parseFloat(o.finalAmount), 0),
        orders: filtered.length,
      });
    }
  } else if (period === "week") {
    for (let d = 6; d >= 0; d--) {
      const day = new Date(now);
      day.setDate(now.getDate() - d);
      const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      const end = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
      const orders = await db.select().from(ordersTable)
        .where(and(eq(ordersTable.status, "completed"), gte(ordersTable.createdAt, start)));
      const filtered = orders.filter(o => new Date(o.createdAt) < end);
      const label = day.toLocaleDateString("en-DZ", { weekday: "short" });
      points.push({
        label,
        revenue: filtered.reduce((sum, o) => sum + parseFloat(o.finalAmount), 0),
        orders: filtered.length,
      });
    }
  } else {
    for (let d = 29; d >= 0; d--) {
      const day = new Date(now);
      day.setDate(now.getDate() - d);
      const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      const end = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
      const orders = await db.select().from(ordersTable)
        .where(and(eq(ordersTable.status, "completed"), gte(ordersTable.createdAt, start)));
      const filtered = orders.filter(o => new Date(o.createdAt) < end);
      points.push({
        label: `${day.getMonth() + 1}/${day.getDate()}`,
        revenue: filtered.reduce((sum, o) => sum + parseFloat(o.finalAmount), 0),
        orders: filtered.length,
      });
    }
  }

  res.json(points);
});

router.get("/analytics/top-items", async (_req, res): Promise<void> => {
  const items = await db.select().from(orderItemsTable);
  const menuItems = await db.select().from(menuItemsTable);
  const menuMap = new Map(menuItems.map(m => [m.id, m]));

  const totals = new Map<number, { name: string; totalOrdered: number; totalRevenue: number }>();
  for (const item of items) {
    const mi = menuMap.get(item.menuItemId);
    if (!mi) continue;
    const existing = totals.get(item.menuItemId) ?? { name: mi.name, totalOrdered: 0, totalRevenue: 0 };
    existing.totalOrdered += item.quantity;
    existing.totalRevenue += parseFloat(item.subtotal);
    totals.set(item.menuItemId, existing);
  }

  const result = Array.from(totals.entries())
    .map(([menuItemId, data]) => ({ menuItemId, ...data }))
    .sort((a, b) => b.totalOrdered - a.totalOrdered)
    .slice(0, 10);

  res.json(result);
});

router.get("/analytics/orders-by-status", async (_req, res): Promise<void> => {
  const orders = await db.select().from(ordersTable);
  const statusCounts = new Map<string, number>();
  const statuses = ["pending", "preparing", "served", "unpaid", "completed", "cancelled"];
  for (const s of statuses) statusCounts.set(s, 0);
  for (const o of orders) {
    statusCounts.set(o.status, (statusCounts.get(o.status) ?? 0) + 1);
  }
  res.json(Array.from(statusCounts.entries()).map(([status, count]) => ({ status, count })));
});

export default router;
