import mongoose from "mongoose";
import Expense from "../../expenses/models/expense.model.js";
import Ledger from "../../expenses/models/ledger.model.js";
import Settlement from "../../expenses/models/settlement.model.js";
import Group from "../../groups/models/group.model.js";
import { getGroupBalances } from "../../expenses/services/balance.service.js";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Helper to convert paise integer strictly to Rupee string (e.g. 1050 -> "10.50")
const toRupees = (paise) => (paise / 100).toFixed(2);
// Helper to convert to Rupee float for charting libraries (e.g. 1050 -> 10.5)
const toRupeesFloat = (paise) => Number((paise / 100).toFixed(2));
const padTwo = (value) => String(value).padStart(2, "0");
const getMonthKey = (date) => `${date.getFullYear()}-${padTwo(date.getMonth() + 1)}`;
const getMonthLabel = (date) => `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const formatExportDateTime = (date) =>
  `${padTwo(date.getDate())} ${monthNames[date.getMonth()]} ${date.getFullYear()} ${padTwo(date.getHours())}:${padTwo(date.getMinutes())}`;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

const formatInsightCurrency = (rupeeValue) =>
  `\u20b9${Number(rupeeValue || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

function extractInsightText(value) {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => extractInsightText(entry)).filter(Boolean).join(" ");
  }

  if (value && typeof value === "object") {
    const preferredKeys = ["text", "summary", "title", "description", "content", "message", "label", "value"];

    for (const key of preferredKeys) {
      if (value[key] !== undefined && value[key] !== null) {
        const extracted = extractInsightText(value[key]);
        if (extracted) {
          return extracted;
        }
      }
    }
  }

  return "";
}

function enforceInrCurrency(text) {
  if (!text) return "";

  return String(text)
    .replace(/\$\s*/g, "\u20b9")
    .replace(/\bUSD\b/gi, "INR")
    .replace(/\bUS dollars?\b/gi, "INR");
}

function truncateInsight(text, maxLength = 220) {
  if (!text) return "";
  const normalized = enforceInrCurrency(extractInsightText(text)).replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3).trim()}...`;
}

function normalizeInsightList(items, fallbackItems, maxItems = 4) {
  const normalized = (Array.isArray(items) ? items : [])
    .map((item) => truncateInsight(item))
    .filter(Boolean)
    .slice(0, maxItems);

  if (normalized.length) {
    return normalized;
  }

  return (fallbackItems || []).slice(0, maxItems);
}

function extractFirstJsonObject(rawText) {
  if (!rawText) return null;

  const trimmed = rawText.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1]?.trim() || trimmed;

  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  try {
    return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
}

function buildFallbackAnalyticsAssistant({
  groupName,
  memberCount,
  totalGroupSpendingPaise,
  averagePerMemberPaise,
  categoryEntries,
  outstandingBalances,
  forecastRange,
  forecastConfidence,
  financialHub,
  anomalies,
}) {
  const topCategory = categoryEntries[0];
  const largestOpenBalance = outstandingBalances[0];
  const totalSpendText = formatInsightCurrency(toRupeesFloat(totalGroupSpendingPaise));
  const averageSpendText = formatInsightCurrency(toRupeesFloat(averagePerMemberPaise));

  let summary = `${groupName} has tracked ${totalSpendText} across ${memberCount} member${memberCount === 1 ? "" : "s"}, averaging ${averageSpendText} per member.`;

  if (topCategory) {
    summary += ` ${topCategory.name} leads the mix at ${topCategory.share}% of total spend.`;
  } else if (!totalGroupSpendingPaise) {
    summary = `${groupName} does not have enough expense history yet to summarize group spending patterns.`;
  }

  const highlights = [];
  const suggestions = [];

  if (topCategory) {
    highlights.push(`Top category is ${topCategory.name} at ${formatInsightCurrency(topCategory.amount)} (${topCategory.share}% of spend).`);
  }

  if (largestOpenBalance) {
    highlights.push(
      `Largest open balance is ${largestOpenBalance.from.name} owing ${largestOpenBalance.to.name} ${formatInsightCurrency(toRupeesFloat(largestOpenBalance.amount))}.`
    );
  }

  if (forecastRange?.expected !== undefined) {
    highlights.push(
      `Expected next-month spend is around ${formatInsightCurrency(forecastRange.expected)} with ${forecastConfidence} confidence.`
    );
  }

  if (financialHub?.name) {
    highlights.push(`${financialHub.name} is the main money-flow hub with ${financialHub.degree} active balance links.`);
  }

  if (anomalies[0]) {
    suggestions.push(`Review "${anomalies[0].title}" because it is much larger than the group's usual expense size.`);
  }

  if (topCategory?.share >= 50) {
    suggestions.push(`Set a category cap for ${topCategory.name}; it currently accounts for more than half of the group's spend.`);
  }

  if (forecastConfidence === "low") {
    suggestions.push("Keep recording dated expenses consistently so the forecast stabilizes and becomes more dependable.");
  }

  if (!suggestions.length) {
    suggestions.push("Spending is relatively balanced right now. Keep categories and dates tidy to maintain clear analytics.");
  }

  return {
    summary: truncateInsight(summary, 260),
    highlights: normalizeInsightList(highlights, [
      `Total tracked spend stands at ${totalSpendText}.`,
    ]),
    suggestions: normalizeInsightList(suggestions, [
      "Keep logging accurate categories and dates to improve planning insights.",
    ]),
  };
}

