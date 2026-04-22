import mongoose from "mongoose";
import {
  buildGroupAnalytics,
  buildMemberAnalytics,
  generateGroupCSVData,
} from "../services/analytics.service.js";

// ======================
// GET GROUP ANALYTICS
// ======================
export const getGroupAnalytics = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const data = await buildGroupAnalytics(groupId, userId);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// ======================
// GET MEMBER ANALYTICS
// ======================
export const getMemberAnalytics = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const data = await buildMemberAnalytics(groupId, userId);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// ======================
// EXPORT GROUP TRANSACTIONS CSV
// ======================
export const exportGroupTransactionsCSV = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const csvData = await generateGroupCSVData(groupId, userId);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="group_${groupId}_transactions.csv"`);
    res.status(200).send(csvData);
  } catch (error) {
    next(error);
  }
};
