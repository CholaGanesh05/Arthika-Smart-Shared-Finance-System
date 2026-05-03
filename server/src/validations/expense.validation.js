import { z } from "zod";

// FR3.4: valid categories
const CATEGORIES = [
  "Food",
  "Transport",
  "Accommodation",
  "Entertainment",
  "Utilities",
  "Shopping",
  "Medical",
  "Other",
];

// FR3.2: valid split methods
const SPLIT_TYPES = ["equal", "exact", "percentage", "shares"];

// ======================
// FR3.1–FR3.5 — ADD EXPENSE SCHEMA
// ======================
export const addExpenseSchema = z
  .object({
    // FR3.1 — required fields
    title: z
      .string()
      .min(1, "Title is required")
      .max(120, "Title must not exceed 120 characters"),

    // FR3.1 — total amount in rupees (> 0)
    amount: z.coerce
      .number()
      .positive("Amount must be greater than 0"),

    // FR3.1 — date (optional, defaults to now)
    date: z.coerce.date().optional(),

    // FR3.1 — payer: any group member (optional, defaults to logged-in user)
    paidBy: z
      .string()
      .optional(), // validated in service against group membership

    // FR3.4 — predefined categories
    category: z
      .enum(CATEGORIES, {
        errorMap: () => ({
          message: `Category must be one of: ${CATEGORIES.join(", ")}`,
        }),
      })
      .default("Other"),

    // optional notes
    description: z
      .string()
      .max(500, "Description must not exceed 500 characters")
      .optional()
      .default(""),

    // FR3.2 — split method
    splitType: z.enum(SPLIT_TYPES, {
      errorMap: () => ({
        message: `splitType must be one of: ${SPLIT_TYPES.join(", ")}`,
      }),
    }),

    // splits array (required for exact / percentage / shares)
    splits: z
      .array(
        z.object({
          user: z.string().min(1, "User ID is required"),
          // 'amount' meaning depends on splitType:
          //   exact      → rupees
          //   percentage → percentage value (0–100)
          //   shares     → relative share number
          //   equal      → ignored
          amount: z.coerce
            .number()
            .nonnegative("Value must be >= 0"),
        })
      )
      .optional(),

    // FR3.5 — receipt URL (JPEG/PNG upload URL, empty string allowed)
    receiptUrl: z
      .string()
      .url("Must be a valid URL")
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (data) => {
      // splits required for non-equal types
      if (["exact", "percentage", "shares"].includes(data.splitType)) {
        return data.splits && data.splits.length > 0;
      }
      return true;
    },
    {
      message: "Splits are required for exact, percentage, and shares split types",
      path: ["splits"],
    }
  );


// ======================
// FR3.6 — EDIT EXPENSE SCHEMA (metadata only)
// Note: amount/split changes require delete + re-add
// ======================
export const editExpenseSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  date: z.coerce.date().optional(),
  category: z.enum(CATEGORIES).optional(),
  description: z.string().max(500).optional(),
  receiptUrl: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
});


// ======================
// FR6.1 + FR6.2 — SETTLE DEBT SCHEMA
// ======================
export const settleDebtSchema = z.object({
  toUserId: z.string().min(1, "Payee is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  date: z.coerce.date().optional(),
  method: z.enum(["cash", "upi"]).default("cash"),
  reference: z.string().max(100).optional(),
});


// ======================
// ADVANCE PAYMENT SCHEMA
// ======================
export const recordAdvanceSchema = z.object({
  toUserId: z.string().min(1, "Recipient is required").optional(),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  date: z.coerce.date().optional(),
  note: z.string().max(200, "Note must not exceed 200 characters").optional(),
});


// ======================
// FR6.4 — REVIEW SETTLEMENT SCHEMA
// ======================
export const reviewSettlementSchema = z.object({
  status: z.enum(["confirmed", "disputed"], {
    errorMap: () => ({ message: 'Status must be either "confirmed" or "disputed"' })
  }),
});
