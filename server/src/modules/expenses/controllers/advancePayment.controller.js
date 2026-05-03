import {
  recordAdvancePayment,
  getGroupAdvancePayments,
} from "../services/advancePayment.service.js";

const handleControllerError = (res, next, error) => {
  if (typeof next === "function") {
    return next(error);
  }

  return res.status(500).json({
    success: false,
    message: error?.message || "Server Error",
  });
};

// POST /expenses/:groupId/advance
export const recordAdvanceController = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { amount, note, toUserId, date } = req.body;

    const advance = await recordAdvancePayment({
      groupId,
      fromUserId: req.user._id.toString(),
      toUserId,
      amount,
      date,
      note,
    });

    return res.status(201).json({
      success: true,
      message: "Advance payment recorded successfully.",
      data: advance,
    });
  } catch (err) {
    return handleControllerError(res, next, err);
  }
};

// GET /expenses/:groupId/advance
export const getAdvanceController = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const advances = await getGroupAdvancePayments(groupId, req.user._id.toString());

    return res.status(200).json({
      success: true,
      count: advances.length,
      data: advances,
    });
  } catch (err) {
    return handleControllerError(res, next, err);
  }
};
