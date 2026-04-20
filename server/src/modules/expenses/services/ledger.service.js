import Ledger from "../models/ledger.model.js";

// ======================
// CREATE LEDGER ENTRIES (BATCH + NETTING)
// ======================
export const createLedgerEntries = async (
  { groupId, paidBy, splits, expenseId },
  session
) => {
  const payerId = paidBy.toString();

  // ======================
  // FILTER VALID SPLITS (PAISE SAFE)
  // ======================
  const validSplits = splits
    .map((s) => ({
      userId: s.user.toString(),
      amount: Math.round(s.amount), // ✅ FIXED (no float)
    }))
    .filter((s) => s.userId !== payerId);

  if (validSplits.length === 0) return;

  const userIds = validSplits.map((s) => s.userId);

  // ======================
  // FETCH ALL RELEVANT LEDGER ENTRIES (ONE QUERY)
  // ======================
  const existing = await Ledger.find({
    group: groupId,
    $or: [
      { from: payerId, to: { $in: userIds } },
      { from: { $in: userIds }, to: payerId },
    ],
  }).session(session);

  // ======================
  // CREATE MAP
  // ======================
  const ledgerMap = new Map();

  for (const entry of existing) {
    const key = `${entry.from}-${entry.to}`;
    ledgerMap.set(key, entry);
  }

  const operations = [];

  // ======================
  // PROCESS EACH SPLIT
  // ======================
  for (const { userId, amount } of validSplits) {
    const reverseKey = `${payerId}-${userId}`;
    const forwardKey = `${userId}-${payerId}`;

    const reverse = ledgerMap.get(reverseKey);
    const forward = ledgerMap.get(forwardKey);

    if (reverse) {
      const reverseAmount = reverse.amount; // ✅ FIXED

      if (reverseAmount > amount) {
        // reduce reverse
        operations.push({
          updateOne: {
            filter: { _id: reverse._id },
            update: {
              $inc: { amount: -amount }, // ✅ FIXED
            },
          },
        });

      } else if (reverseAmount < amount) {
        // delete reverse
        operations.push({
          deleteOne: { filter: { _id: reverse._id } },
        });

        const remaining = amount - reverseAmount;

        // upsert forward
        operations.push({
          updateOne: {
            filter: {
              group: groupId,
              from: userId,
              to: payerId,
            },
            update: {
              $inc: { amount: remaining },
              $set: { expense: expenseId },
            },
            upsert: true, // ✅ FIXED
          },
        });

      } else {
        // equal → delete
        operations.push({
          deleteOne: { filter: { _id: reverse._id } },
        });
      }

    } else if (forward) {
      // ✅ FIXED: forward entry exists → increment
      operations.push({
        updateOne: {
          filter: { _id: forward._id },
          update: {
            $inc: { amount },
          },
        },
      });

    } else {
      // no entry → upsert
      operations.push({
        updateOne: {
          filter: {
            group: groupId,
            from: userId,
            to: payerId,
          },
          update: {
            $inc: { amount },
            $set: { expense: expenseId },
          },
          upsert: true, // ✅ FIXED
        },
      });
    }
  }

  // ======================
  // BULK WRITE (🔥 FAST)
  // ======================
  if (operations.length > 0) {
    await Ledger.bulkWrite(operations, { session });
  }
};