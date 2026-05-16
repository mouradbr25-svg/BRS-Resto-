import { Router, type IRouter } from "express";
import { db, ingredientsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function formatIngredient(i: typeof ingredientsTable.$inferSelect) {
  const current = parseFloat(i.currentStock);
  const max = parseFloat(i.maxStock);
  const pct = max > 0 ? Math.round((current / max) * 100) : 0;
  return {
    id: i.id,
    name: i.name,
    currentStock: current,
    maxStock: max,
    unit: i.unit,
    stockPercentage: pct,
    isLow: pct <= 50,
    lastRefillDate: i.lastRefillDate,
    createdAt: i.createdAt,
  };
}

router.get("/ingredients", async (_req, res): Promise<void> => {
  const ingredients = await db.select().from(ingredientsTable).orderBy(ingredientsTable.name);
  res.json(ingredients.map(formatIngredient));
});

router.post("/ingredients", async (req, res): Promise<void> => {
  const { name, currentStock, maxStock, unit } = req.body;
  if (!name || currentStock == null || maxStock == null || !unit) {
    res.status(400).json({ error: "name, currentStock, maxStock, unit are required" });
    return;
  }
  const [ingredient] = await db.insert(ingredientsTable).values({
    name,
    currentStock: String(currentStock),
    maxStock: String(maxStock),
    unit,
  }).returning();
  res.status(201).json(formatIngredient(ingredient));
});

router.patch("/ingredients/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { name, currentStock, maxStock, unit } = req.body;
  const updates: Record<string, unknown> = {};
  if (name != null) updates.name = name;
  if (currentStock != null) updates.currentStock = String(currentStock);
  if (maxStock != null) updates.maxStock = String(maxStock);
  if (unit != null) updates.unit = unit;

  const [ingredient] = await db.update(ingredientsTable).set(updates).where(eq(ingredientsTable.id, id)).returning();
  if (!ingredient) {
    res.status(404).json({ error: "Ingredient not found" });
    return;
  }
  res.json(formatIngredient(ingredient));
});

router.delete("/ingredients/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [ingredient] = await db.delete(ingredientsTable).where(eq(ingredientsTable.id, id)).returning();
  if (!ingredient) {
    res.status(404).json({ error: "Ingredient not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/ingredients/low-stock", async (_req, res): Promise<void> => {
  const ingredients = await db.select().from(ingredientsTable);
  const low = ingredients
    .map(formatIngredient)
    .filter(i => i.isLow);
  res.json(low);
});

router.post("/ingredients/refill", async (_req, res): Promise<void> => {
  const ingredients = await db.select().from(ingredientsTable);
  const now = new Date();
  let refilled = 0;
  for (const ing of ingredients) {
    await db.update(ingredientsTable)
      .set({ currentStock: ing.maxStock, lastRefillDate: now })
      .where(eq(ingredientsTable.id, ing.id));
    refilled++;
  }
  res.json({ refilled, totalItems: ingredients.length, message: `Refilled ${refilled} ingredients to maximum stock` });
});

export default router;
