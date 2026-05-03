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

    // Optional ref to the originating expense.
    // NOT required — ledger entries can also be created during settlement
    // reversals and dispute resolutions where no single expense is the source.
    expense: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expense",
      required: false, // ✅ FIX: was required:true, crashed on delete-expense reversal
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ======================
// INDEXES (OPTIMIZED — no unique constraint)
// ✅ FIX: removed unique:true — the ledger.service.js upsert pattern
//         (bulkWrite with updateOne + upsert:true) handles deduplication.
//         A unique index caused E11000 crashes on reverse-debt insertions.
// ======================
ledgerSchema.index({ group: 1, from: 1, to: 1 }); // fast pair lookups
ledgerSchema.index({ group: 1 });                  // group-level queries

// ======================
// PRE-SAVE VALIDATION
// ======================
ledgerSchema.pre("save", function (next) {
  // prevent self-debt
  if (this.from.toString() === this.to.toString()) {
    return next(new Error("Cannot create ledger entry to self"));
  }

  // enforce paise integer (never store floats)
  this.amount = Math.round(this.amount);

  next();
});

const Ledger = mongoose.model("Ledger", ledgerSchema);

export default Ledger;