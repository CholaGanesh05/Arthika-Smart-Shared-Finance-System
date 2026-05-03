import mongoose from "mongoose";
import {
  buildGroupAnalytics,
  buildMemberAnalytics,
  generateGroupCSVData,
  generateGroupPDFBuffer,
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
// EXPORT GROUP TRANSACTIONS — CSV (FR7.6)
// ======================
export const exportGroupTransactionsCSV = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const csvData = await generateGroupCSVData(groupId, userId);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="arthika_group_${groupId}.csv"`);
    res.status(200).send(csvData);
  } catch (error) {
    next(error);
  }
};

// ======================
// EXPORT GROUP TRANSACTIONS — PDF (Architecture Diagram: pdfkit)
// ======================
export const exportGroupTransactionsPDF = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const pdfBuffer = await generateGroupPDFBuffer(groupId, userId);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="arthika_group_${groupId}.pdf"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.status(200).end(pdfBuffer);
  } catch (error) {
    next(error);
  }
};
