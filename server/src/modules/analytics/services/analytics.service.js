import mongoose from "mongoose";
import Expense from "../../expenses/models/expense.model.js";
import Ledger from "../../expenses/models/ledger.model.js";
import Settlement from "../../expenses/models/settlement.model.js";
import Group from "../../groups/models/group.model.js";
import { getGroupBalances } from "../../expenses/services/balance.service.js";

// Helper to convert paise integer strictly to Rupee string (e.g. 1050 -> "10.50")
const toRupees = (paise) => (paise / 100).toFixed(2);
// Helper to convert to Rupee float for charting libraries (e.g. 1050 -> 10.5)
const toRupeesFloat = (paise) => Number((paise / 100).toFixed(2));

// ======================
// GET GROUP ANALYTICS
// ======================
export const buildGroupAnalytics = async (groupId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(groupId)) throw new Error("Invalid group ID");

  const group = await Group.findById(groupId);
  if (!group) throw new Error("Group not found");
  if (!group.isMember(userId)) throw new Error("Not authorized");

  // 1. Fetch Expenses (sorted for timeline evaluation)
  const expenses = await Expense.find({ group: groupId }).lean();

  // 2. Aggregate Totals
  const totalGroupSpendingPaise = expenses.reduce((acc, exp) => acc + exp.amount, 0);
  const memberCount = group.members.length;
  const averagePerMemberPaise = memberCount > 0 ? Math.round(totalGroupSpendingPaise / memberCount) : 0;

  // 3. Category Breakdown (in Float Rupees for Chart JS)
  const categoryBreakdownPaise = expenses.reduce((acc, exp) => {
    const cat = exp.category || "Other";
    acc[cat] = (acc[cat] || 0) + exp.amount;
    return acc;
  }, {});

  const categoryBreakdown = {};
  for (const cat in categoryBreakdownPaise) {
    categoryBreakdown[cat] = toRupeesFloat(categoryBreakdownPaise[cat]);
  }

  // 4. Monthly Trend (last 6 months, strictly zero-filled)
  const monthlyTrend = {};
  const now = new Date();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    // LOGIC FLAW FIX: Do NOT use toLocaleString('default') as it breaks identically across Linux/Windows OS locales!
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    monthlyTrend[key] = 0; // initialize baseline
  }


  // 5. Daily Heatmap (last 90 days - FR7.Advanced)
  const dailyHeatmap = {};
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = d.toISOString().split("T")[0]; // YYYY-MM-DD
    dailyHeatmap[key] = 0;
  }

  // 6. Smart Insights Tracker (FR7.Advanced)
  let userTotalSpendPaise = 0;
  let weekendSpendPaise = 0;
  const userCategoryBreakdown = {};

  expenses.forEach((exp) => {
    // using explicitly tracked expense.date (FR3.1)
    const expDate = exp.date ? new Date(exp.date) : new Date(exp.createdAt);
    
    // Process Monthly Trend
    const monthKey = `${monthNames[expDate.getMonth()]} ${expDate.getFullYear()}`;
    if (monthlyTrend[monthKey] !== undefined) {
      monthlyTrend[monthKey] += exp.amount;
    }

    // Process Daily Heatmap
    const dayKey = expDate.toISOString().split("T")[0];
    if (dailyHeatmap[dayKey] !== undefined) {
      dailyHeatmap[dayKey] += exp.amount;
    }

    // Process User-Specific Behaviors
    if (exp.paidBy.toString() === userId) {
      userTotalSpendPaise += exp.amount;
      const cat = exp.category || "Other";
      userCategoryBreakdown[cat] = (userCategoryBreakdown[cat] || 0) + exp.amount;
      
      const dayOfWeek = expDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) { // 0: Sun, 6: Sat
         weekendSpendPaise += exp.amount;
      }
    }
  });

  // Re-map Maps to strict Floats
  for (const month in monthlyTrend) {
    monthlyTrend[month] = toRupeesFloat(monthlyTrend[month]);
  }
  for (const day in dailyHeatmap) {
    dailyHeatmap[day] = toRupeesFloat(dailyHeatmap[day]);
  }

  // Generate Insight Strings
  const smartInsights = [];
  
  if (userTotalSpendPaise > 0) {
    // Insight A: Dominance
    const userPercent = totalGroupSpendingPaise > 0 ? Math.round((userTotalSpendPaise / totalGroupSpendingPaise) * 100) : 0;
    smartInsights.push(`You account for **${userPercent}%** of the total group spending.`);

    // Insight B: Top Category detection
    let topCat = "Other";
    let maxCatVal = 0;
    for (const cat in userCategoryBreakdown) {
      if (userCategoryBreakdown[cat] > maxCatVal) {
        maxCatVal = userCategoryBreakdown[cat];
        topCat = cat;
      }
    }
    smartInsights.push(`Your highest spending is on **${topCat}** at ₹${toRupees(maxCatVal)}.`);

    // Insight C: Weekend vs Weekday behavior
    const weekendRatio = weekendSpendPaise / userTotalSpendPaise;
    if (weekendRatio > 0.6) {
      smartInsights.push(`You spend heavily on weekends (**${Math.round(weekendRatio * 100)}%** of your total spending).`);
    } else if (weekendRatio < 0.2) {
      smartInsights.push(`You are a highly structured weekday spender.`);
    }
  } else {
    smartInsights.push("You haven't recorded any personal expenditures yet.");
  }


  // 7. FR7.1: Outstanding Balances
  const outstandingBalances = await getGroupBalances(groupId, userId);

  // ==========================================
  // LEVEL 3: PREDICTIVE TOP 1% ML/MATH MODELS
  // ==========================================

  // 8. Anomaly Detection (Standard Deviation Algorithm)
  let meanPaise = expenses.length > 0 ? (totalGroupSpendingPaise / expenses.length) : 0;
  let varianceSum = 0;
  expenses.forEach(e => {
    varianceSum += Math.pow(e.amount - meanPaise, 2);
  });
  const stdDevPaise = expenses.length > 0 ? Math.sqrt(varianceSum / expenses.length) : 0;
  
  const anomalies = [];
  const anomalyThresholdPaise = meanPaise + (2 * stdDevPaise); // > +2 Sigmas = Anomaly
  // Require minimum 500 rupees to avoid flagging small deviances
  const minimumThresholdPaise = Math.max(anomalyThresholdPaise, 50000); 

  expenses.forEach(e => {
    if (e.amount > minimumThresholdPaise) {
      const expDate = e.date ? new Date(e.date) : new Date(e.createdAt);
      anomalies.push({
        title: e.title || e.description || "Expense",
        amountFloat: toRupeesFloat(e.amount),
        dateKey: expDate.toISOString().split("T")[0],
        reason: `Exceeds the statistical boundary (μ+2σ)`
      });
    }
  });

  // 9. Forecasting (Group Run-rate vs Simple Moving Average)
  let forecastNextMonthFloat = null;
  let forecastMessage = "Insufficient data to forecast.";

  if (expenses.length > 0) {
    let earliestDate = new Date();
    expenses.forEach(e => {
        const d = e.date ? new Date(e.date) : new Date(e.createdAt);
        if (d < earliestDate) earliestDate = d;
    });

    const daysSinceFirstExpense = Math.max(1, (new Date() - earliestDate) / (1000 * 60 * 60 * 24));

    if (daysSinceFirstExpense < 30) {
      // New User / New Group: Calculate current daily run-rate and project out to 30 days
      const dailyRunRatePaise = totalGroupSpendingPaise / daysSinceFirstExpense;
      forecastNextMonthFloat = toRupeesFloat(dailyRunRatePaise * 30);
      forecastMessage = `Projected based on your current run-rate (group is only ${Math.round(daysSinceFirstExpense)} days old).`;
    } else {
      // Legacy Group: Standard 3-Month Moving Average
      const monthlyKeys = Object.keys(monthlyTrend); 
      const last3Months = monthlyKeys.slice(-3).map(k => monthlyTrend[k]);
      forecastNextMonthFloat = Number(((last3Months[0] + last3Months[1] + last3Months[2]) / 3).toFixed(2));
      forecastMessage = "Based on your 3-month historical moving average.";
    }
  }

  // 10. Social Graph Centrality (Financial Hub)
  const nodeDegrees = {};
  outstandingBalances.forEach(b => {
    const fromId = b.from.id;
    const toId = b.to.id;
    if (!nodeDegrees[fromId]) nodeDegrees[fromId] = { name: b.from.name, degree: 0, volume: 0 };
    if (!nodeDegrees[toId]) nodeDegrees[toId] = { name: b.to.name, degree: 0, volume: 0 };
    
    // Increment Node Edges
    nodeDegrees[fromId].degree += 1;
    nodeDegrees[toId].degree += 1;
    
    // Accumulate total node Velocity Volume
    nodeDegrees[fromId].volume += b.amount; 
    nodeDegrees[toId].volume += b.amount;
  });

  let financialHub = null;
  let maxScore = -1;
  for (const id in nodeDegrees) {
    const node = nodeDegrees[id];
    // Score heuristically combining Social Nodes connected (weighting 1 link = 1000 rupees volume)
    const score = (node.degree * 100000) + node.volume; 
    if (score > maxScore) {
      maxScore = score;
      financialHub = {
        name: node.name,
        degree: node.degree,
        totalVelocity: toRupeesFloat(node.volume),
      };
    }
  }

  return {
    totalGroupSpending: toRupees(totalGroupSpendingPaise),
    averagePerMember: toRupees(averagePerMemberPaise),
    categoryBreakdown,
    monthlyTrend,
    dailyHeatmap, // Add explicitly for UI Heatmap grid
    smartInsights, // Add explicit string array for AI Summary Cards
    anomalies, // D3 plotting anomalies
    forecastNextMonth: forecastNextMonthFloat, // Level 3 Forecast
    forecastMessage, // Descriptive context for UI
    financialHub, // Level 3 Graph Centrality
    outstandingBalances, // inherited structured array
  };
};

