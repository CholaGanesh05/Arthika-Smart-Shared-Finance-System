import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
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
        "group:debt:reviewed", // LOGIC FLAW FIX: Must exist to prevent API crash!
        "group:member:joined",
        "group:member:removed",
        "group:fund:contributed",
        "group:fund:withdrawn"
      ]
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    message: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index to automatically drop or easily query the latest 50
notificationSchema.index({ group: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
