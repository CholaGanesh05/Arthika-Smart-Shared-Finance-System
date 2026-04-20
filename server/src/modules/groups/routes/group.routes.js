import express from "express";
import protect from "../../../middlewares/auth.middleware.js";
import {
  createGroupController,
  getUserGroupsController, // ✅ ADD THIS
  addMemberController,
  getGroupByIdController, 
} from "../controllers/group.controller.js";

const router = express.Router();

// ======================
// GROUP ROUTES
// ======================

router.post("/", protect, createGroupController);
router.get("/", protect, getUserGroupsController);
router.post("/:groupId/members", protect, addMemberController);
router.get("/:groupId", protect, getGroupByIdController);


export default router;