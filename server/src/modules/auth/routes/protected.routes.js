import express from "express";
import protect from "../../../middlewares/auth.middleware.js";

const router = express.Router();

// ======================
// PROTECTED ROUTE
// ======================
router.get("/me", protect, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Protected route accessed",
    user: req.user,
  });
});

export default router;