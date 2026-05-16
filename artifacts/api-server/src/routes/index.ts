import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import tablesRouter from "./tables";
import categoriesRouter from "./categories";
import menuItemsRouter from "./menuItems";
import ingredientsRouter from "./ingredients";
import customersRouter from "./customers";
import ordersRouter from "./orders";
import quizRouter from "./quiz";
import analyticsRouter from "./analytics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(tablesRouter);
router.use(categoriesRouter);
router.use(menuItemsRouter);
router.use(ingredientsRouter);
router.use(customersRouter);
router.use(ordersRouter);
router.use(quizRouter);
router.use(analyticsRouter);

export default router;
