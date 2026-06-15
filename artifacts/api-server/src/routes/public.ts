import { Router, type IRouter } from "express";
import {
  db, ordersTable, orderItemsTable, menuItemsTable,
  tablesTable, categoriesTable, quizQuestionsTable,
} from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";

const router: IRouter = Router();

// ─── Order Tracker (existing) ──────────────────────────────────────────────────
router.get("/public/track/:orderId", async (req, res): Promise<void> => {
  const orderId = parseInt(req.params.orderId as string, 10);
  if (isNaN(orderId)) { res.status(400).json({ error: "Invalid order ID" }); return; }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const [table] = await db.select().from(tablesTable).where(eq(tablesTable.id, order.tableId));

  const rawItems = await db
    .select({
      menuItemName: menuItemsTable.name,
      menuItemNameAr: menuItemsTable.nameAr,
      quantity: orderItemsTable.quantity,
      prepTimeMinutes: menuItemsTable.prepTimeMinutes,
    })
    .from(orderItemsTable)
    .leftJoin(menuItemsTable, eq(orderItemsTable.menuItemId, menuItemsTable.id))
    .where(eq(orderItemsTable.orderId, orderId));

  const estimatedMinutes = rawItems.reduce(
    (max, item) => Math.max(max, (item.prepTimeMinutes ?? 15) * item.quantity), 0
  );

  res.json({
    id: order.id,
    status: order.status,
    tableNumber: table?.number ?? null,
    createdAt: order.createdAt,
    estimatedMinutes,
    guestName: order.notes?.startsWith("Client: ") ? order.notes.slice(8) : null,
    items: rawItems.map(i => ({
      name: i.menuItemName ?? "Unknown",
      nameAr: i.menuItemNameAr ?? null,
      quantity: i.quantity,
    })),
  });
});

// ─── Table Info ────────────────────────────────────────────────────────────────
router.get("/public/table/:tableId", async (req, res): Promise<void> => {
  const tableId = parseInt(req.params.tableId as string, 10);
  if (isNaN(tableId)) { res.status(400).json({ error: "Invalid table ID" }); return; }

  const [table] = await db.select().from(tablesTable).where(eq(tablesTable.id, tableId));
  if (!table) { res.status(404).json({ error: "Table not found" }); return; }

  res.json({ id: table.id, number: table.number, capacity: table.capacity, status: table.status });
});

// ─── Public Menu ───────────────────────────────────────────────────────────────
router.get("/public/menu", async (_req, res): Promise<void> => {
  const [cats, rawItems] = await Promise.all([
    db.select().from(categoriesTable).orderBy(categoriesTable.name),
    db.select({
      id: menuItemsTable.id,
      name: menuItemsTable.name,
      nameAr: menuItemsTable.nameAr,
      description: menuItemsTable.description,
      price: menuItemsTable.price,
      categoryId: menuItemsTable.categoryId,
      categoryName: categoriesTable.name,
      imageUrl: menuItemsTable.imageUrl,
      prepTimeMinutes: menuItemsTable.prepTimeMinutes,
      isSpicy: menuItemsTable.isSpicy,
      isVegan: menuItemsTable.isVegan,
      isGlutenFree: menuItemsTable.isGlutenFree,
    })
    .from(menuItemsTable)
    .leftJoin(categoriesTable, eq(menuItemsTable.categoryId, categoriesTable.id))
    .where(eq(menuItemsTable.available, true))
    .orderBy(categoriesTable.name, menuItemsTable.name),
  ]);

  res.json({
    categories: cats,
    items: rawItems.map(i => ({ ...i, price: parseFloat(i.price) })),
  });
});

// ─── Public Quiz Questions ─────────────────────────────────────────────────────
router.get("/public/quiz", async (_req, res): Promise<void> => {
  const questions = await db
    .select({ id: quizQuestionsTable.id, question: quizQuestionsTable.question, options: quizQuestionsTable.options, correctAnswer: quizQuestionsTable.correctAnswer })
    .from(quizQuestionsTable)
    .where(eq(quizQuestionsTable.active, true));
  res.json(questions);
});

// ─── Create Guest Order ────────────────────────────────────────────────────────
router.post("/public/orders", async (req, res): Promise<void> => {
  const { tableId, guestName, items } = req.body as {
    tableId: number;
    guestName?: string;
    items: { menuItemId: number; quantity: number; notes?: string }[];
  };

  if (!tableId || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "tableId and items are required" });
    return;
  }

  const [table] = await db.select().from(tablesTable).where(eq(tablesTable.id, tableId));
  if (!table) { res.status(404).json({ error: "Table not found" }); return; }

  const menuIds = items.map(i => i.menuItemId);
  const menuRows = await db.select().from(menuItemsTable)
    .where(and(inArray(menuItemsTable.id, menuIds), eq(menuItemsTable.available, true)));
  const menuMap = new Map(menuRows.map(m => [m.id, m]));

  for (const item of items) {
    if (!menuMap.has(item.menuItemId)) {
      res.status(400).json({ error: `Item ${item.menuItemId} not available` });
      return;
    }
  }

  let total = 0;
  for (const item of items) {
    total += parseFloat(menuMap.get(item.menuItemId)!.price) * item.quantity;
  }

  const [order] = await db.insert(ordersTable).values({
    tableId,
    customerId: null,
    status: "pending",
    totalAmount: String(total.toFixed(2)),
    discountPercent: "0",
    finalAmount: String(total.toFixed(2)),
    notes: guestName ? `Client: ${guestName.trim()}` : null,
  }).returning();

  for (const item of items) {
    const mi = menuMap.get(item.menuItemId)!;
    const unitPrice = parseFloat(mi.price);
    const subtotal = unitPrice * item.quantity;
    await db.insert(orderItemsTable).values({
      orderId: order.id,
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      unitPrice: String(unitPrice.toFixed(2)),
      subtotal: String(subtotal.toFixed(2)),
      notes: item.notes ?? null,
    });
  }

  await db.update(tablesTable).set({ status: "occupied" }).where(eq(tablesTable.id, tableId));

  res.status(201).json({ orderId: order.id });
});

export default router;
