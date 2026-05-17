import { Router, type IRouter } from "express";
import { db, menuItemsTable, categoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const buildItem = (item: Record<string, any>) => ({
  ...item,
  price: parseFloat(item.price),
  categoryName: item.categoryName ?? null,
});

const DIETARY_SELECT = {
  id: menuItemsTable.id,
  name: menuItemsTable.name,
  nameAr: menuItemsTable.nameAr,
  description: menuItemsTable.description,
  price: menuItemsTable.price,
  categoryId: menuItemsTable.categoryId,
  categoryName: categoriesTable.name,
  available: menuItemsTable.available,
  imageUrl: menuItemsTable.imageUrl,
  prepTimeMinutes: menuItemsTable.prepTimeMinutes,
  isSpicy: menuItemsTable.isSpicy,
  isVegan: menuItemsTable.isVegan,
  isGlutenFree: menuItemsTable.isGlutenFree,
  createdAt: menuItemsTable.createdAt,
};

router.get("/menu-items", async (req, res): Promise<void> => {
  const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string, 10) : undefined;

  const items = await db
    .select(DIETARY_SELECT)
    .from(menuItemsTable)
    .leftJoin(categoriesTable, eq(menuItemsTable.categoryId, categoriesTable.id))
    .where(categoryId ? eq(menuItemsTable.categoryId, categoryId) : undefined)
    .orderBy(menuItemsTable.name);

  res.json(items.map(buildItem));
});

router.post("/menu-items", async (req, res): Promise<void> => {
  const { name, nameAr, description, price, categoryId, available, imageUrl,
          prepTimeMinutes, isSpicy, isVegan, isGlutenFree } = req.body;
  if (!name || price == null || !categoryId) {
    res.status(400).json({ error: "name, price, and categoryId are required" });
    return;
  }
  const [item] = await db.insert(menuItemsTable).values({
    name, nameAr, description,
    price: String(price),
    categoryId,
    available: available ?? true,
    imageUrl,
    prepTimeMinutes: prepTimeMinutes ?? 15,
    isSpicy: isSpicy ?? false,
    isVegan: isVegan ?? false,
    isGlutenFree: isGlutenFree ?? false,
  }).returning();

  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, item.categoryId));
  res.status(201).json(buildItem({ ...item, categoryName: cat?.name ?? null }));
});

router.get("/menu-items/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [item] = await db
    .select(DIETARY_SELECT)
    .from(menuItemsTable)
    .leftJoin(categoriesTable, eq(menuItemsTable.categoryId, categoriesTable.id))
    .where(eq(menuItemsTable.id, id));

  if (!item) { res.status(404).json({ error: "Menu item not found" }); return; }
  res.json(buildItem({ ...item, categoryName: item.categoryName ?? null }));
});

router.patch("/menu-items/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { name, nameAr, description, price, categoryId, available, imageUrl,
          prepTimeMinutes, isSpicy, isVegan, isGlutenFree } = req.body;
  const updates: Record<string, unknown> = {};
  if (name != null) updates.name = name;
  if (nameAr != null) updates.nameAr = nameAr;
  if (description != null) updates.description = description;
  if (price != null) updates.price = String(price);
  if (categoryId != null) updates.categoryId = categoryId;
  if (available != null) updates.available = available;
  if (imageUrl != null) updates.imageUrl = imageUrl;
  if (prepTimeMinutes != null) updates.prepTimeMinutes = prepTimeMinutes;
  if (isSpicy != null) updates.isSpicy = isSpicy;
  if (isVegan != null) updates.isVegan = isVegan;
  if (isGlutenFree != null) updates.isGlutenFree = isGlutenFree;

  const [item] = await db.update(menuItemsTable).set(updates).where(eq(menuItemsTable.id, id)).returning();
  if (!item) { res.status(404).json({ error: "Menu item not found" }); return; }
  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, item.categoryId));
  res.json(buildItem({ ...item, categoryName: cat?.name ?? null }));
});

router.delete("/menu-items/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [item] = await db.delete(menuItemsTable).where(eq(menuItemsTable.id, id)).returning();
  if (!item) { res.status(404).json({ error: "Menu item not found" }); return; }
  res.sendStatus(204);
});

export default router;
