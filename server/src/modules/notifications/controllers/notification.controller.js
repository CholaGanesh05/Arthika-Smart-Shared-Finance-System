import Notification from "../models/notification.model.js";
import Group from "../../groups/models/group.model.js";

// ======================
// GET GROUP NOTIFICATIONS (FR8.4: last 50 events)
// ======================
export const getGroupNotifications = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    // Verify group exists and user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }

    if (!group.isMember(req.user._id)) {
      return res.status(403).json({ success: false, message: "Not authorized to view notifications for this group" });
    }

    // Fetch the last 50 notifications
    const notifications = await Notification.find({ group: groupId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};
