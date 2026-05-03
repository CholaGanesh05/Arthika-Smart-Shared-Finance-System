import mongoose from "mongoose";
import AdvancePayment from "../models/advancePayment.model.js";
import Ledger from "../models/ledger.model.js";
import Settlement from "../models/settlement.model.js";
import Group from "../../groups/models/group.model.js";
import redisClient from "../../../config/redis.js";
import { emitEvent } from "../../../utils/eventEmitter.js";
import { logActivity } from "../../groups/services/activityLog.service.js";

const toPaise = (value) => Math.round(parseFloat(value) * 100);

// ======================
// RECORD ADVANCE PAYMENT
// Member pays another member in advance.
// If a debt already exists, reduce it immediately.
// Otherwise, create a credit that future expenses can consume.
// ======================
export const recordAdvancePayment = async ({
  groupId,
  fromUserId,
  toUserId,
  amount,
  date,
  note,
}) => {
  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    throw new Error("Invalid group ID");
  }

  if (!amount || amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  const group = await Group.findById(groupId).populate("members.user", "name email");
  if (!group) throw new Error("Group not found");
  if (!group.isMember(fromUserId)) throw new Error("You are not a member of this group");

  const payerId = fromUserId.toString();
  const ownerEntry = group.members.find((member) => member.role === "owner");

  if (!ownerEntry) {
    throw new Error("Group has no owner");
  }

  // Default to the owner so older clients keep working.
  const recipientId = (toUserId || ownerEntry.user._id).toString();

  if (!group.isMember(recipientId)) {
    throw new Error("Recipient is not a member of this group");
  }

  if (payerId === recipientId) {
    throw new Error("You cannot record an advance payment to yourself");
  }

  const amountPaise = toPaise(amount);
  const payer = group.members.find((member) => member.user._id.toString() === payerId)?.user;
  const recipient = group.members.find((member) => member.user._id.toString() === recipientId)?.user;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [advance] = await AdvancePayment.insertMany(
      [
        {
          group: groupId,
          from: payerId,
          to: recipientId,
          amount: amountPaise,
          date: date || new Date(),
          note: note || "",
        },
      ],
      { session, rawResult: false }
    );

    const forward = await Ledger.findOne({
      group: groupId,
      from: payerId,
      to: recipientId,
    }).session(session);

    if (forward) {
      if (amountPaise >= forward.amount) {
        const remaining = amountPaise - forward.amount;
        await forward.deleteOne({ session });

        if (remaining > 0) {
          await Ledger.updateOne(
            { group: groupId, from: recipientId, to: payerId },
            { $inc: { amount: remaining } },
            { upsert: true, session }
          );
        }
      } else {
        forward.amount -= amountPaise;
        await forward.save({ session });
      }
    } else {
      await Ledger.updateOne(
        { group: groupId, from: recipientId, to: payerId },
        { $inc: { amount: amountPaise } },
        { upsert: true, session }
      );
    }

    const [settlement] = await Settlement.create(
      [
        {
          group: groupId,
          from: payerId,
          to: recipientId,
          amount: amountPaise,
          date: date || new Date(),
          status: "confirmed",
          settledBy: payerId,
          method: "advance",
          note: note || "Advance Payment",
        },
      ],
      { session }
    );

    await AdvancePayment.updateOne(
      { _id: advance._id },
      { $set: { settlement: settlement._id } },
      { session }
    );

    await session.commitTransaction();

    try {
      await redisClient.del(`balances:${groupId}`);
      await redisClient.del(`settlements:${groupId}`);
    } catch (_) {}

    emitEvent(groupId.toString(), "notification:new", {
      _id: advance._id,
      message: `${payer?.name || "A member"} paid ₹${amount} in advance to ${recipient?.name || "a member"}.`,
      createdAt: new Date(),
    });
    emitEvent(groupId.toString(), "group:balance:updated");
    emitEvent(groupId.toString(), "group:debt:settled", {
      from: payerId,
      to: recipientId,
      amount: (amountPaise / 100).toFixed(2),
      method: "advance",
    });

    logActivity(
      groupId.toString(),
      payerId,
      "advance:recorded",
      `Advance payment of ₹${(amountPaise / 100).toFixed(2)} recorded to ${recipient?.name || "a member"}`,
      { toUserId: recipientId, amountPaise }
    );

    return {
      ...advance.toObject(),
      amountRupees: (amountPaise / 100).toFixed(2),
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// ======================
// GET ADVANCE PAYMENTS FOR GROUP
// ======================
export const getGroupAdvancePayments = async (groupId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(groupId)) throw new Error("Invalid group ID");

  const group = await Group.findById(groupId);
  if (!group) throw new Error("Group not found");
  if (!group.isMember(userId)) throw new Error("Not authorized");

  const advances = await AdvancePayment.find({ group: groupId })
    .populate("from", "name email avatar")
    .populate("to", "name email")
    .sort({ date: -1, createdAt: -1 })
    .lean();

  return advances.map((advance) => ({
    ...advance,
    amountRupees: (advance.amount / 100).toFixed(2),
  }));
};
