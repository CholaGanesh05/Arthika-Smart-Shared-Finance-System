import mongoose from "mongoose";
import Fund from "../models/fund.model.js";
import FundTransaction from "../models/fundTransaction.model.js";
import Group from "../../groups/models/group.model.js";
import redisClient from "../../../config/redis.js";


// ======================
// CREATE FUND
// ======================
export const createFund = async ({ groupId, userId, name, description }) => {
  const group = await Group.findById(groupId);

  if (!group) throw new Error("Group not found");
  if (!group.isMember(userId)) throw new Error("Not authorized");

  const fund = await Fund.create({
    group: groupId,
    name,
    description,
    createdBy: userId,
  });

  return fund;
};


// ======================
// CONTRIBUTE (TRANSACTION SAFE)
// ======================
export const contributeToFund = async ({
  fundId,
  userId,
  amount,
  description,
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!amount || amount <= 0) {
      throw new Error("Invalid amount");
    }

    const fund = await Fund.findById(fundId).session(session);
    if (!fund || !fund.isUsable()) {
      throw new Error("Fund not available");
    }

    // create transaction
    await FundTransaction.create(
      [
        {
          fund: fundId,
          group: fund.group,
          user: userId,
          type: "contribution",
          amount,
          description,
        },
      ],
      { session }
    );

    // commit
    await session.commitTransaction();
    session.endSession();

    // 🔥 cache invalidation
    await redisClient.del(`fund:${fundId}`);

    return { message: "Contribution successful" };

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};


// ======================
// WITHDRAW (STRICT CONTROL)
// ======================
export const withdrawFromFund = async ({
  fundId,
  userId,
  amount,
  description,
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!amount || amount <= 0) {
      throw new Error("Invalid amount");
    }

    const fund = await Fund.findById(fundId).session(session);
    if (!fund || !fund.isUsable()) {
      throw new Error("Fund not available");
    }

    // 🔥 compute balance INSIDE transaction
    const balance = await FundTransaction.computeBalance(fundId);

    if (amount > balance) {
      throw new Error("Insufficient fund balance");
    }

    await FundTransaction.create(
      [
        {
          fund: fundId,
          group: fund.group,
          user: userId,
          type: "withdrawal",
          amount,
          description,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    // 🔥 cache invalidation
    await redisClient.del(`fund:${fundId}`);

    return { message: "Withdrawal successful" };

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};


// ======================
// GET FUND DETAILS (CACHED)
// ======================
export const getFundDetails = async (fundId) => {
  const cacheKey = `fund:${fundId}`;

  // cache read
  const cached = await redisClient.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const fund = await Fund.findById(fundId).lean();
  if (!fund || fund.isDeleted) {
    throw new Error("Fund not found");
  }

  const balance = await FundTransaction.computeBalance(fundId);

  const result = {
    ...fund,
    balance,
  };

  // cache write
  await redisClient.set(cacheKey, JSON.stringify(result), "EX", 300);

  return result;
};