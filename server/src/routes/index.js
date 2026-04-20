import express from "express";
import authRoutes from "../modules/auth/routes/auth.routes.js";
import protectedRoutes from "../modules/auth/routes/protected.routes.js"; 
import groupRoutes from "../modules/groups/routes/group.routes.js"; 
import expenseRoutes from "../modules/expenses/routes/expense.routes.js";
import fundRoutes from "../modules/funds/routes/fund.routes.js";

const router = express.Router();

// ======================
// API ROUTES
// ======================

router.use("/auth", authRoutes);
router.use("/user", protectedRoutes);
router.use("/groups", groupRoutes);
router.use("/expenses", expenseRoutes);
router.use("/funds", fundRoutes);

export default router;