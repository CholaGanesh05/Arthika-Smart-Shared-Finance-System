import express from "express";
import protect from "../../../middlewares/auth.middleware.js";
import { getGroupNotifications } from "../controllers/notification.controller.js";

const router = express.Router();

router.get("/:groupId", protect, getGroupNotifications);

export default router;
