import express from "express";
import protect from "../../../middlewares/auth.middleware.js";
import validate from "../../../middlewares/validate.middleware.js";

import {
  updateProfileSchema,
  changePasswordSchema,
} from "../../../validations/user.validation.js";

import {
  getProfile,
  updateProfile,
  changePassword,
} from "../controllers/user.controller.js";

const router = express.Router();

// ======================
// GET MY PROFILE
// ======================
router.get("/me", protect, getProfile);

// ======================
// UPDATE PROFILE
// ======================
router.put(
  "/profile",
  protect,
  validate(updateProfileSchema),
  updateProfile
);

// ======================
// CHANGE PASSWORD
// ======================
router.put(
  "/password",
  protect,
  validate(changePasswordSchema),
  changePassword
);

export default router;
