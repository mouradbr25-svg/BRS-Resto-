import { Router, type IRouter } from "express";
import { db, quizQuestionsTable, ordersTable, customersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/quiz/questions", async (_req, res): Promise<void> => {
  const questions = await db
    .select()
    .from(quizQuestionsTable)
    .where(eq(quizQuestionsTable.active, true))
    .orderBy(quizQuestionsTable.id);
  res.json(
    questions.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      active: q.active,
      createdAt: q.createdAt,
    }))
  );
});

router.post("/quiz/questions", async (req, res): Promise<void> => {
  const { question, options, correctAnswer, active } = req.body;
  if (!question || !options || correctAnswer == null) {
    res.status(400).json({ error: "question, options, and correctAnswer are required" });
    return;
  }
  const [q] = await db
    .insert(quizQuestionsTable)
    .values({ question, options, correctAnswer, active: active ?? true })
    .returning();
  res.status(201).json(q);
});

router.patch("/quiz/questions/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { question, options, correctAnswer, active } = req.body;
  const updates: Record<string, unknown> = {};
  if (question != null) updates.question = question;
  if (options != null) updates.options = options;
  if (correctAnswer != null) updates.correctAnswer = correctAnswer;
  if (active != null) updates.active = active;
  const [q] = await db
    .update(quizQuestionsTable)
    .set(updates)
    .where(eq(quizQuestionsTable.id, id))
    .returning();
  if (!q) {
    res.status(404).json({ error: "Quiz question not found" });
    return;
  }
  res.json(q);
});

router.delete("/quiz/questions/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [q] = await db.delete(quizQuestionsTable).where(eq(quizQuestionsTable.id, id)).returning();
  if (!q) {
    res.status(404).json({ error: "Quiz question not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/quiz/submit", async (req, res): Promise<void> => {
  const { customerId, orderId, answers } = req.body;
  if (!customerId || !orderId || !answers || !Array.isArray(answers)) {
    res.status(400).json({ error: "customerId, orderId, and answers are required" });
    return;
  }

  const questions = await db
    .select()
    .from(quizQuestionsTable)
    .where(eq(quizQuestionsTable.active, true));
  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, customerId));
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId));

  if (!customer || !order) {
    res.status(404).json({ error: "Customer or order not found" });
    return;
  }

  let score = 0;
  for (const answer of answers) {
    const question = questions.find(q => q.id === answer.questionId);
    if (question && question.correctAnswer === answer.selectedAnswer) score++;
  }

  const totalQuestions = questions.length;
  const isFirstVisit = customer.isFirstVisit;
  const orderTotal = parseFloat(order.totalAmount);

  // Tiered discount logic:
  // 5/5  + first visit OR order >= 2000 DZD → 40%
  // 5/5  + order 1000–2000 DZD             → 30%
  // 5/5  + order 500–1000 DZD              → 25%
  // 5/5  + order < 500 DZD                 → 15%
  // 3/5  → Free Small Juice (no money discount)
  // <3/5 → no reward

  let discountPercent = 0;
  let tier = "none";
  let smallReward: string | null = null;

  if (score === totalQuestions && totalQuestions > 0) {
    if (isFirstVisit || orderTotal >= 2000) {
      discountPercent = 40;
      tier = isFirstVisit ? "first-visit" : "high-value";
    } else if (orderTotal >= 1000) {
      discountPercent = 30;
      tier = "standard";
    } else if (orderTotal >= 500) {
      discountPercent = 25;
      tier = "entry";
    } else {
      discountPercent = 15;
      tier = "entry";
    }
  } else if (score >= 3) {
    tier = "partial";
    smallReward = "Free Small Juice";
  }

  const discountAmount = (orderTotal * discountPercent) / 100;
  const finalAmount = orderTotal - discountAmount;

  if (discountPercent > 0) {
    await db
      .update(ordersTable)
      .set({ discountPercent: String(discountPercent), finalAmount: String(finalAmount) })
      .where(eq(ordersTable.id, orderId));
  }

  res.json({ score, totalQuestions, discountPercent, discountAmount, finalAmount, isFirstVisit, tier, smallReward });
});

export default router;
