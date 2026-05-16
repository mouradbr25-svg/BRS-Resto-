import { pgTable, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const menuItemIngredientsTable = pgTable("menu_item_ingredients", {
  id: serial("id").primaryKey(),
  menuItemId: integer("menu_item_id").notNull(),
  ingredientId: integer("ingredient_id").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 3 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMenuItemIngredientSchema = createInsertSchema(menuItemIngredientsTable).omit({ id: true, createdAt: true });
export type InsertMenuItemIngredient = z.infer<typeof insertMenuItemIngredientSchema>;
export type MenuItemIngredient = typeof menuItemIngredientsTable.$inferSelect;
