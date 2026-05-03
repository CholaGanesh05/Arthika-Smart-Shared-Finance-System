import express from "express";
import protect from "../../../middlewares/auth.middleware.js";
import {
  getGroupAnalytics,
  getMemberAnalytics,
  exportGroupTransactionsCSV,
  exportGroupTransactionsPDF,
} from "../controllers/analytics.controller.js";

const router = express.Router();

// ======================
// ANALYTICS ROUTES
// ======================

router.get("/:groupId", protect, getGroupAnalytics);
router.get("/:groupId/member", protect, getMemberAnalytics);
router.get("/:groupId/export", protect, exportGroupTransactionsCSV);       // CSV
router.get("/:groupId/export/pdf", protect, exportGroupTransactionsPDF);   // PDF (pdfkit)

export default router;
