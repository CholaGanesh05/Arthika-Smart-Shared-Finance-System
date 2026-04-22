import express from "express";
import protect from "../../../middlewares/auth.middleware.js";
import {
  createGroupController,
  getUserGroupsController,
  addMemberController,
  getGroupByIdController,
  removeMemberController,
  deleteGroupController,
  joinWithCodeController,
  updateRoleController,
  archiveGroupController
} from "../controllers/group.controller.js";

const router = express.Router();

// ======================
// GROUP ROUTES
// ======================

router.post("/", protect, createGroupController);
router.get("/", protect, getUserGroupsController);
router.post("/join", protect, joinWithCodeController);
router.post("/:groupId/members", protect, addMemberController);
router.delete("/:groupId/members/:userId", protect, removeMemberController);
router.put("/:groupId/members/:userId/role", protect, updateRoleController);
router.get("/:groupId", protect, getGroupByIdController);
router.patch("/:groupId/archive", protect, archiveGroupController);
router.delete("/:groupId", protect, deleteGroupController);


export default router;