import Notification from "../models/notification.model.js";
import Group from "../../groups/models/group.model.js";
import { markNotificationRead } from "../services/notification.service.js";

// ======================
// GET GROUP NOTIFICATIONS (FR8.4: last 50 events)
// ======================
export const getGroupNotifications = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }
    if (!group.isMember(req.user._id)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const notifications = await Notification.find({ group: groupId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
};

// ======================
// MARK NOTIFICATION AS READ (FR8.4)
// PATCH /api/v1/notifications/:notificationId/read
// ======================
export const markNotificationReadController = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await markNotificationRead(notificationId, userId);

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};
