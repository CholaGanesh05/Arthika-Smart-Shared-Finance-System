import ActivityLog from "../models/activityLog.model.js";

/**
 * Logs a group activity event to the activity_logs collection (FR2.8).
 *
 * @param {string} groupId    - The group this event belongs to
 * @param {string} actorId    - The user who triggered the event
 * @param {string} action     - The action enum string (e.g. "expense:created")
 * @param {string} description - Human-readable description for the UI feed
 * @param {object} metadata   - Optional extra context (IDs, amounts, names)
 */
export const logActivity = async (
  groupId,
  actorId,
  action,
  description,
  metadata = {}
) => {
  try {
    await ActivityLog.create({
      group: groupId,
      actor: actorId,
      action,
      description,
      metadata,
    });
  } catch (error) {
    // Failsafe: activity logging must NEVER crash the parent operation
    console.error("⚠️ ActivityLog error (non-fatal):", error.message);
  }
};

/**
 * Returns the latest 50 activity log entries for a group (FR-UI-4).
 *
 * @param {string} groupId
 * @returns {Array} populated activity log entries
 */
export const getActivityLog = async (groupId) => {
  return ActivityLog.find({ group: groupId })
    .populate("actor", "name avatar")
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
};
