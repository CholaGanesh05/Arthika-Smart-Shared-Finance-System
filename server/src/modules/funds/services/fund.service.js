import mongoose from "mongoose";
import Fund from "../models/fund.model.js";
import FundTransaction from "../models/fundTransaction.model.js";
import Group from "../../groups/models/group.model.js";
import redisClient from "../../../config/redis.js";
import { emitEvent } from "../../../utils/eventEmitter.js";


// ======================
// HELPER — rupees → paise
// ======================
const toPaise = (amount) => Math.round(parseFloat(amount) * 100);


// ======================
// FR4.1 + FR4.2 — CREATE FUND
// Owner or Manager only; accepts optional targetAmount
// ======================
export const createFund = async ({
  groupId,
  userId,
  name,
  description,
  targetAmount,
  type,
}) => {
  const group = await Group.findById(groupId);
  if (!group) throw new Error("Group not found");
  if (!group.isMember(userId)) throw new Error("You are not a member of this group");

  const member = group.getMember(userId);
  if (!["owner", "manager"].includes(member.role)) {
    throw new Error("Only an Owner or Manager can create a fund");
  }

  const fundData = {
    group: groupId,
    name,
    createdBy: userId,
  };

  if (description) fundData.description = description;
  if (type)        fundData.type = type;

  // FR4.2 — targetAmount stored in paise
  if (targetAmount !== undefined && targetAmount !== null) {
    fundData.targetAmount = toPaise(targetAmount);
  }

  const fund = await Fund.create(fundData);
  return fund;
};


