import {
  createFund,
  contributeToFund,
  withdrawFromFund,
  getFundDetails,
} from "../services/fund.service.js";


// ======================
// CREATE FUND
// ======================
export const createFundController = async (req, res, next) => {
  try {
    const fund = await createFund({
      groupId: req.params.groupId,
      userId: req.user._id,
      ...req.body,
    });

    res.status(201).json({
      success: true,
      message: "Fund created successfully",
      data: fund,
    });
  } catch (err) {
    next(err);
  }
};


// ======================
// CONTRIBUTE
// ======================
export const contributeController = async (req, res, next) => {
  try {
    const result = await contributeToFund({
      fundId: req.params.fundId,
      userId: req.user._id,
      ...req.body,
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
// WITHDRAW
// ======================
export const withdrawController = async (req, res, next) => {
  try {
    const result = await withdrawFromFund({
      fundId: req.params.fundId,
      userId: req.user._id,
      ...req.body,
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
// GET FUND DETAILS
// ======================
export const getFundController = async (req, res, next) => {
  try {
    const data = await getFundDetails(req.params.fundId);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};