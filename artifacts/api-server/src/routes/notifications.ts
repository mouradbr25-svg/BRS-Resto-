import { Router, type IRouter } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/notifications", async (req, res): Promise<void> => {
  const { unreadOnly } = req.query;
  let rows = await db
    .select()
    .from(notificationsTable)
    .orderBy(desc(notificationsTable.createdAt));

  if (unreadOnly === "true") {
    rows = rows.filter(n => !n.read);
  }

  res.json(rows);
});

router.post("/notifications", async (req, res): Promise<void> => {
  const { tableId, tableNumber, type, message } = req.body;
  if (!tableId || !tableNumber || !type) {
    res.status(400).json({ error: "tableId, tableNumber and type are required" });
    return;
  }
  const [notif] = await db
    .insert(notificationsTable)
    .values({ tableId, tableNumber, type, message: message ?? null })
    .returning();
  res.status(201).json(notif);
});

// mark-all-read MUST be before /:id
router.post("/notifications/mark-all-read", async (_req, res): Promise<void> => {
  const rows = await db
    .update(notificationsTable)
    .set({ read: true })
    .returning();
  res.json({ updated: rows.length });
});

router.patch("/notifications/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [notif] = await db
    .update(notificationsTable)
    .set({ read: true })
    .where(eq(notificationsTable.id, id))
    .returning();
  if (!notif) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }
  res.json(notif);
});

router.delete("/notifications/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(notificationsTable).where(eq(notificationsTable.id, id));
  res.sendStatus(204);
});

export default router;
