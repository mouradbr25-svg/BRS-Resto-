import { Router, type IRouter } from "express";
import { db, categoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/categories", async (_req, res): Promise<void> => {
  const categories = await db.select().from(categoriesTable).orderBy(categoriesTable.name);
  res.json(categories);
});

router.post("/categories", async (req, res): Promise<void> => {
  const { name, description, icon } = req.body;
  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const [category] = await db.insert(categoriesTable).values({ name, description, icon }).returning();
  res.status(201).json(category);
});

router.patch("/categories/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { name, description, icon } = req.body;
  const updates: Record<string, unknown> = {};
  if (name != null) updates.name = name;
  if (description != null) updates.description = description;
  if (icon != null) updates.icon = icon;

  const [category] = await db.update(categoriesTable).set(updates).where(eq(categoriesTable.id, id)).returning();
  if (!category) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  res.json(category);
});

router.delete("/categories/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [cat] = await db.delete(categoriesTable).where(eq(categoriesTable.id, id)).returning();
  if (!cat) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
