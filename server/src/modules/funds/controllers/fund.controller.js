import {
  createFund,
  contributeToFund,
  withdrawFromFund,
  getFundDetails,
  getFundContributions,
  deactivateFund,
  listGroupFunds,
} from "../services/fund.service.js";


// ======================
// FR4.1 + FR4.2 — CREATE FUND
// POST /funds/:groupId
// ======================
export const createFundController = async (req, res, next) => {
  try {
    const fund = await createFund({
      groupId: req.params.groupId,
      userId:  req.user._id,
      name:          req.body.name,
      description:   req.body.description,
      targetAmount:  req.body.targetAmount,
      type:          req.body.type,
    });

    return res.status(201).json({
      success: true,
      message: "Fund created successfully",
      data: fund,
    });
  } catch (err) {
    next(err);
  }
};


// ======================
// LIST ACTIVE FUNDS FOR A GROUP
// GET /funds/group/:groupId
// ======================
export const listGroupFundsController = async (req, res, next) => {
  try {
    const funds = await listGroupFunds(req.params.groupId, req.user._id);

    return res.status(200).json({
      success: true,
      data: funds,
    });
  } catch (err) {
    next(err);
  }
};


// ======================
// FR4.2 + FR4.5 — GET FUND DETAILS (with computed balance)
// GET /funds/:fundId
// ======================
export const getFundController = async (req, res, next) => {
  try {
    const data = await getFundDetails(req.params.fundId);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};


// ======================
// FR4.3 — CONTRIBUTE
// POST /funds/:fundId/contribute
// ======================
export const contributeController = async (req, res, next) => {
  try {
    const result = await contributeToFund({
      fundId:      req.params.fundId,
      userId:      req.user._id,
      amount:      req.body.amount,
      description: req.body.description,
      date:        req.body.date,
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.transaction,
    });
  } catch (err) {
    next(err);
  }
};


// ======================
// FR4.4 — WITHDRAW
// POST /funds/:fundId/withdraw
// ======================
export const withdrawController = async (req, res, next) => {
  try {
    const result = await withdrawFromFund({
      fundId:      req.params.fundId,
      userId:      req.user._id,
      amount:      req.body.amount,
      description: req.body.description,
      date:        req.body.date,
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.transaction,
    });
  } catch (err) {
    next(err);
  }
};


// ======================
// FR4.6 — CONTRIBUTION HISTORY PER FUND
// GET /funds/:fundId/history
// GET /funds/:fundId/history?type=contribution
// GET /funds/:fundId/history?type=withdrawal
// ======================
export const getFundHistoryController = async (req, res, next) => {
  try {
    const data = await getFundContributions(req.params.fundId, {
      type: req.query.type, // optional filter
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};


// ======================
// FR4.7 — DEACTIVATE FUND
// DELETE /funds/:fundId
// ======================
export const deactivateFundController = async (req, res, next) => {
  try {
    const result = await deactivateFund(req.params.fundId, req.user._id);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
};
