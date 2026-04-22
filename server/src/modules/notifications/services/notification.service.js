import Notification from "../models/notification.model.js";

/**
 * Dispatches a real-time notification to a group via Socket.io
 * and persists it to MongoDB for historical tracking (FR8.4).
 *
 * @param {String} groupId - The ID of the group
 * @param {String} type - The enum event type matching notificationSchema
 * @param {String} message - The human readable notification string
 * @param {Object} data - Contextual data payload for UI logic
 */
export const dispatchNotification = async (groupId, type, message, data = {}) => {
  try {
    // 1. Persist strictly to MongoDB
    const notification = await Notification.create({
      group: groupId,
      type,
      message,
      data,
    });

    // 2. Broadcast via Socket.IO unconditionally
    if (global.io) {
      // Emit the raw unadulterated timeline event to all connected listeners natively
      global.io.to(groupId.toString()).emit("notification", notification);
      
      // 3. Emit specialized invalidation flags (FR8.3)
      if (type.includes("expense") || type.includes("settled")) {
        global.io.to(groupId.toString()).emit("balances:update", {
             timestamp: new Date(),
        });
      }
    }
    
    return notification;
  } catch (error) {
    // Failsafe: Log silently to avoid breaking the parent synchronous API request 
    // if Socket or Mongo metrics inherently glitch out.
    console.error("❌ Failed to dispatch notification:", error.message);
  }
};
