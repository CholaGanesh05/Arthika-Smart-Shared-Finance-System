import { z } from "zod";

export const addExpenseSchema = z
  .object({
    amount: z.coerce
      .number()
      .positive("Amount must be > 0"),

    description: z
      .string()
      .min(1, "Description required"),

    splitType: z.enum(["equal", "exact"]),

    splits: z
      .array(
        z.object({
          user: z.string(), // ObjectId
          amount: z.coerce
            .number()
            .nonnegative("Amount must be >= 0"),
        })
      )
      .optional(),
  })
  .strict() // 🔥 prevents extra unwanted fields
  .refine(
    (data) => {
      // If exact → splits required
      if (data.splitType === "exact") {
        return data.splits && data.splits.length > 0;
      }
      return true;
    },
    {
      message: "Splits required for exact type",
      path: ["splits"],
    }
  );