// ======================
// FR4.3 — CONTRIBUTE
// ANY group member may contribute; contributions recorded individually
// ======================
export const contributeToFund = async ({
  fundId,
  userId,
  amount,
  description,
  date,
}) => {
  if (!amount || amount <= 0) throw new Error("Invalid amount");

  const fund = await Fund.findById(fundId);
  if (!fund || !fund.isUsable()) throw new Error("Fund not available");

  // Verify the user is a member of the fund's group
  const group = await Group.findById(fund.group);
  if (!group) throw new Error("Fund group not found");
  if (!group.isMember(userId)) throw new Error("You are not a member of this group");

  const amountInPaise = toPaise(amount);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // FR4.3 — record contribution individually
    const [txn] = await FundTransaction.create(
      [
        {
          fund: fundId,
          group: fund.group,
          user: userId,
          type: "contribution",
          amount: amountInPaise,
          date: date || new Date(),
          description,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    // invalidate cache
    await redisClient.del(`fund:${fundId}`);

    // TOP 1% ADDITION: Broadcast real-time event to sync UI dynamically
    emitEvent(fund.group.toString(), "group:fund:contributed", {
      fundId,
      userId,
      amount: (amountInPaise / 100).toFixed(2)
    });

    return {
      message: "Contribution recorded successfully",
      transaction: txn,
    };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};


// ======================
// FR4.4 — WITHDRAW
// Owner or Manager only; description is mandatory (enforced here too)
// ======================
export const withdrawFromFund = async ({
  fundId,
  userId,
  amount,
  description,
  date,
}) => {
  if (!amount || amount <= 0) throw new Error("Invalid amount");

  // FR4.4 — mandatory reason
  if (!description || description.trim() === "") {
    throw new Error("A reason/description is mandatory for withdrawals");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
      // LOGIC FLAW FIX: Double-Spend Concurrency Vulnerability!
      // If two managers withdraw simultaneously, both read the same balance and bypass the check.
      // We explicitly FORCE a write-lock on the Fund document within this atomic session!
      const fund = await Fund.findOneAndUpdate(
        { _id: fundId },
        { $set: { updatedAt: new Date() } },
        { session, new: true }
      );
      if (!fund || !fund.isUsable()) throw new Error("Fund not available");

    const group = await Group.findById(fund.group).session(session);
    if (!group) throw new Error("Fund group not found");

    const member = group.getMember(userId);
    if (!member) throw new Error("You are not a member of this group");
    if (!["owner", "manager"].includes(member.role)) {
      throw new Error("Only an Owner or Manager can withdraw from a fund");
    }

    // FR4.5 — balance is always computed; never stored
    const balance = await FundTransaction.computeBalance(fundId);

    const amountInPaise = toPaise(amount);

    if (amountInPaise > balance) {
      throw new Error(
        `Insufficient fund balance. Available: ₹${(balance / 100).toFixed(2)}`
      );
    }

    const [txn] = await FundTransaction.create(
      [
        {
          fund: fundId,
          group: fund.group,
          user: userId,
          type: "withdrawal",
          amount: amountInPaise,
          date: date || new Date(),
          description: description.trim(),
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    await redisClient.del(`fund:${fundId}`);

    // TOP 1% ADDITION: Broadcast real-time withdrawal sync
    emitEvent(fund.group.toString(), "group:fund:withdrawn", {
      fundId,
      userId,
      amount: (amountInPaise / 100).toFixed(2)
    });

    return {
      message: "Withdrawal recorded successfully",
      transaction: txn,
    };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};


// ======================
// FR4.2 + FR4.5 — GET FUND DETAILS (with computed balance)
// ======================
export const getFundDetails = async (fundId) => {
  const cacheKey = `fund:${fundId}`;

  const cached = await redisClient.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const fund = await Fund.findById(fundId)
    .populate("createdBy", "name email")
    .lean();

  if (!fund || fund.isDeleted) throw new Error("Fund not found");

  // FR4.5 — balance computed at read time
  const balance = await FundTransaction.computeBalance(fundId);

  const result = {
    ...fund,
    // expose in rupees for the consumer
    balancePaise: balance,
    balanceRupees: (balance / 100).toFixed(2),
    targetAmountRupees: fund.targetAmount
      ? (fund.targetAmount / 100).toFixed(2)
      : null,
  };

  await redisClient.set(cacheKey, JSON.stringify(result), "EX", 300);
  return result;
};


// ======================
// FR4.6 — CONTRIBUTION HISTORY PER FUND (dedicated)
// Returns individual transactions with user info
// ======================
export const getFundContributions = async (fundId, { type } = {}) => {
  const fund = await Fund.findById(fundId).lean();
  if (!fund || fund.isDeleted) throw new Error("Fund not found");

  const filter = { fund: fundId, isDeleted: false };
  if (type === "contribution" || type === "withdrawal") {
    filter.type = type;
  }

  const transactions = await FundTransaction.find(filter)
    .populate("user", "name email")
    .sort({ date: -1, createdAt: -1 })
    .lean();

  // annotate with rupee values
  const annotated = transactions.map((t) => ({
    ...t,
    amountRupees: (t.amount / 100).toFixed(2),
  }));

  return {
    fundId,
    fundName: fund.name,
    total: annotated.length,
    transactions: annotated,
  };
};


// ======================
// FR4.7 — DEACTIVATE FUND
// Sets isActive = false (soft deactivation, not deletion)
// ======================
export const deactivateFund = async (fundId, userId) => {
  const fund = await Fund.findById(fundId);
  if (!fund) throw new Error("Fund not found");
  if (!fund.isActive) throw new Error("Fund is already deactivated");

  const group = await Group.findById(fund.group);
  if (!group) throw new Error("Fund group not found");

  const member = group.getMember(userId);
  if (!member || !["owner", "manager"].includes(member.role)) {
    throw new Error("Only an Owner or Manager can deactivate a fund");
  }

  // FR4.7 — deactivation: mark isActive = false (not deleted)
  fund.isActive = false;
  await fund.save();

  await redisClient.del(`fund:${fundId}`);

  return { message: "Fund deactivated successfully" };
};


// ======================
// LIST ACTIVE FUNDS FOR A GROUP
// ======================
export const listGroupFunds = async (groupId, userId) => {
  const group = await Group.findById(groupId);
  if (!group) throw new Error("Group not found");
  if (!group.isMember(userId)) throw new Error("You are not a member of this group");

  const funds = await Fund.find({
    group: groupId,
    isActive: true,
    isDeleted: false,
  })
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 })
    .lean();

  // compute balances for each fund
  const withBalances = await Promise.all(
    funds.map(async (f) => {
      const balance = await FundTransaction.computeBalance(f._id);
      return {
        ...f,
        balancePaise: balance,
        balanceRupees: (balance / 100).toFixed(2),
        targetAmountRupees: f.targetAmount
          ? (f.targetAmount / 100).toFixed(2)
          : null,
      };
    })
  );

  return withBalances;
};
