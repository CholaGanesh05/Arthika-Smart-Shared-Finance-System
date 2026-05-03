import mongoose from "mongoose";

const advancePaymentSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    // member who is paying in advance
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // recipient of the advance payment
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // stored in paise (integer)
    amount: {
      type: Number,
      required: true,
      min: [1, "Amount must be at least 1 paise"],
    },
    note: {
      type: String,
      maxlength: 200,
      default: "",
    },
    date: {
      type: Date,
      default: Date.now,
    },
    settlement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Settlement",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

advancePaymentSchema.index({ group: 1 });
advancePaymentSchema.index({ group: 1, from: 1 });
advancePaymentSchema.index({ group: 1, to: 1 });

const AdvancePayment = mongoose.model("AdvancePayment", advancePaymentSchema);
export default AdvancePayment;
