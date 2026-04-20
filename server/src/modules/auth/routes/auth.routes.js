import express from "express";
import { register, login } from "../controllers/auth.controller.js";

// ✅ VALIDATION IMPORTS
import validate from "../../../middlewares/validate.middleware.js";
import {
  registerSchema,
  loginSchema,
} from "../../../validations/auth.validation.js";

const router = express.Router();

// ======================
// AUTH ROUTES
// ======================

// 🔐 Register
router.post("/register", validate(registerSchema), register);

// 🔐 Login
router.post("/login", validate(loginSchema), login);

export default router;