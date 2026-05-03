import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import protect from "../../../middlewares/auth.middleware.js";
import validate from "../../../middlewares/validate.middleware.js";
import { uploadReceiptMiddleware } from "../../../middlewares/upload.middleware.js";
import { uploadToCloudinary } from "../../../infrastructure/storage/cloudinary.js";

import {
  addExpenseSchema,
  editExpenseSchema,
  settleDebtSchema,
  reviewSettlementSchema,
} from "../../../validations/expense.validation.js";

// Expense controllers
import {
  addExpenseController,
  editExpenseController,
  deleteExpenseController,
  getBalancesController,
  getGroupExpensesController,
} from "../controllers/expense.controller.js";

// Settlement controllers
import {
  simplifyDebtsController,
  settleDebtController,
  getSettlementHistoryController,
  reviewSettlementController,
} from "../controllers/settlement.controller.js";

console.log("✅ Expense routes loaded");

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const router = express.Router();


// ======================
// FR3.5 — RECEIPT UPLOAD
// POST /expenses/upload-receipt
// Multipart form-data: field name = "receipt"
// Returns: { receiptUrl } to pass into addExpense
// ======================
router.post("/upload-receipt", protect, (req, res, next) => {
  uploadReceiptMiddleware(req, res, async (err) => {
    if (err) {
      // multer errors (file size, wrong mime type)
      return res.status(400).json({
        success: false,
        message: err.message || "File upload failed",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    try {
      // 1. Upload buffer directly to Cloudinary via stream
      const safeName = req.file.originalname
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-zA-Z0-9_-]/g, "_");

      const result = await uploadToCloudinary(req.file.buffer, {
        folder: "arthika/receipts",
        public_id: `receipt-${Date.now()}-${safeName}`,
        transformation: [{ width: 1200, crop: "limit" }],
        timestamp: Math.floor(Date.now() / 1000) + 7200, // +2 hrs for local clock drift
      });

      // 2. Cloudinary returns secure HTTPS URL
      const receiptUrl = result.secure_url;

      return res.status(200).json({
        success: true,
        message: "Receipt uploaded successfully",
        receiptUrl,
      });
    } catch (uploadError) {
      return res.status(500).json({
        success: false,
        message: uploadError.message || "Cloudinary upload failed",
      });
    }
  });
});


// ======================
// EXPENSE CRUD
// ======================

// FR3.1–FR3.5 — Add expense
router.post(
  "/:groupId",
  protect,
  validate(addExpenseSchema),
  addExpenseController
);

// FR3.6 — Edit expense (metadata only)
router.put(
  "/:groupId/:expenseId",
  protect,
  validate(editExpenseSchema),
  editExpenseController
);

// FR3.6 + FR3.7 — Delete expense (reverses balances)
router.delete(
  "/:groupId/:expenseId",
  protect,
  deleteExpenseController
);


// ======================
// BALANCES + SETTLEMENTS
// ======================

// Get pairwise balances
router.get("/:groupId/balances", protect, getBalancesController);

// Settlement history (must come BEFORE /:groupId/settlements)
router.get(
  "/:groupId/settlements/history",
  protect,
  getSettlementHistoryController
);

// Min cash-flow simplified debts
router.get("/:groupId/settlements", protect, simplifyDebtsController);

// Record a settlement
router.post(
  "/:groupId/settle",
  protect,
  validate(settleDebtSchema),
  settleDebtController
);

// Review a settlement (FR6.4 - Owner/Manager only)
router.put(
  "/:groupId/settle/:settlementId",
  protect,
  validate(reviewSettlementSchema),
  reviewSettlementController
);


// ======================
// FR3.8 — EXPENSE HISTORY + FILTERS
// GET /expenses/:groupId/history
// Query: from, to, category, paidBy, member
// Keep LAST to avoid shadowing other routes
// ======================
router.get("/:groupId/history", protect, getGroupExpensesController);


export default router;