import express from "express";
import authRoutes from "../modules/auth/routes/auth.routes.js";
import userRoutes from "../modules/users/routes/user.routes.js"; 
import groupRoutes from "../modules/groups/routes/group.routes.js"; 
import expenseRoutes from "../modules/expenses/routes/expense.routes.js";
import fundRoutes from "../modules/funds/routes/fund.routes.js";
import analyticsRoutes from "../modules/analytics/routes/analytics.routes.js";
import notificationRoutes from "../modules/notifications/routes/notification.routes.js";

const router = express.Router();

// ======================
// API ROUTES
// ======================

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/groups", groupRoutes);
router.use("/expenses", expenseRoutes);
router.use("/funds", fundRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/notifications", notificationRoutes);

export default router;