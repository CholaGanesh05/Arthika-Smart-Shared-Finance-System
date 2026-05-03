import mongoose from "mongoose";

/**
 * ActivityLog — Audit log for all major group events (FR2.8).
 * Distinct from Notification: this is the permanent audit trail,
 * not the real-time UI feed.
 *
 * Collections: activity_logs
 */
const activityLogSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },

    // Who performed the action
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Action type — standardized strings
    action: {
      type: String,
      required: true,
      enum: [
        // Group events
        "group:member:joined",
        "group:member:removed",
        "group:role:updated",
        "group:archived",
        "group:deleted",
        // Expense events
        "expense:created",
        "expense:updated",
        "expense:deleted",
        // Settlement events
        "settlement:recorded",
        "settlement:confirmed",
        "settlement:disputed",
        // Fund events
        "fund:created",
        "fund:contributed",
        "fund:withdrawn",
        "fund:deactivated",
      ],
    },

    // Human-readable description for the activity feed UI
    description: {
      type: String,
      required: true,
      maxlength: 300,
    },

    // Flexible metadata (entity IDs, amounts, etc.)
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ======================
// INDEXES
// ======================
// Primary query: latest 50 logs per group (FR-UI-4 Group Home)
activityLogSchema.index({ group: 1, createdAt: -1 });

// Query by actor (e.g. "what did user X do in this group?")
activityLogSchema.index({ group: 1, actor: 1 });

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);

export default ActivityLog;
