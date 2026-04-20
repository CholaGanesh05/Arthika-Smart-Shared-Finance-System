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

    amount: {
      type: Number,
      required: true,
    },

    description: {
      type: String,
      default: "",
    },

    splitType: {
      type: String,
      enum: ["equal", "exact"],
      required: true,
    },

    splits: {
      type: [splitSchema],
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { versionKey: false },
  }
);

const Expense = mongoose.model("Expense", expenseSchema);

export default Expense;