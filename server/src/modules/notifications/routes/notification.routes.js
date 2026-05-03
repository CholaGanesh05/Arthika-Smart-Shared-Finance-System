import express from "express";
import protect from "../../../middlewares/auth.middleware.js";
import {
  getGroupNotifications,
  markNotificationReadController,
} from "../controllers/notification.controller.js";

const router = express.Router();

// ======================
// NOTIFICATION ROUTES
// ======================

// FR8.4 — Get last 50 notifications for a group
router.get("/:groupId", protect, getGroupNotifications);

// FR8.4 — Mark a specific notification as read
router.patch("/:notificationId/read", protect, markNotificationReadController);

export default router;
