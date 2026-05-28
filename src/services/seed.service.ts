import { subDays, subMonths } from "date-fns";
import { createId, monthKey, computeHealthScore, healthBand } from "@/utils";
import { BIG_EXPENSE_THRESHOLD, CURRENCY } from "@/constants";
import type {
  Account,
  AppNotification,
  Budget,
  CategoryId,
  Emi,
  MonthlySummary,
  Profile,
  SavingGoal,
  Subscription,
  Transaction,
} from "@/types";

export interface SeedData {
  profile: Profile;
  accounts: Account[];
  transactions: Transaction[];
  emis: Emi[];
  budgets: Budget[];
  goals: SavingGoal[];
  subscriptions: Subscription[];
  notifications: AppNotification[];
  summaries: MonthlySummary[];
}

const iso = (d: Date) => d.toISOString();
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!;
const rand = (min: number, max: number) =>
  Math.round(min + Math.random() * (max - min));

const EXPENSE_SAMPLES: {
  category: CategoryId;
  merchant: string;
  min: number;
  max: number;
}[] = [
  { category: "food", merchant: "Burgerama", min: 150, max: 650 },
  { category: "groceries", merchant: "BigBasket", min: 500, max: 2800 },
  { category: "transport", merchant: "Uber", min: 60, max: 450 },
  { category: "shopping", merchant: "Myntra", min: 700, max: 5500 },
  { category: "entertainment", merchant: "PVR Cinemas", min: 250, max: 1400 },
  { category: "health", merchant: "Apollo Pharmacy", min: 200, max: 2200 },
  { category: "bills", merchant: "Tata Power", min: 1200, max: 4800 },
  { category: "travel", merchant: "IndiGo", min: 1800, max: 9000 },
];

