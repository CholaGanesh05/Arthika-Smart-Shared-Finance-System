import {
  addExpense,
  getGroupExpenses,
  editExpense,
  deleteExpense,
} from "../services/expense.service.js";
import { getGroupBalances } from "../services/balance.service.js";

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
// FR3.1–FR3.5 — ADD EXPENSE
// POST /expenses/:groupId
// paidBy defaults to logged-in user but can be overridden (any group member)
// ======================
export const addExpenseController = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const {
      title,
      amount,
      date,
      description,
      category,
      splitType,
      splits,
      receiptUrl,
      paidBy,      // FR3.1: payer can be any member; defaults to self
    } = req.body;

    const expense = await addExpense({
      groupId,
      paidBy: paidBy || req.user._id.toString(),
      title,
      amount,
      date,
      description,
      category,
      splitType,
      splits,
      receiptUrl,
    });

    return res.status(201).json({
      success: true,
      message: "Expense added successfully",
      data: expense,
    });
  } catch (error) {
    return handleControllerError(res, next, error);
  }
};


// ======================
// FR3.6 — EDIT EXPENSE (metadata only)
// PUT /expenses/:groupId/:expenseId
// ======================
export const editExpenseController = async (req, res, next) => {
  try {
    const { expenseId } = req.params;
    const expense = await editExpense(expenseId, req.body, req.user._id);

    return res.status(200).json({
      success: true,
      message: "Expense updated successfully",
      data: expense,
    });
  } catch (error) {
    return handleControllerError(res, next, error);
  }
};


// ======================
// FR3.6 + FR3.7 — DELETE EXPENSE
// DELETE /expenses/:groupId/:expenseId
// ======================
export const deleteExpenseController = async (req, res, next) => {
  try {
    const { expenseId } = req.params;
    const result = await deleteExpense(expenseId, req.user._id);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    return handleControllerError(res, next, error);
  }
};


// ======================
// FR3.8 — GET EXPENSE LIST (with filters)
// GET /expenses/:groupId/history
// Query params: from, to, category, paidBy, member
// ======================
export const getGroupExpensesController = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { from, to, category, paidBy, member } = req.query;

    const expenses = await getGroupExpenses(groupId, req.user._id, {
      from,
      to,
      category,
      paidBy,
      member, // FR3.8: filter by any member (payer OR split participant)
    });

    return res.status(200).json({
      success: true,
      count: expenses.length,
      data: expenses,
    });
  } catch (error) {
    return handleControllerError(res, next, error);
  }
};


// ======================
// GET GROUP BALANCES
// GET /expenses/:groupId/balances
// ======================
export const getBalancesController = async (req, res, next) => {
  try {
    const balances = await getGroupBalances(req.params.groupId, req.user._id);

    return res.status(200).json({
      success: true,
      count: balances.length,
      data: balances,
    });
  } catch (error) {
    return handleControllerError(res, next, error);
  }
};
