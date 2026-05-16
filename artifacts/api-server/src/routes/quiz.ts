import { Router, type IRouter } from "express";
import { db, quizQuestionsTable, ordersTable, customersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/quiz/questions", async (_req, res): Promise<void> => {
  const questions = await db.select().from(quizQuestionsTable)
    .where(eq(quizQuestionsTable.active, true))
    .orderBy(quizQuestionsTable.id);
  res.json(questions.map(q => ({
    id: q.id,
    question: q.question,
    options: q.options,
    correctAnswer: q.correctAnswer,
    active: q.active,
    createdAt: q.createdAt,
  })));
});

router.post("/quiz/questions", async (req, res): Promise<void> => {
  const { question, options, correctAnswer, active } = req.body;
  if (!question || !options || correctAnswer == null) {
    res.status(400).json({ error: "question, options, and correctAnswer are required" });
    return;
  }
  const [q] = await db.insert(quizQuestionsTable).values({
    question,
    options,
    correctAnswer,
    active: active ?? true,
  }).returning();
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

  const [q] = await db.update(quizQuestionsTable).set(updates).where(eq(quizQuestionsTable.id, id)).returning();
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

  const questions = await db.select().from(quizQuestionsTable).where(eq(quizQuestionsTable.active, true));
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, customerId));
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));

  if (!customer || !order) {
    res.status(404).json({ error: "Customer or order not found" });
    return;
  }

  let score = 0;
  for (const answer of answers) {
    const question = questions.find(q => q.id === answer.questionId);
    if (question && question.correctAnswer === answer.selectedAnswer) {
      score++;
    }
  }

  const totalQuestions = questions.length;
  const isFirstVisit = customer.isFirstVisit;

  let discountPercent = 0;
  let tier = "none";
  if (isFirstVisit) {
    discountPercent = 40;
    tier = "first-visit";
  } else {
    const orderTotal = parseFloat(order.totalAmount);
    if (orderTotal >= 10000) {
      discountPercent = 25;
      tier = "high-spender";
    } else if (orderTotal >= 5000) {
      discountPercent = 15;
      tier = "regular";
    } else {
      discountPercent = 10;
      tier = "basic";
    }
    const scoreBonus = Math.round((score / Math.max(totalQuestions, 1)) * 5);
    discountPercent = Math.min(discountPercent + scoreBonus, 40);
  }

  const orderTotal = parseFloat(order.totalAmount);
  const discountAmount = (orderTotal * discountPercent) / 100;

  // Apply discount to order
  const finalAmount = orderTotal - discountAmount;
  await db.update(ordersTable).set({
    discountPercent: String(discountPercent),
    finalAmount: String(finalAmount),
  }).where(eq(ordersTable.id, orderId));

  res.json({
    score,
    totalQuestions,
    discountPercent,
    discountAmount,
    isFirstVisit,
    tier,
  });
});

export default router;
