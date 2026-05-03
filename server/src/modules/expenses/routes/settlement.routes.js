import express from "express";
import protect from "../../../middlewares/auth.middleware.js";
import validate from "../../../middlewares/validate.middleware.js";
import { settleDebtSchema, reviewSettlementSchema } from "../../../validations/expense.validation.js";

import {
  simplifyDebtsController,
  settleDebtController,
  getSettlementHistoryController,
  reviewSettlementController,
} from "../controllers/settlement.controller.js";

const router = express.Router();

// ======================
// STANDALONE SETTLEMENTS ROUTES
// Mirrors /expenses/:groupId/settle* but at /api/v1/settlements/:groupId/*
// Architecture diagram: /api/v1/settlements is a top-level route
// ======================

// Get simplified debt plan (min cash-flow)
router.get("/:groupId", protect, simplifyDebtsController);

// Get settlement history
router.get("/:groupId/history", protect, getSettlementHistoryController);

// Record a new settlement
router.post("/:groupId", protect, validate(settleDebtSchema), settleDebtController);

// Review (confirm/dispute) a settlement
router.put("/:groupId/:settlementId", protect, validate(reviewSettlementSchema), reviewSettlementController);

export default router;
