import mongoose from "mongoose";
import Ledger from "../models/ledger.model.js";
import Group from "../../groups/models/group.model.js";
import redisClient from "../../../config/redis.js";

// ======================
// GET GROUP BALANCES
// ======================
export const getGroupBalances = async (groupId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    throw new Error("Invalid group ID");
  }

  // ======================
  // 🔥 CHECK CACHE FIRST
  // ======================
  const cacheKey = `balances:${groupId}`;
  const cached = await redisClient.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  // ======================
  // FETCH GROUP
  // ======================
  const group = await Group.findById(groupId);

  if (!group) {
    throw new Error("Group not found");
  }

  // 🔐 ACCESS CONTROL
  if (!group.isMember(userId)) {
    throw new Error("Not authorized");
  }

  // ======================
  // FETCH LEDGER
  // ======================
  const ledger = await Ledger.find({ group: groupId })
    .populate("from", "name email")
    .populate("to", "name email")
    .lean();

  // ======================
  // AGGREGATE BALANCES
  // ======================
  const balanceMap = new Map();

  for (const entry of ledger) {
    const fromId = entry.from._id.toString();
    const toId = entry.to._id.toString();

    const key = `${fromId}-${toId}`;

    if (!balanceMap.has(key)) {
      balanceMap.set(key, {
        from: {
          id: fromId,
          name: entry.from.name,
          email: entry.from.email,
        },
        to: {
          id: toId,
          name: entry.to.name,
          email: entry.to.email,
        },
        amount: 0,
      });
    }

    const existing = balanceMap.get(key);
    existing.amount += entry.amount;
  }

  // ======================
  // FINAL FORMAT
  // ======================
  const balances = Array.from(balanceMap.values()).map((b) => ({
    ...b,
    amount: b.amount,
    amountRupees: (b.amount / 100).toFixed(2),
  }));

  // ======================
  // 🔥 SAVE TO CACHE (TTL: 300s)
  // ======================
  await redisClient.set(
    cacheKey,
    JSON.stringify(balances),
    "EX",
    300
  );

  return balances;
};