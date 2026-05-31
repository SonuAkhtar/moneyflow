import type { StoreApi } from "zustand";
import { currentMonthKey } from "@/utils";
import type {
  Account,
  AccountInput,
  Budget,
  BudgetInput,
  Emi,
  EmiInput,
  MonthlySummary,
  Profile,
  Transaction,
  TransactionInput,
} from "@/types";

export interface FinanceState {
  initialized: boolean;
  hasHydrated: boolean;
  activeMonth: string;
  majorAccountId: string | null;
  dailyAccountId: string | null;
  profile: Profile | null;
  accounts: Account[];
  transactions: Transaction[];
  emis: Emi[];
  budgets: Budget[];
  summaries: MonthlySummary[];

  hydrate: (userId: string) => Promise<void>;
  loadDemoData: () => Promise<void>;
  resetAll: () => void;
  updateProfile: (patch: Partial<Profile>) => void;

  addTransaction: (input: TransactionInput) => void;
  updateTransaction: (id: string, input: TransactionInput) => void;
  deleteTransaction: (id: string) => void;

  setMajorAccount: (id: string) => void;
  setDailyAccount: (id: string) => void;

  addAccount: (input: AccountInput) => void;
  updateAccount: (id: string, patch: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  addSavingDeposit: (accountId: string, amount: number) => void;
  addSavingWithdrawal: (accountId: string, amount: number) => void;

  upsertBudget: (input: BudgetInput) => void;
  deleteBudget: (id: string) => void;

  setSalary: (month: string, amount: number) => void;

  addEmi: (input: EmiInput) => void;
  updateEmi: (id: string, patch: Partial<Emi>) => void;
  deleteEmi: (id: string) => void;
  addEmiPayment: (
    emiId: string,
    input: { month: string; amount: number },
  ) => void;
  updateEmiPayment: (
    emiId: string,
    paymentId: string,
    patch: { month?: string; amount?: number },
  ) => void;
  deleteEmiPayment: (emiId: string, paymentId: string) => void;

  runMonthlyRollover: () => void;
}

export const emptyState = {
  initialized: false,
  activeMonth: currentMonthKey(),
  majorAccountId: null,
  dailyAccountId: null,
  profile: null,
  accounts: [],
  transactions: [],
  emis: [],
  budgets: [],
  summaries: [],
} satisfies Partial<FinanceState>;

export type FinanceSet = StoreApi<FinanceState>["setState"];
export type FinanceGet = StoreApi<FinanceState>["getState"];

export interface MutationHelpers {
  /** The current user id; throws if the profile isn't loaded yet. */
  ownerId: () => string;
  /** Fire a write-through to Supabase; re-syncs from server on failure. */
  sync: (work: () => Promise<void>) => void;
  toastError: (message: string) => void;
}

// A domain slice: receives store set/get plus shared mutation helpers and
// returns its portion of the store's actions.
export type SliceCreator<T> = (
  set: FinanceSet,
  get: FinanceGet,
  h: MutationHelpers,
) => T;
