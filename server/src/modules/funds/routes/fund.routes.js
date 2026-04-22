import express from "express";
import protect from "../../../middlewares/auth.middleware.js";

import {
  createFundController,
  listGroupFundsController,
  getFundController,
  contributeController,
  withdrawController,
  getFundHistoryController,
  deactivateFundController,
} from "../controllers/fund.controller.js";

import {
  validateCreateFund,
  validateContribute,
  validateWithdraw,
  validateFundId,
} from "../validators/fund.validators.js";

console.log("✅ Fund routes loaded");

const router = express.Router();


// ======================
// GROUP-SCOPED ROUTES (no param collision)
// ======================

// FR4.1 + FR4.2 — Create a named fund in a group
// POST /api/v1/funds/group/:groupId
router.post(
  "/group/:groupId",
  protect,
  validateCreateFund,
  createFundController
);

// List all active funds in a group
// GET /api/v1/funds/group/:groupId
router.get(
  "/group/:groupId",
  protect,
  listGroupFundsController
);


// ======================
// FUND-SCOPED ROUTES
// ======================

// FR4.2 + FR4.5 — Get fund details with computed balance
// GET /api/v1/funds/:fundId
router.get(
  "/:fundId",
  protect,
  validateFundId,
  getFundController
);

// FR4.3 — Any member contributes to a fund
// POST /api/v1/funds/:fundId/contribute
router.post(
  "/:fundId/contribute",
  protect,
  validateContribute,
  contributeController
);

// FR4.4 — Owner/Manager withdraws from fund (mandatory description)
// POST /api/v1/funds/:fundId/withdraw
router.post(
  "/:fundId/withdraw",
  protect,
  validateWithdraw,
  withdrawController
);

// FR4.6 — Individual contribution/withdrawal history per fund
// GET /api/v1/funds/:fundId/history
// GET /api/v1/funds/:fundId/history?type=contribution
// GET /api/v1/funds/:fundId/history?type=withdrawal
router.get(
  "/:fundId/history",
  protect,
  validateFundId,
  getFundHistoryController
);

// FR4.7 — Deactivate a fund (Owner/Manager only)
// DELETE /api/v1/funds/:fundId
router.delete(
  "/:fundId",
  protect,
  validateFundId,
  deactivateFundController
);


export default router;