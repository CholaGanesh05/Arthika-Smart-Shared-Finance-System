import express from "express";
import protect from "../../../middlewares/auth.middleware.js";

import {
  createFundController,
  contributeController,
  withdrawController,
  getFundController,
} from "../controllers/fund.controller.js";

console.log("✅ Fund routes loaded");

const router = express.Router();

// ======================
// FUND ROUTES
// ======================

// Create fund
router.post("/:groupId", protect, createFundController);

// Get fund details
router.get("/:fundId", protect, getFundController);

// Contribute
router.post("/:fundId/contribute", protect, contributeController);

// Withdraw
router.post("/:fundId/withdraw", protect, withdrawController);

export default router;