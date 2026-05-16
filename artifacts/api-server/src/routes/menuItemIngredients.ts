import { Router, type IRouter } from "express";
import { db, menuItemIngredientsTable, ingredientsTable, menuItemsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/menu-items/:id/ingredients", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const menuItemId = parseInt(raw, 10);

  const rows = await db
    .select({
      id: menuItemIngredientsTable.id,
      menuItemId: menuItemIngredientsTable.menuItemId,
      ingredientId: menuItemIngredientsTable.ingredientId,
      ingredientName: ingredientsTable.name,
      quantity: menuItemIngredientsTable.quantity,
      unit: ingredientsTable.unit,
    })
    .from(menuItemIngredientsTable)
    .leftJoin(ingredientsTable, eq(menuItemIngredientsTable.ingredientId, ingredientsTable.id))
    .where(eq(menuItemIngredientsTable.menuItemId, menuItemId));

  res.json(rows.map(r => ({
    id: r.id,
    menuItemId: r.menuItemId,
    ingredientId: r.ingredientId,
    ingredientName: r.ingredientName ?? "",
    quantity: parseFloat(r.quantity),
    unit: r.unit ?? "",
  })));
});

router.put("/menu-items/:id/ingredients", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const menuItemId = parseInt(raw, 10);
  const { ingredients } = req.body;

  if (!Array.isArray(ingredients)) {
    res.status(400).json({ error: "ingredients array is required" });
    return;
  }

  // Check menu item exists
  const [menuItem] = await db.select().from(menuItemsTable).where(eq(menuItemsTable.id, menuItemId));
  if (!menuItem) {
    res.status(404).json({ error: "Menu item not found" });
    return;
  }

  // Delete existing entries
  await db.delete(menuItemIngredientsTable).where(eq(menuItemIngredientsTable.menuItemId, menuItemId));

  // Insert new entries
  if (ingredients.length > 0) {
    await db.insert(menuItemIngredientsTable).values(
      ingredients.map((ing: { ingredientId: number; quantity: number }) => ({
        menuItemId,
        ingredientId: ing.ingredientId,
        quantity: String(ing.quantity),
      }))
    );
  }

  // Return updated list
  const rows = await db
    .select({
      id: menuItemIngredientsTable.id,
      menuItemId: menuItemIngredientsTable.menuItemId,
      ingredientId: menuItemIngredientsTable.ingredientId,
      ingredientName: ingredientsTable.name,
      quantity: menuItemIngredientsTable.quantity,
      unit: ingredientsTable.unit,
    })
    .from(menuItemIngredientsTable)
    .leftJoin(ingredientsTable, eq(menuItemIngredientsTable.ingredientId, ingredientsTable.id))
    .where(eq(menuItemIngredientsTable.menuItemId, menuItemId));

  res.json(rows.map(r => ({
    id: r.id,
    menuItemId: r.menuItemId,
    ingredientId: r.ingredientId,
    ingredientName: r.ingredientName ?? "",
    quantity: parseFloat(r.quantity),
    unit: r.unit ?? "",
  })));
});

export default router;