// ======================
// GET MEMBER ANALYTICS
// ======================
export const buildMemberAnalytics = async (groupId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(groupId)) throw new Error("Invalid group ID");

  const group = await Group.findById(groupId);
  if (!group) throw new Error("Group not found");
  if (!group.isMember(userId)) throw new Error("Not authorized");

  // 1. Leaderboard 
  const expenses = await Expense.find({ group: groupId }).populate("paidBy", "name email").lean();
  const contributionsPaise = {};

  expenses.forEach(exp => {
    const payerId = exp.paidBy._id.toString();
    const payerName = exp.paidBy.name;
    if (!contributionsPaise[payerId]) {
      contributionsPaise[payerId] = { name: payerName, totalPaid: 0 };
    }
    contributionsPaise[payerId].totalPaid += exp.amount;
  });

  const leaderboard = Object.values(contributionsPaise)
    .sort((a, b) => b.totalPaid - a.totalPaid)
    .map(member => ({
      name: member.name,
      totalPaid: toRupees(member.totalPaid)
    }));

  // 2. Personal Balance Summary (Net + Explicit Pairwise mappings)
  const ledger = await Ledger.find({ group: groupId }).populate("from to", "name").lean();
  let totalOwePaise = 0;
  let totalOwedPaise = 0;
  const pairwiseMap = {};

  ledger.forEach(entry => {
    const fromId = entry.from._id.toString();
    const toId = entry.to._id.toString();

    if (fromId === userId) {
      totalOwePaise += entry.amount;
      if (!pairwiseMap[toId]) pairwiseMap[toId] = { name: entry.to.name, iOwePaise: 0, theyOweMePaise: 0 };
      pairwiseMap[toId].iOwePaise += entry.amount;
    }
    
    if (toId === userId) {
      totalOwedPaise += entry.amount;
      if (!pairwiseMap[fromId]) pairwiseMap[fromId] = { name: entry.from.name, iOwePaise: 0, theyOweMePaise: 0 };
      pairwiseMap[fromId].theyOweMePaise += entry.amount;
    }
  });

  const pairwiseBalances = Object.values(pairwiseMap).map(member => {
    const net = member.theyOweMePaise - member.iOwePaise;
    return {
      name: member.name,
      iOwe: toRupees(member.iOwePaise),
      theyOweMe: toRupees(member.theyOweMePaise),
      netBalance: toRupees(net),
      isOwed: net > 0
    };
  });

  return {
    leaderboard,
    personalSummary: {
      totalOwe: toRupees(totalOwePaise),
      totalOwed: toRupees(totalOwedPaise),
      netBalance: toRupees(totalOwedPaise - totalOwePaise),
      pairwiseBalances
    }
  };
};

