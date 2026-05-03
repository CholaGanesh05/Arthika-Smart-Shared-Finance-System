import {
  settleDebt,
  simplifyDebts,
  getSettlementHistory,
  reviewSettlement,
} from "../services/settlement.service.js";

const handleControllerError = (res, next, error) => {
  if (typeof next === "function") {
    return next(error);
  }

  return res.status(500).json({
    success: false,
    message: error?.message || "Server Error",
  });
};

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
    return handleControllerError(res, next, err);
  }
};

// ======================
// SETTLE DEBT
// ======================
export const settleDebtController = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { toUserId, amount, date, method, reference } = req.body;

    const result = await settleDebt({
      groupId,
      fromUserId: req.user._id,
      toUserId,
      amount,
      date,
      method,
      reference,
    });

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    return handleControllerError(res, next, err);
  }
};

// ======================
// REVIEW SETTLEMENT
// ======================
export const reviewSettlementController = async (req, res, next) => {
  try {
    const { settlementId } = req.params;
    const { status } = req.body;

    const result = await reviewSettlement(settlementId, status, req.user._id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.settlement,
    });
  } catch (err) {
    return handleControllerError(res, next, err);
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
    return handleControllerError(res, next, err);
  }
};
