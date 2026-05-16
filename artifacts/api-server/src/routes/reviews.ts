import { Router, type IRouter } from "express";
import { db, reviewsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/reviews", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(reviewsTable)
    .orderBy(desc(reviewsTable.createdAt));
  res.json(rows);
});

router.post("/reviews", async (req, res): Promise<void> => {
  const { orderId, customerId, customerName, rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    res.status(400).json({ error: "rating must be 1-5" });
    return;
  }
  const [review] = await db
    .insert(reviewsTable)
    .values({
      orderId: orderId ?? null,
      customerId: customerId ?? null,
      customerName: customerName ?? null,
      rating,
      comment: comment ?? null,
    })
    .returning();
  res.status(201).json(review);
});

router.patch("/reviews/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { isPublic } = req.body;
  const [review] = await db
    .update(reviewsTable)
    .set({ isPublic: isPublic ?? true })
    .where(eq(reviewsTable.id, id))
    .returning();
  if (!review) {
    res.status(404).json({ error: "Review not found" });
    return;
  }
  res.json(review);
});

router.delete("/reviews/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(reviewsTable).where(eq(reviewsTable.id, id));
  res.sendStatus(204);
});

export default router;