// ======================
// EXPORT GROUP TRANSACTIONS CSV
// ======================
export const generateGroupCSVData = async (groupId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(groupId)) throw new Error("Invalid group ID");

  const group = await Group.findById(groupId);
  if (!group) throw new Error("Group not found");
  if (!group.isMember(userId)) throw new Error("Not authorized");

  const expenses = await Expense.find({ group: groupId })
    .populate("paidBy", "name")
    .lean();

  const settlements = await Settlement.find({ group: groupId, status: { $ne: "disputed" } })
    .populate("from", "name")
    .populate("to", "name")
    .lean();

  const timeline = [];

  // Map Expenses
  expenses.forEach(exp => {
    const expDate = exp.date ? new Date(exp.date) : new Date(exp.createdAt);
    const rawDesc = exp.title || exp.description || 'Expense';
    const rawUser = exp.paidBy?.name || 'Unknown';
    timeline.push({
      dateObj: expDate,
      dateString: expDate.toISOString().split("T")[0],
      type: "Expense",
      description: `"${rawDesc.replace(/"/g, '""')}"`, // LOGIC FLAW FIX: Safely escape CSV internal quotes!
      category: exp.category || "Other",
      userA: `"${rawUser.replace(/"/g, '""')}"`,
      userB: '("Group Split")',
      amount: toRupees(exp.amount),
    });
  });

  // Map Settlements
  settlements.forEach(settle => {
    const setDate = settle.date ? new Date(settle.date) : new Date(settle.createdAt);
    const rawRef = settle.reference || 'Reimbursement';
    const rawFrom = settle.from?.name || 'Unknown';
    const rawTo = settle.to?.name || 'Unknown';
    timeline.push({
      dateObj: setDate,
      dateString: setDate.toISOString().split("T")[0],
      type: `Settlement (${settle.method.toUpperCase()})`,
      description: `"${rawRef.replace(/"/g, '""')}"`,
      category: "Settlement",
      userA: `"${rawFrom.replace(/"/g, '""')}"`,
      userB: `"${rawTo.replace(/"/g, '""')}"`,
      amount: toRupees(settle.amount),
    });
  });

  // Sort Descending
  timeline.sort((a, b) => b.dateObj - a.dateObj);

  const csvHeaders = "Date,Type,Description,Category,From (Paid By),To (Payee),Amount\n";
  const csvRows = timeline.map(row => 
    `${row.dateString},${row.type},${row.description},${row.category},${row.userA},${row.userB},${row.amount}`
  ).join("\n");

  return csvHeaders + csvRows;
};
