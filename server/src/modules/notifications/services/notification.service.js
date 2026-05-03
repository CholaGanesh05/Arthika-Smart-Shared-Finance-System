import Notification from "../models/notification.model.js";

/**
 * Dispatches a real-time notification to a group via Socket.io
 * and persists it to MongoDB for historical tracking (FR8.4).
 *
 * @param {String} groupId  - The ID of the group
 * @param {String} type     - The enum event type matching notificationSchema
 * @param {String} message  - The human readable notification string
 * @param {Object} data     - Contextual data payload for UI logic
 * @param {String} [recipientId] - Optional: specific user this is directed at
 */
export const dispatchNotification = async (groupId, type, message, data = {}, recipientId = null) => {
  try {
    // 1. Persist to MongoDB
    const notification = await Notification.create({
      group:     groupId,
      type,
      message,
      data,
      recipient: recipientId || null,
      isRead:    false,
    });

    // 2. Broadcast via Socket.IO
    if (global.io) {
      global.io.to(groupId.toString()).emit("notification", notification);

      // 3. Emit balance invalidation flags (FR8.3)
      if (type.includes("expense") || type.includes("settled")) {
        global.io.to(groupId.toString()).emit("balances:update", {
          timestamp: new Date(),
        });
      }
    }

    return notification;
  } catch (error) {
    console.error("❌ Failed to dispatch notification:", error.message);
  }
};

/**
 * Marks a single notification as read (FR8.4).
 *
 * @param {String} notificationId
 * @param {String} userId - Must be the recipient or a group member
 */
export const markNotificationRead = async (notificationId, userId) => {
  const notification = await Notification.findById(notificationId);
  if (!notification) throw new Error("Notification not found");

  notification.isRead = true;
  await notification.save();
  return notification;
};
