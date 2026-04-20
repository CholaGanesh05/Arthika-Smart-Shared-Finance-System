import mongoose from "mongoose";
import Expense from "../models/expense.model.js";
import Group from "../../groups/models/group.model.js";
import { createLedgerEntries } from "./ledger.service.js";
import redisClient from "../../../config/redis.js";
import { emitEvent } from "../../../utils/eventEmitter.js"; // ✅ ADDED

// ======================
// ADD EXPENSE (TRANSACTION SAFE)
// ======================
export const addExpense = async ({
  groupId,
  paidBy,
  amount,
  description,
  splitType,
  splits,
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // ======================
    // BASIC VALIDATION
    // ======================
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      throw new Error("Invalid group ID");
    }

    if (!mongoose.Types.ObjectId.isValid(paidBy)) {
      throw new Error("Invalid payer ID");
    }

    if (!amount || amount <= 0) {
      throw new Error("Invalid amount");
    }

    if (!["equal", "exact"].includes(splitType)) {
      throw new Error("Invalid split type");
    }

    // ======================
    // 🔥 CONVERT TO PAISE
    // ======================
    amount = Math.round(amount);

    const group = await Group.findById(groupId).session(session);

    if (!group) {
      throw new Error("Group not found");
    }

    if (!group.isMember(paidBy)) {
      throw new Error("Not authorized");
    }

    const memberIds = group.members.map((m) => m.user.toString());

    let finalSplits = [];

    // ======================
    // EQUAL SPLIT
    // ======================
    if (splitType === "equal") {
      const n = memberIds.length;

      const base = Math.floor(amount / n);
      let remainder = amount % n;

      finalSplits = memberIds.map((userId) => {
        let share = base;

        if (remainder > 0) {
          share += 1;
          remainder--;
        }

        return {
          user: userId,
          amount: share,
        };
      });
    }

    // ======================
    // EXACT SPLIT
    // ======================
    if (splitType === "exact") {
      if (!splits || splits.length === 0) {
        throw new Error("Splits required for exact type");
      }

      let total = 0;
      const seen = new Set();

      for (const s of splits) {
        if (!mongoose.Types.ObjectId.isValid(s.user)) {
          throw new Error("Invalid user in splits");
        }

        if (!memberIds.includes(s.user.toString())) {
          throw new Error("User not in group");
        }

        if (seen.has(s.user.toString())) {
          throw new Error("Duplicate user in splits");
        }

        if (s.amount <= 0) {
          throw new Error("Invalid split amount");
        }

        seen.add(s.user.toString());
        total += Math.round(s.amount);
      }

      if (total !== amount) {
        throw new Error("Split total must equal amount");
      }

      finalSplits = splits.map((s) => ({
        user: s.user,
        amount: Math.round(s.amount),
      }));
    }

    // ======================
    // CREATE EXPENSE
    // ======================
    const expenseArr = await Expense.create(
      [
        {
          group: groupId,
          paidBy,
          amount,
          description,
          splitType,
          splits: finalSplits,
        },
      ],
      { session }
    );

    const createdExpense = expenseArr[0];

    // ======================
    // CREATE LEDGER
    // ======================
    await createLedgerEntries(
      {
        groupId,
        paidBy,
        splits: finalSplits,
        expenseId: createdExpense._id,
      },
      session
    );

    // ======================
    // 🔥 CACHE INVALIDATION
    // ======================
    await redisClient.del(`balances:${groupId}`);
    await redisClient.del(`settlements:${groupId}`);

    // ======================
    // COMMIT
    // ======================
    await session.commitTransaction();
    session.endSession();

    // ======================
    // 🔥 CLEAN EVENT SYSTEM
    // ======================
    emitEvent(groupId, "group:expense:created", {
      expenseId: createdExpense._id,
    });

    emitEvent(groupId, "group:balance:updated");

    return createdExpense;

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// ======================
// GET GROUP EXPENSES
// ======================
export const getGroupExpenses = async (groupId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    throw new Error("Invalid group ID");
  }

  const group = await Group.findById(groupId);

  if (!group) {
    throw new Error("Group not found");
  }

  if (!group.isMember(userId)) {
    throw new Error("Not authorized");
  }

  const expenses = await Expense.find({ group: groupId })
    .populate("paidBy", "name email")
    .populate("splits.user", "name email")
    .sort({ createdAt: -1 })
    .lean();

  return expenses;
};