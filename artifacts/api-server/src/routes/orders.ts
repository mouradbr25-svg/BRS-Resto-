import { Router, type IRouter } from "express";
import { db, ordersTable, orderItemsTable, menuItemsTable, tablesTable, customersTable } from "@workspace/db";
import { eq, inArray, desc } from "drizzle-orm";
import { computeLoyaltyTier } from "./customers";

const router: IRouter = Router();

async function buildOrderResponse(order: typeof ordersTable.$inferSelect) {
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  const [table] = await db.select().from(tablesTable).where(eq(tablesTable.id, order.tableId));
  let customerName: string | null = null;
  if (order.customerId) {
    const [cust] = await db.select().from(customersTable).where(eq(customersTable.id, order.customerId));
    customerName = cust?.name ?? null;
  }
  return {
    id: order.id,
    tableId: order.tableId,
    tableNumber: table?.number ?? null,
    customerId: order.customerId,
    customerName,
    status: order.status,
    totalAmount: parseFloat(order.totalAmount),
    discountPercent: parseFloat(order.discountPercent),
    finalAmount: parseFloat(order.finalAmount),
    items: items.map(it => ({
      id: it.id,
      menuItemId: it.menuItemId,
      menuItemName: "",
      quantity: it.quantity,
      unitPrice: parseFloat(it.unitPrice),
      subtotal: parseFloat(it.subtotal),
      notes: it.notes,
    })),
    notes: order.notes,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

router.get("/orders/active", async (_req, res): Promise<void> => {
  const orders = await db.select().from(ordersTable)
    .where(inArray(ordersTable.status, ["pending", "preparing"]))
    .orderBy(desc(ordersTable.createdAt));
  const results = await Promise.all(orders.map(buildOrderResponse));
  res.json(results);
});

router.get("/orders", async (req, res): Promise<void> => {
  const { status, tableId } = req.query;
  let query = db.select().from(ordersTable);
  const conditions: any[] = [];
  if (status) conditions.push(eq(ordersTable.status, status as string));
  if (tableId) conditions.push(eq(ordersTable.tableId, parseInt(tableId as string, 10)));

  const orders = await db.select().from(ordersTable)
    .where(conditions.length > 0 ? conditions[0] : undefined)
    .orderBy(desc(ordersTable.createdAt));

  const results = await Promise.all(orders.map(buildOrderResponse));
  res.json(results);
});

router.post("/orders", async (req, res): Promise<void> => {
  const { tableId, customerId, items, notes, discountPercent } = req.body;
  if (!tableId || !items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "tableId and items are required" });
    return;
  }

  let totalAmount = 0;
  const menuItemIds = items.map((i: any) => i.menuItemId);
  const menuItems = await db.select().from(menuItemsTable).where(inArray(menuItemsTable.id, menuItemIds));
  const menuItemMap = new Map(menuItems.map(m => [m.id, m]));

  for (const item of items) {
    const mi = menuItemMap.get(item.menuItemId);
    if (!mi) {
      res.status(400).json({ error: `Menu item ${item.menuItemId} not found` });
      return;
    }
    totalAmount += parseFloat(mi.price) * item.quantity;
  }

  const discount = discountPercent ?? 0;
  const finalAmount = totalAmount * (1 - discount / 100);

  const [order] = await db.insert(ordersTable).values({
    tableId,
    customerId: customerId ?? null,
    notes,
    totalAmount: String(totalAmount),
    discountPercent: String(discount),
    finalAmount: String(finalAmount),
    status: "pending",
  }).returning();

  for (const item of items) {
    const mi = menuItemMap.get(item.menuItemId)!;
    const unitPrice = parseFloat(mi.price);
    const subtotal = unitPrice * item.quantity;
    await db.insert(orderItemsTable).values({
      orderId: order.id,
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      unitPrice: String(unitPrice),
      subtotal: String(subtotal),
      notes: item.notes ?? null,
    });
  }

  // Mark table as occupied
  await db.update(tablesTable).set({ status: "occupied", currentOrderId: order.id }).where(eq(tablesTable.id, tableId));

  const result = await buildOrderResponse(order);
  res.status(201).json(result);
});

router.get("/orders/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(await buildOrderResponse(order));
});

router.patch("/orders/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { status } = req.body;
  if (!status) {
    res.status(400).json({ error: "status is required" });
    return;
  }

  const [order] = await db.update(ordersTable).set({ status }).where(eq(ordersTable.id, id)).returning();
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  // If completed/cancelled, free the table and update customer stats
  if (status === "completed" || status === "cancelled") {
    await db.update(tablesTable)
      .set({ status: "available", currentOrderId: null })
      .where(eq(tablesTable.currentOrderId, id));

    if (status === "completed" && order.customerId) {
      const [cust] = await db.select().from(customersTable).where(eq(customersTable.id, order.customerId));
      if (cust) {
        const newTotal = parseFloat(cust.totalSpent) + parseFloat(order.finalAmount);
        const newOrders = cust.totalOrders + 1;
        const tier = computeLoyaltyTier(newTotal);
        await db.update(customersTable).set({
          totalOrders: newOrders,
          totalSpent: String(newTotal),
          isFirstVisit: false,
          loyaltyTier: tier,
        }).where(eq(customersTable.id, order.customerId));
      }
    }
  }

  res.json(await buildOrderResponse(order));
});

export default router;
