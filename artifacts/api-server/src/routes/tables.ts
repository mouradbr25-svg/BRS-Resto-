import { Router, type IRouter } from "express";
import { db, tablesTable, ordersTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

const router: IRouter = Router();

router.get("/tables", async (_req, res): Promise<void> => {
  const tables = await db.select().from(tablesTable).orderBy(tablesTable.number);

  const occupiedIds = tables.filter(t => t.currentOrderId != null).map(t => t.currentOrderId as number);
  const orderMap = new Map<number, string>();
  if (occupiedIds.length > 0) {
    const orders = await db
      .select({ id: ordersTable.id, createdAt: ordersTable.createdAt })
      .from(ordersTable)
      .where(inArray(ordersTable.id, occupiedIds));
    orders.forEach(o => orderMap.set(o.id, o.createdAt.toISOString()));
  }

  res.json(tables.map(t => ({
    id: t.id,
    number: t.number,
    capacity: t.capacity,
    status: t.status,
    qrCode: t.qrCode,
    currentOrderId: t.currentOrderId,
    occupiedSince: t.currentOrderId != null ? (orderMap.get(t.currentOrderId) ?? null) : null,
    createdAt: t.createdAt,
  })));
});

router.post("/tables", async (req, res): Promise<void> => {
  const { number, capacity } = req.body;
  if (!number || !capacity) {
    res.status(400).json({ error: "number and capacity are required" });
    return;
  }
  const qrCode = `https://brs-resto.app/table/${number}`;
  const [table] = await db.insert(tablesTable).values({ number, capacity, qrCode }).returning();
  res.status(201).json({ ...table, qrCode: table.qrCode });
});

router.get("/tables/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [table] = await db.select().from(tablesTable).where(eq(tablesTable.id, id));
  if (!table) {
    res.status(404).json({ error: "Table not found" });
    return;
  }
  res.json(table);
});

router.patch("/tables/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { number, capacity, status } = req.body;
  const updates: Record<string, unknown> = {};
  if (number != null) updates.number = number;
  if (capacity != null) updates.capacity = capacity;
  if (status != null) updates.status = status;

  const [table] = await db.update(tablesTable).set(updates).where(eq(tablesTable.id, id)).returning();
  if (!table) {
    res.status(404).json({ error: "Table not found" });
    return;
  }
  res.json(table);
});

router.delete("/tables/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [table] = await db.delete(tablesTable).where(eq(tablesTable.id, id)).returning();
  if (!table) {
    res.status(404).json({ error: "Table not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
