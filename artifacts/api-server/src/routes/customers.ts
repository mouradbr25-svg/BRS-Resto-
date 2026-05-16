import { Router, type IRouter } from "express";
import { db, customersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

function formatCustomer(c: typeof customersTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    totalOrders: c.totalOrders,
    totalSpent: parseFloat(c.totalSpent),
    isFirstVisit: c.isFirstVisit,
    loyaltyTier: c.loyaltyTier,
    createdAt: c.createdAt,
  };
}

function computeLoyaltyTier(totalSpent: number): string {
  if (totalSpent >= 50000) return "gold";
  if (totalSpent >= 20000) return "silver";
  return "bronze";
}

router.get("/customers", async (_req, res): Promise<void> => {
  const customers = await db.select().from(customersTable).orderBy(desc(customersTable.createdAt));
  res.json(customers.map(formatCustomer));
});

router.post("/customers", async (req, res): Promise<void> => {
  const { name, phone, email } = req.body;
  if (!name || !phone) {
    res.status(400).json({ error: "name and phone are required" });
    return;
  }
  const [customer] = await db.insert(customersTable).values({ name, phone, email }).returning();
  res.status(201).json(formatCustomer(customer));
});

router.get("/customers/top", async (_req, res): Promise<void> => {
  const customers = await db.select().from(customersTable).orderBy(desc(customersTable.totalSpent)).limit(10);
  res.json(customers.map(formatCustomer));
});

router.get("/customers/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, id));
  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }
  res.json(formatCustomer(customer));
});

router.patch("/customers/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { name, phone, email } = req.body;
  const updates: Record<string, unknown> = {};
  if (name != null) updates.name = name;
  if (phone != null) updates.phone = phone;
  if (email != null) updates.email = email;

  const [customer] = await db.update(customersTable).set(updates).where(eq(customersTable.id, id)).returning();
  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }
  res.json(formatCustomer(customer));
});

export { computeLoyaltyTier };
export default router;
