import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },

    // Optional: specific recipient for directed notifications.
    // Group-wide notifications leave this unset.
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    type: {
      type: String,
      required: true,
      trim: true,
      enum: [
        "expense:created",
        "expense:updated",
        "expense:deleted",
        "group:debt:settled",
        "group:debt:reviewed",
        "group:member:joined",
        "group:member:removed",
        "group:fund:contributed",
        "group:fund:withdrawn",
      ],
    },

    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    message: {
      type: String,
      required: true,
    },

    // Per-user read state (FR8.4 — notification list with read/unread)
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// ======================
// INDEXES
// ======================
// Primary: latest 50 per group (FR8.4)
notificationSchema.index({ group: 1, createdAt: -1 });

// Per-user unread query: "my unread notifications in this group"
notificationSchema.index({ recipient: 1, isRead: 1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
