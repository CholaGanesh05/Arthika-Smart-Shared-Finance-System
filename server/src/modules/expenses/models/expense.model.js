import mongoose from "mongoose";

const splitSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },

    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: [true, "Expense title is required"],
      trim: true,
      maxlength: [120, "Title must not exceed 120 characters"],
    },

    amount: {
      type: Number,
      required: true,
      min: [1, "Amount must be greater than 0"],
    },

    date: {
      type: Date,
      default: Date.now,
    },

    description: {
      type: String,
      default: "",
      maxlength: [500, "Description must not exceed 500 characters"],
    },

    category: {
      type: String,
      default: "Other",
      enum: ["Food", "Transport", "Accommodation", "Entertainment", "Utilities", "Shopping", "Medical", "Other"],
    },

    splitType: {
      type: String,
      enum: ["equal", "exact", "percentage", "shares"],
      required: true,
    },

    splits: {
      type: [splitSchema],
      required: true,
    },

    receiptUrl: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    toJSON: { versionKey: false },
  }
);

const Expense = mongoose.model("Expense", expenseSchema);

export default Expense;