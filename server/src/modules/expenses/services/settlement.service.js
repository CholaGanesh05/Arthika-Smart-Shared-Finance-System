import mongoose from "mongoose";
import Ledger from "../models/ledger.model.js";
import Group from "../../groups/models/group.model.js";
import Settlement from "../models/settlement.model.js";
import redisClient from "../../../config/redis.js";
import { emitEvent } from "../../../utils/eventEmitter.js";
import { logActivity } from "../../groups/services/activityLog.service.js";

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
  // NET BALANCE (LOGIC FLAW FIX: Ghost Ledger Defense)
  // ======================
  for (const entry of ledger) {
    const from = entry.from.toString();
    const to = entry.to.toString();

    // Defensively initialize in case of deleted members whose disputed debts resurrected
    if (net[from] === undefined) net[from] = 0;
    if (net[to] === undefined) net[to] = 0;

    net[from] -= entry.amount;
    net[to] += entry.amount;
  }

  const debtors = [];
  const creditors = [];

  for (const user in net) {
    const amount = net[user];

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

    const settledAmount = Math.min(d.amount, c.amount);

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
      amountRupees: (settledAmount / 100).toFixed(2),
    });

    d.amount -= settledAmount;
    c.amount -= settledAmount;

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
  date,
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

    // ✅ Convert input (rupees) to integer (paise)
    const amountPaise = Math.round(amount * 100);

    // LOGIC FLAW FIX: Min-Cash-Flow Transitive Routing!
    // If users settle based on the Simplified Plan (A pays C), the raw ledger (A->B, B->C) won't have a direct A->C debt.
    // Instead of throwing an error, we mathematically resolve the graph by manipulating the edge or injecting a counter-cyclic edge!
    
    const forward = await Ledger.findOne({
      group: groupId,
      from: fromUserId,
      to: toUserId,
    }).session(session);

    if (forward) {
      if (amountPaise > forward.amount) {
        throw new Error(`Amount exceeds specific pairwise debt (₹${(forward.amount / 100).toFixed(2)})`);
      }
      if (forward.amount === amountPaise) {
        await forward.deleteOne({ session });
      } else {
        forward.amount -= amountPaise;
        await forward.save({ session });
      }
    } else {
      // Check reverse edge
      const reverse = await Ledger.findOne({
        group: groupId,
        from: toUserId,
        to: fromUserId,
      }).session(session);

      if (reverse) {
        // If they already owed the payer, the payer giving them MORE money increases their debt!
        reverse.amount += amountPaise;
        await reverse.save({ session });
      } else {
        // Graph Transitive Settlement: Inject a counter-cyclic edge!
        // A pays C. C now owes A mathematically. This brilliantly zeroes out the net matrix.
        await Ledger.create(
          [{ group: groupId, from: toUserId, to: fromUserId, amount: amountPaise }],
          { session }
        );
      }
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
          amount: amountPaise,
          date: date || new Date(),
          status: "pending",
          settledBy: fromUserId,
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
    emitEvent(groupId.toString(), "group:debt:settled", {
      from: fromUserId,
      to: toUserId,
      amount: (amountPaise / 100).toFixed(2),
    });

    emitEvent(groupId, "group:balance:updated");

    // FR2.8 — activity log
    logActivity(groupId.toString(), fromUserId, "settlement:recorded",
      `Settlement of ₹${(amountPaise / 100).toFixed(2)} recorded via ${method}`,
      { toUserId, amountPaise, method });

    return { message: "Settlement successful" };

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// ======================
// REVIEW SETTLEMENT (FR6.4 - OWNER/MANAGER ONLY)
// ======================
export const reviewSettlement = async (settlementId, status, requesterId) => {
  if (!mongoose.Types.ObjectId.isValid(settlementId)) throw new Error("Invalid settlement ID");
  if (!["confirmed", "disputed"].includes(status)) throw new Error("Invalid status type");

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const settlement = await Settlement.findById(settlementId).session(session);
    if (!settlement) throw new Error("Settlement not found");

    if (settlement.status !== "pending") {
      throw new Error(`Settlement is already marked as ${settlement.status}`);
    }

    const group = await Group.findById(settlement.group).session(session);
    if (!group) throw new Error("Group not found");

    const member = group.getMember(requesterId);
    if (!member || !["owner", "manager"].includes(member.role)) {
      throw new Error("Only an Owner or Manager can review a settlement");
    }

    // Update status
    settlement.status = status;
    await settlement.save({ session });

    // ======================
    // IF DISPUTED -> REVERSE LEDGER (FR6.4)
    // ======================
    // The settlement was natively a payment from `from` to `to`, thereby dynamically REDUCING debt
    // If it's disputed, that payment didn't exist -> we must ADD the debt back.
    if (status === "disputed") {
      const forward = await Ledger.findOne({
        group: settlement.group,
        from: settlement.from,
        to: settlement.to,
      }).session(session);

      if (forward) {
        forward.amount += settlement.amount;
        await forward.save({ session });
      } else {
        // Did the ledger get heavily netted to zero / inverted? Add explicitly back to forward debt
        await Ledger.create(
          [
            {
              group: settlement.group,
              from: settlement.from,
              to: settlement.to,
              amount: settlement.amount,
              expense: settlement._id, // tie it to settlement as an operation placeholder
            },
          ],
          { session }
        );
      }
    }

    // ======================
    // CACHE INVALIDATION
    // ======================
    try {
      await redisClient.del(`balances:${settlement.group}`);
      await redisClient.del(`settlements:${settlement.group}`);
    } catch (_) {}

    await session.commitTransaction();
    session.endSession();

    // ======================
    // 🔥 EVENTS
    // ======================
    emitEvent(settlement.group.toString(), "group:debt:reviewed", {
      settlementId,
      status,
    });
    
    if (status === "disputed") {
      emitEvent(settlement.group.toString(), "group:balance:updated");
    }

    // FR2.8 — activity log
    logActivity(settlement.group.toString(), requesterId,
      status === "confirmed" ? "settlement:confirmed" : "settlement:disputed",
      `Settlement ${status}`,
      { settlementId, status });

    return { message: `Settlement marked as ${status} successfully`, settlement };
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
    .sort({ date: -1, createdAt: -1 })
    .lean();

  // Map amounts to also include rupees string
  return settlements.map((s) => ({
    ...s,
    amountRupees: (s.amount / 100).toFixed(2),
  }));
};
