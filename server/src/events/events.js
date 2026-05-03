// ======================
// INTERNAL EVENT CONSTANTS (Architecture: Event-Driven Design)
// ======================

export const EVENTS = {
  // Expense domain
  EXPENSE_CREATED:     "expense:created",
  EXPENSE_UPDATED:     "expense:updated",
  EXPENSE_DELETED:     "expense:deleted",

  // Settlement domain
  SETTLEMENT_RECORDED: "settlement:recorded",
  SETTLEMENT_CONFIRMED:"settlement:confirmed",
  SETTLEMENT_DISPUTED: "settlement:disputed",

  // Group domain
  MEMBER_JOINED:       "group:member:joined",
  MEMBER_REMOVED:      "group:member:removed",
  ROLE_UPDATED:        "group:role:updated",
  GROUP_ARCHIVED:      "group:archived",
  GROUP_DELETED:       "group:deleted",

  // Fund domain
  FUND_CREATED:        "fund:created",
  FUND_CONTRIBUTED:    "fund:contributed",
  FUND_WITHDRAWN:      "fund:withdrawn",
  FUND_DEACTIVATED:    "fund:deactivated",

  // Balance
  BALANCE_UPDATED:     "group:balance:updated",
};