export const generateSeed = (
  userId: string,
  fullName: string,
  email: string,
  currency: string = CURRENCY.code,
): SeedData => {
  const now = new Date();
  const monthlySalary = 85000;

  const accounts: Account[] = [
    {
      id: createId("acc"),
      userId,
      name: "Everyday Savings",
      type: "bank",
      balance: 64200,
      institution: "HDFC Bank",
      colorTag: "#c6f432",
      isPrimary: true,
      createdAt: iso(subMonths(now, 8)),
    },
    {
      id: createId("acc"),
      userId,
      name: "Vault Deposit",
      type: "savings",
      balance: 235000,
      institution: "HDFC Bank",
      colorTag: "#2bff95",
      isPrimary: false,
      createdAt: iso(subMonths(now, 8)),
    },
    {
      id: createId("acc"),
      userId,
      name: "Flow Wallet",
      type: "wallet",
      balance: 6400,
      institution: null,
      colorTag: "#ff7a1a",
      isPrimary: false,
      createdAt: iso(subMonths(now, 5)),
    },
  ];

  const primaryId = accounts[0]!.id;
  const transactions: Transaction[] = [];

  for (let m = 0; m < 3; m += 1) {
    const monthDate = subMonths(now, m);
    transactions.push({
      id: createId("txn"),
      userId,
      accountId: primaryId,
      type: "income",
      amount: monthlySalary,
      category: "salary",
      note: "Monthly salary",
      merchant: "Nimbus Labs",
      isBigExpense: false,
      occurredAt: iso(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1, 9)),
      createdAt: iso(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1, 9)),
    });

    const count = m === 0 ? 18 : 22;
    for (let i = 0; i < count; i += 1) {
      const sample = pick(EXPENSE_SAMPLES);
      const day = subDays(now, m * 30 + Math.floor(Math.random() * 28));
      const amount = rand(sample.min, sample.max);
      transactions.push({
        id: createId("txn"),
        userId,
        accountId: pick(accounts).id,
        type: "expense",
        amount,
        category: sample.category,
        note: null,
        merchant: sample.merchant,
        isBigExpense: amount > BIG_EXPENSE_THRESHOLD,
        occurredAt: iso(day),
        createdAt: iso(day),
      });
    }
  }

  const emis: Emi[] = [
    {
      id: createId("emi"),
      userId,
      accountId: primaryId,
      name: "MacBook Pro",
      principal: 95000,
      monthlyAmount: 8500,
      remainingMonths: 7,
      totalMonths: 12,
      interestRate: 12.5,
      dueDay: 5,
      status: "active",
      createdAt: iso(subMonths(now, 5)),
    },
    {
      id: createId("emi"),
      userId,
      accountId: primaryId,
      name: "Car Loan",
      principal: 720000,
      monthlyAmount: 17000,
      remainingMonths: 28,
      totalMonths: 48,
      interestRate: 9.2,
      dueDay: 12,
      status: "active",
      createdAt: iso(subMonths(now, 20)),
    },
  ];

  const month = monthKey(now);
  const budgetDefs: { category: CategoryId; limit: number }[] = [
    { category: "food", limit: 5000 },
    { category: "groceries", limit: 9000 },
    { category: "transport", limit: 3000 },
    { category: "shopping", limit: 14000 },
    { category: "entertainment", limit: 4500 },
  ];

  const budgets: Budget[] = budgetDefs.map((b) => {
    const spent = transactions
      .filter(
        (t) =>
          t.category === b.category &&
          t.type === "expense" &&
          monthKey(t.occurredAt) === month,
      )
      .reduce((acc, t) => acc + t.amount, 0);
    return {
      id: createId("bud"),
      userId,
      category: b.category,
      limit: b.limit,
      spent: Math.round(spent),
      month,
      createdAt: iso(subDays(now, 20)),
    };
  });

  const goals: SavingGoal[] = [
    {
      id: createId("goal"),
      userId,
      title: "Iceland Trip",
      targetAmount: 300000,
      savedAmount: 182000,
      deadline: iso(subMonths(now, -5)),
      status: "active",
      colorTag: "#57b8ff",
      createdAt: iso(subMonths(now, 3)),
    },
    {
      id: createId("goal"),
      userId,
      title: "Emergency Fund",
      targetAmount: 600000,
      savedAmount: 420000,
      deadline: null,
      status: "active",
      colorTag: "#2bff95",
      createdAt: iso(subMonths(now, 6)),
    },
    {
      id: createId("goal"),
      userId,
      title: "New Camera",
      targetAmount: 120000,
      savedAmount: 120000,
      deadline: iso(subMonths(now, -1)),
      status: "completed",
      colorTag: "#ff7a1a",
      createdAt: iso(subMonths(now, 4)),
    },
  ];

  const subscriptions: Subscription[] = [
    {
      id: createId("sub"),
      userId,
      name: "Spotify",
      amount: 119,
      cycle: "monthly",
      category: "entertainment",
      nextChargeAt: iso(subDays(now, -4)),
      isActive: true,
      createdAt: iso(subMonths(now, 7)),
    },
    {
      id: createId("sub"),
      userId,
      name: "Netflix",
      amount: 499,
      cycle: "monthly",
      category: "entertainment",
      nextChargeAt: iso(subDays(now, -9)),
      isActive: true,
      createdAt: iso(subMonths(now, 9)),
    },
    {
      id: createId("sub"),
      userId,
      name: "iCloud+",
      amount: 75,
      cycle: "monthly",
      category: "bills",
      nextChargeAt: iso(subDays(now, -2)),
      isActive: true,
      createdAt: iso(subMonths(now, 12)),
    },
    {
      id: createId("sub"),
      userId,
      name: "Notion",
      amount: 6000,
      cycle: "yearly",
      category: "subscriptions",
      nextChargeAt: iso(subDays(now, -120)),
      isActive: true,
      createdAt: iso(subMonths(now, 6)),
    },
  ];

  const notifications: AppNotification[] = [
    {
      id: createId("ntf"),
      userId,
      type: "achievement",
      title: "Goal reached!",
      body: "New Camera fund is fully funded. Time to treat yourself.",
      read: false,
      createdAt: iso(subDays(now, 1)),
    },
    {
      id: createId("ntf"),
      userId,
      type: "alert",
      title: "Food budget at 82%",
      body: "You're close to your dining limit this month.",
      read: false,
      createdAt: iso(subDays(now, 2)),
    },
    {
      id: createId("ntf"),
      userId,
      type: "reminder",
      title: "Car loan due in 3 days",
      body: "₹17,000 due on the 12th from Everyday Savings.",
      read: true,
      createdAt: iso(subDays(now, 3)),
    },
  ];

  const summaries: MonthlySummary[] = [0, 1, 2].map((m) => {
    const key = monthKey(subMonths(now, m));
    const income = monthlySalary;
    const expenses = transactions
      .filter((t) => t.type === "expense" && monthKey(t.occurredAt) === key)
      .reduce((acc, t) => acc + t.amount, 0);
    const emiBurden = emis.reduce((a, e) => a + e.monthlyAmount, 0);
    const saved = Math.max(0, income - expenses - emiBurden);
    const score = computeHealthScore({
      income,
      expenses: expenses + emiBurden,
      savings: saved,
      emiBurden,
      budgetAdherence: 70,
    });
    return {
      id: createId("sum"),
      userId,
      month: key,
      income,
      expenses: Math.round(expenses),
      saved: Math.round(saved),
      carriedForward: 450000 - m * 40000,
      healthScore: score,
      healthBand: healthBand(score),
      createdAt: iso(subMonths(now, m)),
    };
  });

  const profile: Profile = {
    id: userId,
    email,
    fullName: fullName || "Jordan Avery",
    phone: "+91 98765 43210",
    avatarUrl: null,
    currency,
    monthlySalary,
    savingsTarget: 25000,
    onboardingComplete: true,
    streakCount: 12,
    createdAt: iso(subMonths(now, 8)),
  };

  return {
    profile,
    accounts,
    transactions,
    emis,
    budgets,
    goals,
    subscriptions,
    notifications,
    summaries,
  };
};
