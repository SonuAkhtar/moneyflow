import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signUpSchema = z
  .object({
    fullName: z.string().min(2, "Tell us your name"),
    email: z.string().email("Enter a valid email"),
    password: z
      .string()
      .min(8, "Use at least 8 characters")
      .regex(/[A-Z]/, "Add an uppercase letter")
      .regex(/[0-9]/, "Add a number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

export const transactionSchema = z.object({
  accountId: z.string().min(1, "Select an account"),
  type: z.enum(["income", "expense", "transfer"]),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  category: z.string().min(1, "Pick a category"),
  note: z.string().max(120).optional(),
  merchant: z.string().max(60).optional(),
  isBigExpense: z.boolean().optional(),
  occurredAt: z.string(),
});

export const accountSchema = z.object({
  name: z.string().min(2, "Name your wallet"),
  type: z.enum(["bank", "wallet", "cash", "card", "savings"]),
  balance: z.coerce.number().min(0, "Balance cannot be negative"),
  institution: z.string().max(60).optional(),
  colorTag: z.string(),
  isPrimary: z.boolean().optional(),
});

export const goalSchema = z.object({
  title: z.string().min(2, "Name your goal"),
  targetAmount: z.coerce.number().positive("Set a target"),
  savedAmount: z.coerce.number().min(0).optional(),
  deadline: z.string().optional(),
  colorTag: z.string(),
});

export const onboardingSchema = z.object({
  monthlySalary: z.coerce.number().min(0),
  savingsTarget: z.coerce.number().min(0),
  currency: z.string(),
  primaryAccountName: z.string().min(2),
  primaryAccountBalance: z.coerce.number().min(0),
});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type TransactionValues = z.infer<typeof transactionSchema>;
export type AccountValues = z.infer<typeof accountSchema>;
export type GoalValues = z.infer<typeof goalSchema>;
export type OnboardingValues = z.infer<typeof onboardingSchema>;
