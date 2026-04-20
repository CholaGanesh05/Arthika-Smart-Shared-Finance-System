import {
  settleDebt,
  simplifyDebts,
  getSettlementHistory,
} from "../services/settlement.service.js";

// ======================
// SIMPLIFY DEBTS
// ======================
export const simplifyDebtsController = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    const data = await simplifyDebts(groupId, req.user._id);

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
};

// ======================
// SETTLE DEBT
// ======================
export const settleDebtController = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { toUserId, amount, method, reference } = req.body;

    const result = await settleDebt({
      groupId,
      fromUserId: req.user._id,
      toUserId,
      amount,
      method,
      reference,
    });

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
};

// ======================
// GET SETTLEMENT HISTORY
// ======================
export const getSettlementHistoryController = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    const data = await getSettlementHistory(groupId, req.user._id);

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
};