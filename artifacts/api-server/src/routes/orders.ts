import { Router, type IRouter } from "express";
import {
  db,
  ordersTable,
  orderItemsTable,
  menuItemsTable,
  tablesTable,
  customersTable,
  menuItemIngredientsTable,
  ingredientsTable,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { computeLoyaltyTier } from "./customers";

const router: IRouter = Router();

// ID of the Comptoir virtual table (number=0) for walk-in orders
async function getComptoirTableId(): Promise<number | null> {
  const [t] = await db.select().from(tablesTable).where(eq(tablesTable.number, 0));
  return t?.id ?? null;
}

async function buildOrderResponse(order: typeof ordersTable.$inferSelect) {
  const rawItems = await db
    .select({
      id: orderItemsTable.id,
      orderId: orderItemsTable.orderId,
      menuItemId: orderItemsTable.menuItemId,
      menuItemName: menuItemsTable.name,
      prepTimeMinutes: menuItemsTable.prepTimeMinutes,
      quantity: orderItemsTable.quantity,
      unitPrice: orderItemsTable.unitPrice,
      subtotal: orderItemsTable.subtotal,
      notes: orderItemsTable.notes,
    })
    .from(orderItemsTable)
    .leftJoin(menuItemsTable, eq(orderItemsTable.menuItemId, menuItemsTable.id))
    .where(eq(orderItemsTable.orderId, order.id));

  const [table] = await db.select().from(tablesTable).where(eq(tablesTable.id, order.tableId));
  let customerName: string | null = null;
  if (order.customerId) {
    const [cust] = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.id, order.customerId));
    customerName = cust?.name ?? null;
  } else if (order.notes) {
    const clientPart = order.notes.split(" — ").find(p => p.startsWith("Client: "));
    if (clientPart) customerName = clientPart.replace("Client: ", "").trim();
  }

  const isWalkin = order.notes?.includes("Vente directe") || table?.number === 0;

  return {
    id: order.id,
    tableId: order.tableId,
    tableNumber: table?.number === 0 ? null : (table?.number ?? null),
    customerId: order.customerId,
    customerName,
    isWalkin: isWalkin ?? false,
    status: order.status,
    totalAmount: parseFloat(order.totalAmount),
    discountPercent: parseFloat(order.discountPercent),
    finalAmount: parseFloat(order.finalAmount),
    items: rawItems.map(it => ({
      id: it.id,
      menuItemId: it.menuItemId,
      menuItemName: it.menuItemName ?? "",
      prepTimeMinutes: it.prepTimeMinutes ?? 15,
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

async function deductIngredients(orderId: number): Promise<void> {
  const orderItems = await db
    .select()
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, orderId));

  for (const item of orderItems) {
    const itemIngredients = await db
      .select()
      .from(menuItemIngredientsTable)
      .where(eq(menuItemIngredientsTable.menuItemId, item.menuItemId));

    for (const ing of itemIngredients) {
      const [ingredient] = await db
        .select()
        .from(ingredientsTable)
        .where(eq(ingredientsTable.id, ing.ingredientId));

      if (ingredient) {
        const deduction = parseFloat(ing.quantity) * item.quantity;
        const newStock = Math.max(0, parseFloat(ingredient.currentStock) - deduction);
        await db
          .update(ingredientsTable)
          .set({ currentStock: String(newStock) })
          .where(eq(ingredientsTable.id, ing.ingredientId));
      }
    }
  }
}

router.get("/orders/active", async (_req, res): Promise<void> => {
  const orders = await db
    .select()
    .from(ordersTable)
    .where(inArray(ordersTable.status, ["pending", "preparing"]));
  orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const results = await Promise.all(orders.map(buildOrderResponse));
  res.json(results);
});

router.get("/orders", async (req, res): Promise<void> => {
  const { status, tableId } = req.query;

  let orders = await db.select().from(ordersTable);

  if (status && typeof status === "string") {
    orders = orders.filter(o => o.status === status);
  }
  if (tableId) {
    const tid = parseInt(tableId as string, 10);
    orders = orders.filter(o => o.tableId === tid);
  }

  orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const results = await Promise.all(orders.map(buildOrderResponse));
  res.json(results);
});

router.post("/orders", async (req, res): Promise<void> => {
  const { tableId: rawTableId, customerId, items, notes, discountPercent } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "items are required" });
    return;
  }

  // Walk-in orders use the Comptoir virtual table (number=0)
  const isWalkin = !rawTableId || notes?.includes("Vente directe");
  let tableId: number;
  if (isWalkin) {
    const comptoirId = await getComptoirTableId();
    if (!comptoirId) {
      res.status(500).json({ error: "Comptoir table not found" });
      return;
    }
    tableId = comptoirId;
  } else {
    tableId = rawTableId;
  }

  let totalAmount = 0;
  const menuItemIds = items.map((i: { menuItemId: number }) => i.menuItemId);
  const menuItems = await db
    .select()
    .from(menuItemsTable)
    .where(inArray(menuItemsTable.id, menuItemIds));
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

  const [order] = await db
    .insert(ordersTable)
    .values({
      tableId,
      customerId: customerId ?? null,
      notes,
      totalAmount: String(totalAmount),
      discountPercent: String(discount),
      finalAmount: String(finalAmount),
      status: "pending",
    })
    .returning();

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

  // Only mark real tables as occupied (not Comptoir)
  if (!isWalkin) {
    await db
      .update(tablesTable)
      .set({ status: "occupied", currentOrderId: order.id })
      .where(eq(tablesTable.id, tableId));
  }

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

  const [existingOrder] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!existingOrder) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const [order] = await db
    .update(ordersTable)
    .set({ status })
    .where(eq(ordersTable.id, id))
    .returning();

  // Deduct ingredients when order moves to "preparing" (accepted by kitchen)
  if (status === "preparing" && existingOrder.status !== "preparing") {
    await deductIngredients(id);
  }

  // On "completed" or "cancelled": free real tables, update customer stats
  if (status === "completed" || status === "cancelled") {
    // Free table (for real tables only — Comptoir table stays always available)
    const comptoirId = await getComptoirTableId();
    if (existingOrder.tableId !== comptoirId) {
      await db
        .update(tablesTable)
        .set({ status: "available", currentOrderId: null })
        .where(eq(tablesTable.currentOrderId, id));
    }

    if (status === "completed" && order.customerId) {
      const [cust] = await db
        .select()
        .from(customersTable)
        .where(eq(customersTable.id, order.customerId));
      if (cust) {
        const newTotal = parseFloat(cust.totalSpent) + parseFloat(order.finalAmount);
        const newOrders = cust.totalOrders + 1;
        const tier = computeLoyaltyTier(newTotal);
        await db
          .update(customersTable)
          .set({
            totalOrders: newOrders,
            totalSpent: String(newTotal),
            isFirstVisit: false,
            loyaltyTier: tier,
          })
          .where(eq(customersTable.id, order.customerId));
      }
    }
  }

  res.json(await buildOrderResponse(order));
});

router.post("/orders/:id/transfer", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { newTableId } = req.body;
  if (!newTableId) {
    res.status(400).json({ error: "newTableId is required" });
    return;
  }

  const [existingOrder] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!existingOrder) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const oldTableId = existingOrder.tableId;

  const [order] = await db
    .update(ordersTable)
    .set({ tableId: newTableId })
    .where(eq(ordersTable.id, id))
    .returning();

  // Free old table (if not Comptoir)
  const comptoirId = await getComptoirTableId();
  if (oldTableId !== comptoirId) {
    await db
      .update(tablesTable)
      .set({ status: "available", currentOrderId: null })
      .where(eq(tablesTable.id, oldTableId));
  }

  // Occupy new table
  await db
    .update(tablesTable)
    .set({ status: "occupied", currentOrderId: id })
    .where(eq(tablesTable.id, newTableId));

  res.json(await buildOrderResponse(order));
});

export default router;
