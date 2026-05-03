import mongoose from "mongoose";

const fundTransactionSchema = new mongoose.Schema(
  {
    // ======================
    // RELATIONS
    // ======================
    fund: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Fund",
      required: true,
      index: true,
    },

    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ======================
    // TRANSACTION TYPE
    // ======================
    type: {
      type: String,
      enum: ["contribution", "withdrawal"],
      required: true,
      index: true,
    },

    // ======================
    // MONEY (PAISE ONLY)
    // ======================
    amount: {
      type: Number,
      required: true,
      min: [1, "Amount must be > 0"],
    },

    // ======================
    // OPTIONAL DATA
    // ======================
    description: {
      type: String,
      trim: true,
      maxlength: 200,
    },

    date: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // 🔐 withdrawal approvals (future)
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // 💳 payment method (future extensibility)
    method: {
      type: String,
      enum: ["cash", "upi"],
      default: "cash",
    },

    reference: {
      type: String, // UPI ref
    },

    // ======================
    // SYSTEM FLAGS
    // ======================
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);


// ======================
// 🔥 INDEXES (CRITICAL)
// ======================

// fast balance computation
fundTransactionSchema.index({ fund: 1, type: 1 });

// timeline queries
fundTransactionSchema.index({ fund: 1, createdAt: -1 });

// group-level queries
fundTransactionSchema.index({ group: 1, createdAt: -1 });


// ======================
// 🔒 PRE-SAVE VALIDATION
// ======================
fundTransactionSchema.pre("save", function () {
  // enforce integer (paise)
  this.amount = Math.round(this.amount);

  if (this.amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }
});


// ======================
// 🧠 STATIC METHODS
// ======================

// compute fund balance (optimized)
fundTransactionSchema.statics.computeBalance = async function (fundId) {
  const result = await this.aggregate([
    { $match: { fund: new mongoose.Types.ObjectId(fundId), isDeleted: false } },

    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
      },
    },
  ]);

  let balance = 0;

  for (const r of result) {
    if (r._id === "contribution") balance += r.total;
    else if (r._id === "withdrawal") balance -= r.total;
  }

  return balance;
};


// ======================
// 🧠 INSTANCE METHODS
// ======================

// check if withdrawal
fundTransactionSchema.methods.isWithdrawal = function () {
  return this.type === "withdrawal";
};


const FundTransaction = mongoose.model(
  "FundTransaction",
  fundTransactionSchema
);

export default FundTransaction;