async function buildAnalyticsAssistant(summaryPayload) {
  const fallbackAssistant = buildFallbackAnalyticsAssistant(summaryPayload);
  const groqApiKey = process.env.GROQ_API_KEY;

  if (!groqApiKey || typeof fetch !== "function") {
    return fallbackAssistant;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);

  const promptPayload = {
    groupName: summaryPayload.groupName,
    memberCount: summaryPayload.memberCount,
    currency: "INR",
    totalGroupSpendingINR: toRupeesFloat(summaryPayload.totalGroupSpendingPaise),
    averagePerMemberINR: toRupeesFloat(summaryPayload.averagePerMemberPaise),
    topCategories: summaryPayload.categoryEntries.slice(0, 4).map((entry) => ({
      name: entry.name,
      amountINR: entry.amount,
      sharePercent: entry.share,
    })),
    outstandingBalances: summaryPayload.outstandingBalances.slice(0, 4).map((entry) => ({
      from: entry.from.name,
      to: entry.to.name,
      amountINR: toRupeesFloat(entry.amount),
    })),
    forecast: summaryPayload.forecastRange
      ? {
          conservativeINR: summaryPayload.forecastRange.conservative,
          expectedINR: summaryPayload.forecastRange.expected,
          stretchINR: summaryPayload.forecastRange.stretch,
          confidence: summaryPayload.forecastConfidence,
        }
      : null,
    financialHub: summaryPayload.financialHub,
    anomalies: summaryPayload.anomalies.slice(0, 3),
    monthlyTrend: summaryPayload.monthlyTrendEntries.slice(-6),
    smartInsights: summaryPayload.smartInsights.slice(0, 4),
  };

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqApiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: DEFAULT_GROQ_MODEL,
        temperature: 0.35,
        max_tokens: 500,
        messages: [
          {
            role: "system",
            content:
              "You are a finance analytics assistant for a shared-expense app in India. Return only valid JSON with keys summary, highlights, suggestions. Keep summary to 2 short sentences max. Keep highlights to 2-4 items. Keep suggestions to 2-4 items. Use only the provided data. All amounts are INR and must be written as ₹ or INR, never as $ or USD. Every highlight and suggestion item must be a plain string, not an object. Do not mention AI models, providers, missing integrations, fallback systems, or that data was supplied in JSON.",
          },
          {
            role: "user",
            content: `Create a concise analytics summary for this group data:\n${JSON.stringify(promptPayload)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq analytics request failed with status ${response.status}`);
    }

    const responsePayload = await response.json();
    const rawContent = responsePayload?.choices?.[0]?.message?.content || "";
    const parsedContent = extractFirstJsonObject(rawContent);

    if (!parsedContent) {
      throw new Error("Groq response did not contain valid JSON content");
    }

    return {
      summary: truncateInsight(parsedContent.summary, 260) || fallbackAssistant.summary,
      highlights: normalizeInsightList(parsedContent.highlights, fallbackAssistant.highlights),
      suggestions: normalizeInsightList(parsedContent.suggestions, fallbackAssistant.suggestions),
    };
  } catch (error) {
    console.warn("Analytics assistant fallback activated:", error.message);
    return fallbackAssistant;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ======================
// GET GROUP ANALYTICS
// ======================
export const buildGroupAnalytics = async (groupId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(groupId)) throw new Error("Invalid group ID");

  const group = await Group.findById(groupId).populate("members.user", "name email");
  if (!group) throw new Error("Group not found");
  if (!group.isMember(userId)) throw new Error("Not authorized");

  const memberDirectory = {};
  group.members.forEach((member) => {
    const memberId = member.user?._id?.toString?.() || member.user?.toString?.();
    if (!memberId) return;

    memberDirectory[memberId] = {
      id: memberId,
      name: member.user?.name || "Unknown",
      email: member.user?.email || "",
      role: member.role,
    };
  });

  const expenses = await Expense.find({ group: groupId }).lean();
  const normalizedExpenses = expenses.map((expense) => ({
    ...expense,
    analyticsDate: expense.date ? new Date(expense.date) : new Date(expense.createdAt),
  }));

  const totalGroupSpendingPaise = normalizedExpenses.reduce((acc, expense) => acc + expense.amount, 0);
  const memberCount = group.members.length;
  const averagePerMemberPaise = memberCount > 0 ? Math.round(totalGroupSpendingPaise / memberCount) : 0;

  const categoryBreakdownPaise = normalizedExpenses.reduce((acc, expense) => {
    const category = expense.category || "Other";
    acc[category] = (acc[category] || 0) + expense.amount;
    return acc;
  }, {});

  const categoryBreakdown = {};
  for (const category in categoryBreakdownPaise) {
    categoryBreakdown[category] = toRupeesFloat(categoryBreakdownPaise[category]);
  }

  const categoryEntries = Object.entries(categoryBreakdownPaise)
    .map(([name, amountPaise]) => ({
      name,
      amount: toRupeesFloat(amountPaise),
      share: totalGroupSpendingPaise > 0
        ? Number(((amountPaise / totalGroupSpendingPaise) * 100).toFixed(1))
        : 0,
    }))
    .sort((left, right) => right.amount - left.amount);

  const now = new Date();
  const monthlyTrend = {};
  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthlyTrend[getMonthLabel(date)] = 0;
  }

  const dailyHeatmap = {};
  for (let i = 89; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    dailyHeatmap[date.toISOString().split("T")[0]] = 0;
  }

  let userTotalSpendPaise = 0;
  let weekendSpendPaise = 0;
  const userCategoryBreakdown = {};
  const historicalMonthTotalsPaise = {};
  const sortedExpenseDates = normalizedExpenses
    .map((expense) => expense.analyticsDate)
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((left, right) => left - right);

  normalizedExpenses.forEach((expense) => {
    const expenseDate = expense.analyticsDate;
    const monthLabel = getMonthLabel(expenseDate);

    if (monthlyTrend[monthLabel] !== undefined) {
      monthlyTrend[monthLabel] += expense.amount;
    }

    historicalMonthTotalsPaise[getMonthKey(expenseDate)] = (historicalMonthTotalsPaise[getMonthKey(expenseDate)] || 0) + expense.amount;

    const dayKey = expenseDate.toISOString().split("T")[0];
    if (dailyHeatmap[dayKey] !== undefined) {
      dailyHeatmap[dayKey] += expense.amount;
    }

    if (expense.paidBy.toString() === userId) {
      userTotalSpendPaise += expense.amount;
      const category = expense.category || "Other";
      userCategoryBreakdown[category] = (userCategoryBreakdown[category] || 0) + expense.amount;

      const dayOfWeek = expenseDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekendSpendPaise += expense.amount;
      }
    }
  });

  for (const month in monthlyTrend) {
    monthlyTrend[month] = toRupeesFloat(monthlyTrend[month]);
  }

  for (const day in dailyHeatmap) {
    dailyHeatmap[day] = toRupeesFloat(dailyHeatmap[day]);
  }

  const monthlyTrendEntries = Object.entries(monthlyTrend).map(([label, amount]) => ({
    label,
    amount,
  }));

  const historicalMonthEntries = [];
  if (sortedExpenseDates.length) {
    let cursor = new Date(sortedExpenseDates[0].getFullYear(), sortedExpenseDates[0].getMonth(), 1);
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    while (cursor <= currentMonthStart) {
      const monthKey = getMonthKey(cursor);
      historicalMonthEntries.push({
        key: monthKey,
        label: getMonthLabel(cursor),
        amountPaise: historicalMonthTotalsPaise[monthKey] || 0,
      });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
  }

  const smartInsights = [];
  if (userTotalSpendPaise > 0) {
    const userPercent = totalGroupSpendingPaise > 0
      ? Math.round((userTotalSpendPaise / totalGroupSpendingPaise) * 100)
      : 0;
    smartInsights.push(`You account for **${userPercent}%** of the total group spending.`);

    let topCategory = "Other";
    let maxCategoryValue = 0;
    for (const category in userCategoryBreakdown) {
      if (userCategoryBreakdown[category] > maxCategoryValue) {
        maxCategoryValue = userCategoryBreakdown[category];
        topCategory = category;
      }
    }

    smartInsights.push(`Your highest spending is on **${topCategory}** at \u20b9${toRupees(maxCategoryValue)}.`);

    const weekendRatio = weekendSpendPaise / userTotalSpendPaise;
    if (weekendRatio > 0.6) {
      smartInsights.push(`You spend heavily on weekends (**${Math.round(weekendRatio * 100)}%** of your total spending).`);
    } else if (weekendRatio < 0.2) {
      smartInsights.push("You are a highly structured weekday spender.");
    }
  } else {
    smartInsights.push("You haven't recorded any personal expenditures yet.");
  }

  const outstandingBalances = (await getGroupBalances(groupId, userId))
    .sort((left, right) => (Number(right.amount) || 0) - (Number(left.amount) || 0));

  const memberNetPaise = {};
  Object.values(memberDirectory).forEach((member) => {
    memberNetPaise[member.id] = 0;
  });

  outstandingBalances.forEach((balance) => {
    const fromId = balance.from.id;
    const toId = balance.to.id;
    const amountPaise = Number(balance.amount) || 0;

    if (memberNetPaise[fromId] === undefined) memberNetPaise[fromId] = 0;
    if (memberNetPaise[toId] === undefined) memberNetPaise[toId] = 0;

    memberNetPaise[fromId] -= amountPaise;
    memberNetPaise[toId] += amountPaise;
  });

  const memberNetBalances = Object.entries(memberNetPaise)
    .map(([memberId, amountPaise]) => ({
      id: memberId,
      name: memberDirectory[memberId]?.name || "Unknown",
      role: memberDirectory[memberId]?.role || "member",
      netAmount: toRupeesFloat(amountPaise),
      direction: amountPaise > 0 ? "owed" : amountPaise < 0 ? "owes" : "settled",
    }))
    .sort((left, right) => Math.abs(right.netAmount) - Math.abs(left.netAmount));

  const meanPaise = normalizedExpenses.length > 0 ? (totalGroupSpendingPaise / normalizedExpenses.length) : 0;
  let varianceSum = 0;
  normalizedExpenses.forEach((expense) => {
    varianceSum += Math.pow(expense.amount - meanPaise, 2);
  });
  const stdDevPaise = normalizedExpenses.length > 0 ? Math.sqrt(varianceSum / normalizedExpenses.length) : 0;

  const anomalies = [];
  const anomalyThresholdPaise = meanPaise + (2 * stdDevPaise);
  const minimumThresholdPaise = Math.max(anomalyThresholdPaise, 50000);

  normalizedExpenses.forEach((expense) => {
    if (expense.amount > minimumThresholdPaise) {
      anomalies.push({
        title: expense.title || expense.description || "Expense",
        amountFloat: toRupeesFloat(expense.amount),
        dateKey: expense.analyticsDate.toISOString().split("T")[0],
        reason: "Exceeds the normal size band for this group",
      });
    }
  });
  anomalies.sort((left, right) => right.amountFloat - left.amountFloat);

  let forecastNextMonthFloat = null;
  let forecastMessage = "Add a bit more history before relying on a forecast.";
  let forecastConfidence = "low";
  let forecastModel = "insufficient-data";
  let forecastRange = null;
  let forecastBasis = null;

  if (sortedExpenseDates.length >= 4) {
    const earliestDate = sortedExpenseDates[0];
    const daysSinceFirstExpense = Math.max(1, (now - earliestDate) / (1000 * 60 * 60 * 24));
    const recent30DayCutoff = new Date(now.getTime() - (29 * 24 * 60 * 60 * 1000));
    const recent30DaySpendPaise = normalizedExpenses.reduce(
      (sum, expense) => sum + (expense.analyticsDate >= recent30DayCutoff ? expense.amount : 0),
      0
    );
    const closedMonthEntries = historicalMonthEntries.length > 1 ? historicalMonthEntries.slice(0, -1) : [];
    const recentClosedMonths = closedMonthEntries.slice(-3);
    const recentClosedValues = recentClosedMonths.map((entry) => entry.amountPaise);
    const recentClosedAveragePaise = recentClosedValues.length
      ? recentClosedValues.reduce((sum, amount) => sum + amount, 0) / recentClosedValues.length
      : 0;
    const closedVariance = recentClosedValues.length > 1
      ? recentClosedValues.reduce((sum, amount) => sum + Math.pow(amount - recentClosedAveragePaise, 2), 0) / recentClosedValues.length
      : 0;
    const closedVolatilityPaise = Math.sqrt(closedVariance);
    const volatilityRatio = recentClosedAveragePaise > 0 ? closedVolatilityPaise / recentClosedAveragePaise : 0.55;

    forecastBasis = {
      recent30DaySpend: toRupeesFloat(recent30DaySpendPaise),
      recentClosedAverage: toRupeesFloat(recentClosedAveragePaise),
      volatility: Number(volatilityRatio.toFixed(2)),
      daysSinceFirstExpense: Math.round(daysSinceFirstExpense),
      monthsUsed: recentClosedMonths.map((entry) => ({
        label: entry.label,
        amount: toRupeesFloat(entry.amountPaise),
      })),
    };

    if (daysSinceFirstExpense < 7) {
      forecastMessage = "The group is too new for a stable forecast. Add at least a week of dated transactions.";
    } else if (recentClosedMonths.length < 2 || daysSinceFirstExpense < 60 || normalizedExpenses.length < 8) {
      const baseRunRatePaise = recent30DaySpendPaise > 0
        ? recent30DaySpendPaise
        : (totalGroupSpendingPaise / daysSinceFirstExpense) * 30;

      forecastNextMonthFloat = toRupeesFloat(baseRunRatePaise);
      forecastConfidence = "low";
      forecastModel = "recent-run-rate";
      forecastMessage = "This beta forecast leans on the latest pace because there is not enough closed-month history yet.";
    } else {
      const recentWeight = recent30DaySpendPaise > 0 ? 0.4 : 0;
      const closedWeight = 1 - recentWeight;
      const blendedForecastPaise = (recentClosedAveragePaise * closedWeight) + (recent30DaySpendPaise * recentWeight);

      forecastNextMonthFloat = toRupeesFloat(blendedForecastPaise);

      if (
        recentClosedMonths.length >= 3 &&
        daysSinceFirstExpense >= 120 &&
        normalizedExpenses.length >= 12 &&
        volatilityRatio < 0.35
      ) {
        forecastConfidence = "high";
      } else if (volatilityRatio < 0.55) {
        forecastConfidence = "medium";
      } else {
        forecastConfidence = "low";
      }

      forecastModel = "blended-trend";
      forecastMessage = "This beta forecast blends recent 30-day pace with closed-month averages so one spike does not drive the whole estimate.";
    }

    if (forecastNextMonthFloat !== null) {
      const volatilitySpread = clamp(0.14 + (volatilityRatio * 0.28), 0.14, 0.34);
      const spread =
        forecastConfidence === "high"
          ? Math.max(0.1, volatilitySpread - 0.04)
          : forecastConfidence === "medium"
            ? volatilitySpread
            : Math.min(0.38, volatilitySpread + 0.05);

      forecastRange = {
        conservative: Number((forecastNextMonthFloat * (1 - spread)).toFixed(2)),
        expected: forecastNextMonthFloat,
        stretch: Number((forecastNextMonthFloat * (1 + spread)).toFixed(2)),
      };
    }
  }

  const nodeDegrees = {};
  outstandingBalances.forEach((balance) => {
    const fromId = balance.from.id;
    const toId = balance.to.id;
    if (!nodeDegrees[fromId]) nodeDegrees[fromId] = { name: balance.from.name, degree: 0, volume: 0 };
    if (!nodeDegrees[toId]) nodeDegrees[toId] = { name: balance.to.name, degree: 0, volume: 0 };

    nodeDegrees[fromId].degree += 1;
    nodeDegrees[toId].degree += 1;
    nodeDegrees[fromId].volume += balance.amount;
    nodeDegrees[toId].volume += balance.amount;
  });

  let financialHub = null;
  let maxScore = -1;
  for (const memberId in nodeDegrees) {
    const node = nodeDegrees[memberId];
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

  const aiAssistant = await buildAnalyticsAssistant({
    groupName: group.name,
    memberCount,
    totalGroupSpendingPaise,
    averagePerMemberPaise,
    categoryEntries,
    outstandingBalances,
    forecastRange,
    forecastConfidence,
    financialHub,
    anomalies,
    smartInsights,
    monthlyTrendEntries,
  });

  return {
    totalGroupSpending: toRupees(totalGroupSpendingPaise),
    averagePerMember: toRupees(averagePerMemberPaise),
    categoryBreakdown,
    categoryEntries,
    monthlyTrend,
    monthlyTrendEntries,
    dailyHeatmap,
    smartInsights,
    anomalies,
    forecastNextMonth: forecastNextMonthFloat,
    forecastMessage,
    forecastConfidence,
    forecastModel,
    forecastRange,
    forecastBasis,
    financialHub,
    outstandingBalances,
    memberNetBalances,
    aiAssistant,
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

  const expenses = await Expense.find({ group: groupId }).populate("paidBy", "name email").lean();
  const contributionsPaise = {};

  expenses.forEach((expense) => {
    const payerId = expense.paidBy._id.toString();
    const payerName = expense.paidBy.name;
    if (!contributionsPaise[payerId]) {
      contributionsPaise[payerId] = { name: payerName, totalPaid: 0 };
    }
    contributionsPaise[payerId].totalPaid += expense.amount;
  });

  const leaderboard = Object.values(contributionsPaise)
    .sort((left, right) => right.totalPaid - left.totalPaid)
    .map((member) => ({
      name: member.name,
      totalPaid: toRupees(member.totalPaid),
    }));

  const ledger = await Ledger.find({ group: groupId }).populate("from to", "name").lean();
  let totalOwePaise = 0;
  let totalOwedPaise = 0;
  const pairwiseMap = {};

  ledger.forEach((entry) => {
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

  const pairwiseBalances = Object.values(pairwiseMap).map((member) => {
    const net = member.theyOweMePaise - member.iOwePaise;
    return {
      name: member.name,
      iOwe: toRupees(member.iOwePaise),
      theyOweMe: toRupees(member.theyOweMePaise),
      netBalance: toRupees(net),
      isOwed: net > 0,
    };
  });

  return {
    leaderboard,
    personalSummary: {
      totalOwe: toRupees(totalOwePaise),
      totalOwed: toRupees(totalOwedPaise),
      netBalance: toRupees(totalOwedPaise - totalOwePaise),
      pairwiseBalances,
    },
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

  expenses.forEach((expense) => {
    const expenseDate = expense.date ? new Date(expense.date) : new Date(expense.createdAt);
    const rawDescription = expense.title || expense.description || "Expense";
    const rawUser = expense.paidBy?.name || "Unknown";
    timeline.push({
      dateObj: expenseDate,
      timestampString: formatExportDateTime(expenseDate),
      type: "Expense",
      description: `"${rawDescription.replace(/"/g, '""')}"`,
      category: expense.category || "Other",
      userA: `"${rawUser.replace(/"/g, '""')}"`,
      userB: '"Group Split"',
      amount: toRupees(expense.amount),
    });
  });

  settlements.forEach((settlement) => {
    const settlementDate = settlement.date ? new Date(settlement.date) : new Date(settlement.createdAt);
    const rawReference = settlement.reference || "Reimbursement";
    const rawFrom = settlement.from?.name || "Unknown";
    const rawTo = settlement.to?.name || "Unknown";
    timeline.push({
      dateObj: settlementDate,
      timestampString: formatExportDateTime(settlementDate),
      type: `Settlement (${settlement.method.toUpperCase()})`,
      description: `"${rawReference.replace(/"/g, '""')}"`,
      category: "Settlement",
      userA: `"${rawFrom.replace(/"/g, '""')}"`,
      userB: `"${rawTo.replace(/"/g, '""')}"`,
      amount: toRupees(settlement.amount),
    });
  });

  timeline.sort((left, right) => right.dateObj - left.dateObj);

  const csvHeaders = "Timestamp,Type,Description,Category,From (Paid By),To (Payee),Amount\n";
  const csvRows = timeline
    .map((row) =>
      `"${row.timestampString}",${row.type},${row.description},${row.category},${row.userA},${row.userB},${row.amount}`
    )
    .join("\n");

  return csvHeaders + csvRows;
};

// ======================
// EXPORT GROUP TRANSACTIONS - PDF
// Returns a Buffer of the generated PDF
// ======================
export const generateGroupPDFBuffer = async (groupId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(groupId)) throw new Error("Invalid group ID");

  const group = await Group.findById(groupId).populate("members.user", "name email");
  if (!group) throw new Error("Group not found");
  if (!group.isMember(userId)) throw new Error("Not authorized");

  const expenses = await Expense.find({ group: groupId })
    .populate("paidBy", "name")
    .sort({ date: -1, createdAt: -1 })
    .lean();

  const settlements = await Settlement.find({ group: groupId, status: { $ne: "disputed" } })
    .populate("from", "name")
    .populate("to", "name")
    .sort({ date: -1, createdAt: -1 })
    .lean();

  const { default: PDFDocument } = await import("pdfkit");

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc
      .fontSize(22)
      .font("Helvetica-Bold")
      .text("Arthika - Group Finance Report", { align: "center" });

    doc.moveDown(0.3);
    doc
      .fontSize(13)
      .font("Helvetica")
      .text(`Group: ${group.name}`, { align: "center" });

    doc
      .fontSize(10)
      .fillColor("#666666")
      .text(`Generated: ${new Date().toLocaleDateString("en-IN")}   |   Members: ${group.members.length}`, { align: "center" });

    doc.moveDown(1);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor("#cccccc").stroke();
    doc.moveDown(0.5);

    doc.fontSize(13).fillColor("#000000").font("Helvetica-Bold").text("Expenses");
    doc.moveDown(0.4);

    doc.fontSize(9).font("Helvetica-Bold").fillColor("#444444");
    const expenseColumns = { date: 40, title: 138, category: 284, paidBy: 360, amount: 470 };
    doc.text("Date & Time", expenseColumns.date, doc.y, { width: 92 });
    doc.text("Title", expenseColumns.title, doc.y - doc.currentLineHeight(), { width: 136 });
    doc.text("Category", expenseColumns.category, doc.y - doc.currentLineHeight(), { width: 72 });
    doc.text("Paid By", expenseColumns.paidBy, doc.y - doc.currentLineHeight(), { width: 98 });
    doc.text("Amount", expenseColumns.amount, doc.y - doc.currentLineHeight(), { width: 80, align: "right" });
    doc.moveDown(0.2);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor("#dddddd").stroke();
    doc.moveDown(0.2);

    doc.font("Helvetica").fillColor("#000000").fontSize(9);
    let totalPaise = 0;

    for (const expense of expenses) {
      const y = doc.y;
      const expenseDate = expense.date ? new Date(expense.date) : new Date(expense.createdAt);
      const dateString = formatExportDateTime(expenseDate);
      const amountString = `\u20b9${(expense.amount / 100).toFixed(2)}`;
      totalPaise += expense.amount;

      doc.text(dateString, expenseColumns.date, y, { width: 92 });
      doc.text(expense.title || "-", expenseColumns.title, y, { width: 136 });
      doc.text(expense.category || "Other", expenseColumns.category, y, { width: 72 });
      doc.text(expense.paidBy?.name || "?", expenseColumns.paidBy, y, { width: 98 });
      doc.text(amountString, expenseColumns.amount, y, { width: 80, align: "right" });
      doc.moveDown(0.5);

      if (doc.y > 750) {
        doc.addPage();
      }
    }

    doc.moveDown(0.2);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor("#cccccc").stroke();
    doc.moveDown(0.3);
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(`Total Group Spending: \u20b9${(totalPaise / 100).toFixed(2)}`, { align: "right" });

    doc.moveDown(1.5);

    if (settlements.length > 0) {
      if (doc.y > 650) {
        doc.addPage();
      }

      doc.fontSize(13).font("Helvetica-Bold").fillColor("#000000").text("Settlements");
      doc.moveDown(0.4);

      doc.fontSize(9).font("Helvetica-Bold").fillColor("#444444");
      doc.text("Date & Time", 40, doc.y, { width: 105 });
      doc.text("From", 150, doc.y - doc.currentLineHeight(), { width: 112 });
      doc.text("To", 270, doc.y - doc.currentLineHeight(), { width: 112 });
      doc.text("Method", 390, doc.y - doc.currentLineHeight(), { width: 60 });
      doc.text("Amount", 455, doc.y - doc.currentLineHeight(), { width: 100, align: "right" });
      doc.moveDown(0.2);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor("#dddddd").stroke();
      doc.moveDown(0.2);

      doc.font("Helvetica").fillColor("#000000").fontSize(9);

      for (const settlement of settlements) {
        const y = doc.y;
        const settlementDate = settlement.date ? new Date(settlement.date) : new Date(settlement.createdAt);
        const dateString = formatExportDateTime(settlementDate);

        doc.text(dateString, 40, y, { width: 105 });
        doc.text(settlement.from?.name || "?", 150, y, { width: 112 });
        doc.text(settlement.to?.name || "?", 270, y, { width: 112 });
        doc.text(settlement.method?.toUpperCase() || "CASH", 390, y, { width: 60 });
        doc.text(`\u20b9${(settlement.amount / 100).toFixed(2)}`, 455, y, { width: 100, align: "right" });
        doc.moveDown(0.5);

        if (doc.y > 750) {
          doc.addPage();
        }
      }
    }

    doc.moveDown(2);
    doc
      .fontSize(8)
      .fillColor("#aaaaaa")
      .text("Generated by Arthika - Smart Shared Finance System", { align: "center" });

    doc.end();
  });
};
