import mongoose from "mongoose";

const ledgerSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
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
      required: true,
      min: [0, "Amount must be positive"],
    },

    expense: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expense",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ======================
// 🔥 SINGLE COMPOUND INDEX (OPTIMIZED)
// ======================
ledgerSchema.index(
  { group: 1, from: 1, to: 1 },
  { unique: true } // ✅ prevents duplicate entries
);

// ======================
// 🔒 PRE-SAVE VALIDATION
// ======================
ledgerSchema.pre("save", function (next) {
  // ❌ prevent self-debt
  if (this.from.toString() === this.to.toString()) {
    return next(new Error("Cannot create ledger entry to self"));
  }

  // ✅ normalize precision to integer (paise)
  this.amount = Math.round(this.amount);

  next();
});

const Ledger = mongoose.model("Ledger", ledgerSchema);

export default Ledger;