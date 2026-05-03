import { body, param, validationResult } from "express-validator";

// ======================
// SHARED HANDLER
// ======================
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
  }
  next();
};


// ======================
// FR4.1 + FR4.2 — Create Fund
// ======================
export const validateCreateFund = [
  param("groupId")
    .isMongoId()
    .withMessage("Invalid group ID"),

  body("name")
    .trim()
    .notEmpty()
    .withMessage("Fund name is required")
    .isLength({ max: 50 })
    .withMessage("Fund name must be at most 50 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Description must be at most 200 characters"),

  // targetAmount is optional (FR4.2)
  body("targetAmount")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("Target amount must be a positive number"),

  body("type")
    .optional()
    .isIn(["general", "trip", "emergency", "event"])
    .withMessage("Type must be one of: general, trip, emergency, event"),

  handleValidation,
];


// ======================
// FR4.3 — Contribute to Fund
// ======================
export const validateContribute = [
  param("fundId")
    .isMongoId()
    .withMessage("Invalid fund ID"),

  body("amount")
    .notEmpty()
    .withMessage("Amount is required")
    .isFloat({ gt: 0 })
    .withMessage("Amount must be a positive number"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Description must be at most 200 characters"),

  body("date")
    .optional()
    .isISO8601()
    .withMessage("Date must be a valid ISO datetime"),

  handleValidation,
];


// ======================
// FR4.4 — Withdraw from Fund
// ======================
export const validateWithdraw = [
  param("fundId")
    .isMongoId()
    .withMessage("Invalid fund ID"),

  body("amount")
    .notEmpty()
    .withMessage("Amount is required")
    .isFloat({ gt: 0 })
    .withMessage("Amount must be a positive number"),

  // description is MANDATORY for withdrawals (FR4.4)
  body("description")
    .trim()
    .notEmpty()
    .withMessage("A reason/description is mandatory for withdrawals")
    .isLength({ max: 200 })
    .withMessage("Description must be at most 200 characters"),

  body("date")
    .optional()
    .isISO8601()
    .withMessage("Date must be a valid ISO datetime"),

  handleValidation,
];


// ======================
// FR4.7 — Deactivate / Fund param validation
// ======================
export const validateFundId = [
  param("fundId")
    .isMongoId()
    .withMessage("Invalid fund ID"),

  handleValidation,
];
