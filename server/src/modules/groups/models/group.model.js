import mongoose from "mongoose";


// ======================
// MEMBER SUB-SCHEMA
// ======================
const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // ❌ removed index: true
    },

    role: {
      type: String,
      enum: ["owner", "manager", "member"],
      default: "member",
    },

    balance: {
      type: Number,
      default: 0, // +ve → owes, -ve → gets back
    },

    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);


// ======================
// GROUP SCHEMA
// ======================
const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    description: {
      type: String,
      default: "",
      maxlength: 300,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // ❌ removed index: true
    },

    members: {
      type: [memberSchema],
      validate: {
        validator: function (members) {
          return members.length > 0;
        },
        message: "Group must have at least one member",
      },
    },

    totalBalance: {
      type: Number,
      default: 0,
    },

    currency: {
      type: String,
      default: "INR",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { versionKey: false },
    toObject: { versionKey: false },
  }
);


// ======================
// INDEXES (SINGLE SOURCE OF TRUTH)
// ======================
groupSchema.index({ createdBy: 1 });
groupSchema.index({ "members.user": 1 });


// ======================
// METHODS
// ======================
groupSchema.methods.isMember = function (userId) {
  return this.members.some((member) => {
    const memberId = member.user._id
      ? member.user._id.toString()   // when populated
      : member.user.toString();      // when not populated

    return memberId === userId.toString();
  });
};

groupSchema.methods.getMember = function (userId) {
  return this.members.find((member) => {
    const memberId = member.user._id
      ? member.user._id.toString()
      : member.user.toString();

    return memberId === userId.toString();
  });
};




const Group = mongoose.model("Group", groupSchema);

export default Group;