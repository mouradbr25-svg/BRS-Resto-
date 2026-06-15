import { Router, type IRouter } from "express";
import { db, ordersTable, orderItemsTable, menuItemsTable, tablesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/public/track/:orderId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
  const orderId = parseInt(raw, 10);
  if (isNaN(orderId)) {
    res.status(400).json({ error: "Invalid order ID" });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

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
    (max, item) => Math.max(max, (item.prepTimeMinutes ?? 15) * item.quantity),
    0
  );

  res.json({
    id: order.id,
    status: order.status,
    tableNumber: table?.number ?? null,
    createdAt: order.createdAt,
    estimatedMinutes,
    items: rawItems.map(i => ({
      name: i.menuItemName ?? "Unknown",
      nameAr: i.menuItemNameAr ?? null,
      quantity: i.quantity,
    })),
  });
});

export default router;
