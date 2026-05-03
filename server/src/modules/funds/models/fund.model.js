import mongoose from "mongoose";

const fundSchema = new mongoose.Schema(
  {
    // ======================
    // RELATIONS
    // ======================
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ======================
    // CORE DATA
    // ======================
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 200,
    },

    // ======================
    // OPTIONAL FEATURES (TOP 1%)
    // ======================

    // 🎯 target fund goal (paise)
    targetAmount: {
      type: Number,
      min: 0,
    },

    // 🔒 fund type (future extensibility)
    type: {
      type: String,
      enum: ["general", "trip", "emergency", "event"],
      default: "general",
    },

    // ======================
    // STATE MANAGEMENT
    // ======================
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // soft delete support
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    // ======================
    // METADATA
    // ======================
    currency: {
      type: String,
      default: "INR",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);


// ======================
// 🔥 COMPOUND INDEXES
// ======================

// prevent duplicate fund names inside same group
fundSchema.index(
  { group: 1, name: 1 },
  { unique: true }
);

// query active funds fast
fundSchema.index({ group: 1, isActive: 1 });


// ======================
// 🔒 PRE-SAVE HOOKS
// ======================

fundSchema.pre("save", function () {
  // normalize name
  if (this.name) {
    this.name = this.name.trim();
  }
});


// ======================
// 🧠 INSTANCE METHODS
// ======================

// check if fund is usable
fundSchema.methods.isUsable = function () {
  return this.isActive && !this.isDeleted;
};


// ======================
// 🧠 STATIC METHODS
// ======================

// get active funds of group
fundSchema.statics.getActiveFunds = function (groupId) {
  return this.find({
    group: groupId,
    isActive: true,
    isDeleted: false,
  });
};


const Fund = mongoose.model("Fund", fundSchema);

export default Fund;