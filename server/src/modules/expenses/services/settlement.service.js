import mongoose from "mongoose";
import Ledger from "../models/ledger.model.js";
import Group from "../../groups/models/group.model.js";
import Settlement from "../models/settlement.model.js";
import redisClient from "../../../config/redis.js";
import { emitEvent } from "../../../utils/eventEmitter.js";

// ======================
// MIN CASH FLOW (OPTIMIZED)
// ======================
export const simplifyDebts = async (groupId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    throw new Error("Invalid group ID");
  }

  const cacheKey = `settlements:${groupId}`;

  // ✅ SAFE CACHE (no crash if redis disabled)
  let cached = null;
  try {
    cached = await redisClient.get(cacheKey);
  } catch (_) {}

  if (cached) {
    return JSON.parse(cached);
  }

  const group = await Group.findById(groupId).populate(
    "members.user",
    "name email"
  );

  if (!group) throw new Error("Group not found");
  if (!group.isMember(userId)) throw new Error("Not authorized");

  const userMap = {};
  const net = {};

  group.members.forEach((m) => {
    const id = m.user._id.toString();

    userMap[id] = {
      name: m.user.name,
      email: m.user.email,
    };

    net[id] = 0;
  });

  const ledger = await Ledger.find({ group: groupId }).lean();

  // ======================
  // NET BALANCE
  // ======================
  for (const entry of ledger) {
    const from = entry.from.toString();
    const to = entry.to.toString();

    net[from] = Number((net[from] - entry.amount).toFixed(2));
    net[to] = Number((net[to] + entry.amount).toFixed(2));
  }

  const debtors = [];
  const creditors = [];

  for (const user in net) {
    const amount = Number(net[user].toFixed(2));

    if (amount === 0) continue;

    if (amount < 0) {
      debtors.push({ user, amount: -amount });
    } else {
      creditors.push({ user, amount });
    }
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements = [];

  let i = 0,
    j = 0;

  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i];
    const c = creditors[j];

    const settledAmount = Number(
      Math.min(d.amount, c.amount).toFixed(2)
    );

    settlements.push({
      from: {
        id: d.user,
        name: userMap[d.user]?.name || "Unknown",
        email: userMap[d.user]?.email || "",
      },
      to: {
        id: c.user,
        name: userMap[c.user]?.name || "Unknown",
        email: userMap[c.user]?.email || "",
      },
      amount: settledAmount,
    });

    d.amount = Number((d.amount - settledAmount).toFixed(2));
    c.amount = Number((c.amount - settledAmount).toFixed(2));

    if (d.amount === 0) i++;
    if (c.amount === 0) j++;
  }

  // ✅ SAFE CACHE SET
  try {
    await redisClient.set(cacheKey, JSON.stringify(settlements), "EX", 300);
  } catch (_) {}

  return settlements;
};

// ======================
// SETTLE DEBT (TRANSACTION SAFE)
// ======================
export const settleDebt = async ({
  groupId,
  fromUserId,
  toUserId,
  amount,
  method = "cash",
  reference = null,
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (
      !mongoose.Types.ObjectId.isValid(groupId) ||
      !mongoose.Types.ObjectId.isValid(fromUserId) ||
      !mongoose.Types.ObjectId.isValid(toUserId)
    ) {
      throw new Error("Invalid IDs");
    }

    if (fromUserId.toString() === toUserId.toString()) {
      throw new Error("Cannot settle with yourself");
    }

    if (!amount || amount <= 0) {
      throw new Error("Invalid amount");
    }

    // ✅ FIX: preserve decimals (not Math.round)
    amount = Number(Number(amount).toFixed(2));

    const debt = await Ledger.findOne({
      group: groupId,
      from: fromUserId,
      to: toUserId,
    }).session(session);

    if (!debt) throw new Error("No debt found");

    if (amount > debt.amount) {
      throw new Error("Amount exceeds debt");
    }

    // ======================
    // UPDATE LEDGER
    // ======================
    if (Number(debt.amount.toFixed(2)) === amount) {
      await debt.deleteOne({ session });
    } else {
      debt.amount = Number((debt.amount - amount).toFixed(2));
      await debt.save({ session });
    }

    // ======================
    // SAVE HISTORY
    // ======================
    await Settlement.create(
      [
        {
          group: groupId,
          from: fromUserId,
          to: toUserId,
          amount,
          method,
          reference,
        },
      ],
      { session }
    );

    // ======================
    // CACHE INVALIDATION
    // ======================
    try {
      await redisClient.del(`balances:${groupId}`);
      await redisClient.del(`settlements:${groupId}`);
    } catch (_) {}

    await session.commitTransaction();
    session.endSession();

    // ======================
    // 🔥 EVENTS
    // ======================
    emitEvent(groupId, "group:debt:settled", {
      from: fromUserId,
      to: toUserId,
      amount,
    });

    emitEvent(groupId, "group:balance:updated");

    return { message: "Settlement successful" };

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// ======================
// GET SETTLEMENT HISTORY
// ======================
export const getSettlementHistory = async (groupId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    throw new Error("Invalid group ID");
  }

  const group = await Group.findById(groupId);

  if (!group) throw new Error("Group not found");
  if (!group.isMember(userId)) throw new Error("Not authorized");

  const settlements = await Settlement.find({ group: groupId })
    .populate("from", "name email")
    .populate("to", "name email")
    .sort({ createdAt: -1 })
    .lean();

  return settlements;
};