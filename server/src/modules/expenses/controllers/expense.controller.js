import { addExpense } from "../services/expense.service.js";
import { getGroupBalances } from "../services/balance.service.js";
import { simplifyDebts } from "../services/settlement.service.js";
import { settleDebt } from "../services/settlement.service.js";
import { getGroupExpenses } from "../services/expense.service.js";



// ======================
// ADD EXPENSE
// ======================
export const addExpenseController = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { amount, description, splitType, splits } = req.body;

    const paidBy = req.user._id; // from auth middleware

    const expense = await addExpense({
      groupId,
      paidBy,
      amount,
      description,
      splitType,
      splits,
    });

    res.status(201).json({
      success: true,
      message: "Expense added successfully",
      data: expense,
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================
// GET BALANCES
// ======================
export const getBalancesController = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const balances = await getGroupBalances(groupId, userId);

    res.status(200).json({
      success: true,
      count: balances.length,
      data: balances,
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================
// SIMPLIFY DEBTS
// ======================
export const simplifyDebtsController = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const settlements = await simplifyDebts(groupId, userId);

    res.status(200).json({
      success: true,
      count: settlements.length,
      data: settlements,
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================
// SETTLE CONTROLLER
// ======================
export const settleDebtController = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { toUserId, amount } = req.body;

    const fromUserId = req.user._id;

    const result = await settleDebt({
      groupId,
      fromUserId,
      toUserId,
      amount,
    });

    res.status(200).json({
      success: true,
      message: result.message,
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================
// GET EXPENSES
// ======================
export const getGroupExpensesController = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const expenses = await getGroupExpenses(groupId, userId);

    res.status(200).json({
      success: true,
      count: expenses.length,
      data: expenses,
    });
  } catch (error) {
  res.status(400);
  throw error;
  }
};