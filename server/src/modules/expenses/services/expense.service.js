import mongoose from "mongoose";
import Expense from "../models/expense.model.js";
import Group from "../../groups/models/group.model.js";
import { createLedgerEntries } from "./ledger.service.js";
import redisClient from "../../../config/redis.js";
import { emitEvent } from "../../../utils/eventEmitter.js";
import { logActivity } from "../../groups/services/activityLog.service.js";

// ======================
// HELPER — rupees → paise
// ======================
const toPaise = (v) => Math.round(parseFloat(v) * 100);


// ======================
// FR3.1–FR3.5 — ADD EXPENSE (TRANSACTION SAFE)
// paidBy may be any group member (FR3.1 says "payer(s)")
// ======================
export const addExpense = async ({
  groupId,
  paidBy,       // can be any member, passed explicitly from controller
  title,
  amount,       // in rupees from client → converted to paise here
  date,
  description,
  category,
  splitType,
  splits,
  receiptUrl = "",
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // ======================
    // BASIC VALIDATION
    // ======================
    if (!mongoose.Types.ObjectId.isValid(groupId)) throw new Error("Invalid group ID");
    if (!mongoose.Types.ObjectId.isValid(paidBy))  throw new Error("Invalid payer ID");
    if (!amount || amount <= 0)                      throw new Error("Invalid amount");

    if (!["equal", "exact", "percentage", "shares"].includes(splitType)) {
      throw new Error("Invalid split type");
    }

    // ======================
    // FR3.1 — Convert to paise (integer arithmetic only)
    // ======================
    const amountPaise = toPaise(amount);

    const group = await Group.findById(groupId).session(session);
    if (!group) throw new Error("Group not found");

    // FR3.1 — the payer must be a group member
    if (!group.isMember(paidBy)) {
      throw new Error("Payer is not a member of this group");
    }

    const memberIds = group.members.map((m) => m.user.toString());

    let finalSplits = [];

    // ======================
    // FR3.2a — EQUAL SPLIT
    // Total divided equally among ALL selected members
    // ======================
    if (splitType === "equal") {
      // splits array may optionally specify a subset of members
      const targetIds =
        splits && splits.length > 0
          ? splits.map((s) => s.user.toString())
          : memberIds;

      // validate subset members are in the group
      for (const uid of targetIds) {
        if (!memberIds.includes(uid)) throw new Error(`User ${uid} is not in the group`);
      }

      const n = targetIds.length;
      const base = Math.floor(amountPaise / n);
      let remainder = amountPaise % n;

      finalSplits = targetIds.map((userId) => {
        let share = base;
        if (remainder > 0) { share += 1; remainder--; }
        return { user: userId, amount: share };
      });
    }

    // ======================
    // FR3.2b — CUSTOM AMOUNT SPLIT (exact)
    // Each member's share specified manually
    // ======================
    if (splitType === "exact") {
      if (!splits || splits.length === 0) throw new Error("Splits required for exact split");

      let total = 0;
      const seen = new Set();

      for (const s of splits) {
        if (!mongoose.Types.ObjectId.isValid(s.user)) throw new Error("Invalid user in splits");
        if (!memberIds.includes(s.user.toString()))   throw new Error("User not in group");
        if (seen.has(s.user.toString()))               throw new Error("Duplicate user in splits");
        if (s.amount <= 0)                             throw new Error("Split amount must be > 0");

        seen.add(s.user.toString());
        total += toPaise(s.amount);
      }

      // FR3.3 — sum must equal total
      if (total !== amountPaise) {
        throw new Error(
          `Split total (${(total / 100).toFixed(2)}) must equal expense amount (${(amountPaise / 100).toFixed(2)})`
        );
      }

      finalSplits = splits.map((s) => ({ user: s.user, amount: toPaise(s.amount) }));
    }

    // ======================
    // FR3.2c — PERCENTAGE SPLIT
    // Percentages must sum to exactly 100
    // ======================
    if (splitType === "percentage") {
      if (!splits || splits.length === 0) throw new Error("Splits required for percentage split");

      let totalPercent = 0;
      const seen = new Set();

      for (const s of splits) {
        if (!mongoose.Types.ObjectId.isValid(s.user)) throw new Error("Invalid user in splits");
        if (!memberIds.includes(s.user.toString()))   throw new Error("User not in group");
        if (seen.has(s.user.toString()))               throw new Error("Duplicate user in splits");
        if (s.amount <= 0 || s.amount > 100)          throw new Error("Percentage must be between 0 and 100");

        seen.add(s.user.toString());
        totalPercent += s.amount;
      }

      // FR3.3 — percentages must sum to 100
      if (Math.round(totalPercent) !== 100) {
        throw new Error(`Total percentage (${totalPercent}) must equal 100`);
      }

      let allocated = 0;
      finalSplits = splits.map((s, idx) => {
        let share = Math.floor(amountPaise * (s.amount / 100));
        if (idx === splits.length - 1) share = amountPaise - allocated;
        allocated += share;
        return { user: s.user, amount: share };
      });
    }

    // ======================
    // FR3.2d — SHARES SPLIT
    // Relative shares e.g. 2:1:1
    // ======================
    if (splitType === "shares") {
      if (!splits || splits.length === 0) throw new Error("Splits required for shares split");

      let totalShares = 0;
      const seen = new Set();

      for (const s of splits) {
        if (!mongoose.Types.ObjectId.isValid(s.user)) throw new Error("Invalid user in splits");
        if (!memberIds.includes(s.user.toString()))   throw new Error("User not in group");
        if (seen.has(s.user.toString()))               throw new Error("Duplicate user in splits");
        if (s.amount <= 0)                             throw new Error("Share value must be > 0");

        seen.add(s.user.toString());
        totalShares += s.amount;
      }

      let allocated = 0;
      finalSplits = splits.map((s, idx) => {
        let share = Math.floor(amountPaise * (s.amount / totalShares));
        if (idx === splits.length - 1) share = amountPaise - allocated;
        allocated += share;
        return { user: s.user, amount: share };
      });
    }

    // ======================
    // FR3.3 — Final guard: sum of finalSplits must equal amountPaise
    // ======================
    const splitSum = finalSplits.reduce((acc, s) => acc + s.amount, 0);
    if (splitSum !== amountPaise) {
      throw new Error(`Internal split error: sum ${splitSum} ≠ amount ${amountPaise}`);
    }

    // ======================
    // CREATE EXPENSE DOCUMENT
    // ======================
    const expenseArr = await Expense.create(
      [
        {
          group: groupId,
          paidBy,
          title,
          amount: amountPaise,
          date: date || new Date(),
          description,
          category: category || "Other",
          splitType,
          splits: finalSplits,
          receiptUrl,
        },
      ],
      { session }
    );

    const createdExpense = expenseArr[0];

    // ======================
    // FR3.7 — Update member balances via ledger
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

    // Invalidate balance/settlement caches
    await redisClient.del(`balances:${groupId}`);
    await redisClient.del(`settlements:${groupId}`);

    await session.commitTransaction();
    session.endSession();

    // Real-time Push
    emitEvent(groupId.toString(), "expense:created", { 
      title: createdExpense.title,
      amount: (createdExpense.amount / 100).toFixed(2),
      expenseId: createdExpense._id 
    });

    // FR2.8 — activity log
    logActivity(groupId.toString(), paidBy, "expense:created",
      `Expense "${title}" of ₹${(amountPaise / 100).toFixed(2)} added`,
      { expenseId: createdExpense._id, amount: amountPaise, category });

    return createdExpense;

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};


// ======================
// FR3.8 — GET GROUP EXPENSES (with filters)
// Supports: date range, category, paidBy, splits.user
// ======================
export const getGroupExpenses = async (groupId, userId, filters = {}) => {
  if (!mongoose.Types.ObjectId.isValid(groupId)) throw new Error("Invalid group ID");

  const group = await Group.findById(groupId);
  if (!group)               throw new Error("Group not found");
  if (!group.isMember(userId)) throw new Error("Not authorized");

  const query = { group: groupId };

  // FR3.8 — date range filter
  if (filters.from || filters.to) {
    query.date = {};
    if (filters.from) query.date.$gte = new Date(filters.from);
    if (filters.to) {
      // LOGIC FLAW FIX: Shift the 'to' boundary to the absolute end of the day (23:59:59.999) 
      // Otherwise expenses recorded later on the exact 'to' date would mathematically be excluded!
      const toDate = new Date(filters.to);
      toDate.setHours(23, 59, 59, 999);
      query.date.$lte = toDate;
    }
  }

  // FR3.8 — category filter
  if (filters.category) {
    query.category = filters.category;
  }

  // FR3.8 — filter by payer
  if (filters.paidBy && mongoose.Types.ObjectId.isValid(filters.paidBy)) {
    query.paidBy = filters.paidBy;
  }

  // FR3.8 — filter by any member involved (payer OR in splits)
  if (filters.member && mongoose.Types.ObjectId.isValid(filters.member)) {
    query.$or = [
      { paidBy: filters.member },
      { "splits.user": filters.member },
    ];
  }

  const expenses = await Expense.find(query)
    .populate("paidBy", "name email")
    .populate("splits.user", "name email")
    .sort({ date: -1, createdAt: -1 })
    .lean();

  // annotate with rupee amounts for convenience
  return expenses.map((e) => ({
    ...e,
    amountRupees: (e.amount / 100).toFixed(2),
    splits: e.splits.map((s) => ({
      ...s,
      amountRupees: (s.amount / 100).toFixed(2),
    })),
  }));
};


// ======================
// FR3.6 — EDIT EXPENSE (metadata only)
// Creator or Owner/Manager only
// Note: amount/split changes require delete + re-create (prevents ledger corruption)
// ======================
export const editExpense = async (expenseId, updates, requesterId) => {
  if (!mongoose.Types.ObjectId.isValid(expenseId)) throw new Error("Invalid expense ID");

  const expense = await Expense.findById(expenseId);
  if (!expense) throw new Error("Expense not found");

  const group = await Group.findById(expense.group);
  if (!group) throw new Error("Group not found");

  const member = group.getMember(requesterId);
  if (!member) throw new Error("Not authorized");

  const isCreator    = expense.paidBy.toString() === requesterId.toString();
  const isPrivileged = ["owner", "manager"].includes(member.role);

  if (!isCreator && !isPrivileged) {
    throw new Error("Only the expense creator or a group Owner/Manager can edit this expense");
  }

  // Allowed metadata updates (amount/split changes must go through delete + re-add)
  const ALLOWED = ["title", "date", "description", "category", "receiptUrl"];
  for (const key of ALLOWED) {
    if (updates[key] !== undefined) expense[key] = updates[key];
  }

  await expense.save();

  // FR8: Emit Event
  emitEvent(expense.group.toString(), "expense:updated", { 
    title: expense.title,
    amount: (expense.amount / 100).toFixed(2),
    expenseId: expense._id 
  });

  // FR2.8 — activity log
  logActivity(expense.group.toString(), requesterId, "expense:updated",
    `Expense "${expense.title}" was edited`,
    { expenseId: expense._id });

  return expense;
};


// ======================
// FR3.6 + FR3.7 — DELETE EXPENSE
// Reverses ledger entries atomically
// ======================
export const deleteExpense = async (expenseId, requesterId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!mongoose.Types.ObjectId.isValid(expenseId)) throw new Error("Invalid expense ID");

    const expense = await Expense.findById(expenseId).session(session);
    if (!expense) throw new Error("Expense not found");

    const group = await Group.findById(expense.group).session(session);
    if (!group) throw new Error("Group not found");

    const member = group.getMember(requesterId);
    if (!member) throw new Error("Not authorized");

    const isCreator    = expense.paidBy.toString() === requesterId.toString();
    const isPrivileged = ["owner", "manager"].includes(member.role);

    if (!isCreator && !isPrivileged) {
      throw new Error("Only the expense creator or a group Owner/Manager can delete this expense");
    }

    // ======================
    // FR3.7 — Reverse ledger entries
    // For each non-payer split: reduce userId→payerId by split amount
    // ======================
    const Ledger        = mongoose.model("Ledger");
    const payerId       = expense.paidBy.toString();
    const groupObjectId = expense.group;

    for (const split of expense.splits) {
      const splitUserId = split.user.toString();
      if (splitUserId === payerId) continue; // payer's own share — no ledger entry

      const splitAmount = split.amount; // already in paise

      // Primary direction: userId owes payerId
      const forward = await Ledger.findOne({
        group: groupObjectId,
        from:  splitUserId,
        to:    payerId,
      }).session(session);

      if (forward) {
        if (forward.amount === splitAmount) {
          await forward.deleteOne({ session });
        } else if (forward.amount > splitAmount) {
          forward.amount -= splitAmount;
          await forward.save({ session });
        } else {
          // LOGIC FLAW FIX: If forward < splitAmount, it means they already partially or fully paid!
          // Deleting this expense means they actually OVERPAID! We MUST explicitly create a reverse debt mapping!
          const remaining = splitAmount - forward.amount;
          await forward.deleteOne({ session });
          await Ledger.create([{ group: groupObjectId, from: payerId, to: splitUserId, amount: remaining }], { session });
        }
      } else {
        // Ledger may be netted: payerId→userId entry exists
        const reverse = await Ledger.findOne({
          group: groupObjectId,
          from:  payerId,
          to:    splitUserId,
        }).session(session);

        if (reverse) {
          // They already owed them! Removing this expense mathematically increases their debt!
          reverse.amount += splitAmount;
          await reverse.save({ session });
        } else {
          // LOGIC FLAW FIX: If neither exists, the ledger was perfectly settled.
          // BUT since we are deleting the expense, the settlement was a mathematical overpayment!
          // We MUST create a new reverse ledger!
          await Ledger.create([{ group: groupObjectId, from: payerId, to: splitUserId, amount: splitAmount }], { session });
        }
      }
    }

    await Expense.findByIdAndDelete(expenseId, { session });

    await redisClient.del(`balances:${groupObjectId}`);
    await redisClient.del(`settlements:${groupObjectId}`);

    await session.commitTransaction();
    session.endSession();

    emitEvent(groupObjectId.toString(), "expense:deleted", { expenseId });

    // FR2.8 — activity log
    logActivity(groupObjectId.toString(), requesterId, "expense:deleted",
      `Expense was deleted`, { expenseId });

    return { message: "Expense deleted successfully" };

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};