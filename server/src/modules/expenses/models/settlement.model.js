import mongoose from "mongoose";

const settlementSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },

    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    amount: {
      type: Number,
      required: true, // 💰 store in paise
      min: 1,
    },

    // 🔥 WHO PERFORMED THE ACTION (IMPORTANT FOR AUDIT)
    settledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    method: {
      type: String,
      enum: ["cash", "upi"],
      default: "cash",
    },

    reference: {
      type: String, // UPI txn id (optional)
      trim: true,
    },

    date: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "disputed"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true, versionKey: false }
);

// 🔥 INDEXES (OPTIMIZED)
settlementSchema.index({ group: 1, createdAt: -1 }); // history queries
settlementSchema.index({ from: 1, to: 1, group: 1 }); // settlement lookups

const Settlement = mongoose.model("Settlement", settlementSchema);

export default Settlement;