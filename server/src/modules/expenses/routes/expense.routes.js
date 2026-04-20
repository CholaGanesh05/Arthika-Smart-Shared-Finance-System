import express from "express";
import protect from "../../../middlewares/auth.middleware.js";
import validate from "../../../middlewares/validate.middleware.js";

import { addExpenseSchema } from "../../../validations/expense.validation.js";

// Expense controllers
import {
  addExpenseController,
  getBalancesController,
  getGroupExpensesController,
} from "../controllers/expense.controller.js";

// Settlement controllers
import {
  simplifyDebtsController,
  settleDebtController,
  getSettlementHistoryController,
} from "../controllers/settlement.controller.js";

console.log("✅ Expense routes loaded");

const router = express.Router();

// ======================
// EXPENSE ROUTES
// ======================

// Add expense
router.post(
  "/:groupId",
  protect,
  validate(addExpenseSchema),
  addExpenseController
);

// Balances
router.get("/:groupId/balances", protect, getBalancesController);

// ======================
// SETTLEMENT ROUTES
// ======================

// 🔥 Settlement history (must come BEFORE settlements)
router.get(
  "/:groupId/settlements/history",
  protect,
  getSettlementHistoryController
);

// Min cash flow (simplified debts)
router.get("/:groupId/settlements", protect, simplifyDebtsController);

// Settle debt
router.post("/:groupId/settle", protect, settleDebtController);

// ======================
// EXPENSE HISTORY
// ======================

// Keep this LAST among GETs
router.get("/:groupId/history", protect, getGroupExpensesController);

export default router;