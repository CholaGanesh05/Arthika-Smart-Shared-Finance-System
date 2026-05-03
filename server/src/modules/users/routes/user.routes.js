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
  uploadAvatar,
  removeAvatar,
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

// ======================
// UPLOAD / REMOVE AVATAR — /api/v1/users/avatar
// ======================
router.post("/avatar", protect, uploadAvatar);
router.delete("/avatar", protect, removeAvatar);

export default router;
