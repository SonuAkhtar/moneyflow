import type { StoreApi } from "zustand";
import type {
  Account,
  AccountInput,
  Borrowing,
  BorrowingInput,
  CategoryId,
  Emi,
  EmiInput,
  Profile,
  Transaction,
  TransactionInput,
} from "@/types";

export interface FinanceState {
  initialized: boolean;
  hasHydrated: boolean;
  majorAccountId: string | null;
  dailyAccountId: string | null;
  profile: Profile | null;
  accounts: Account[];
  transactions: Transaction[];
  emis: Emi[];
  borrowings: Borrowing[];
  budgets: Partial<Record<CategoryId, number>>;

  setBudget: (category: CategoryId, amount: number) => void;
  removeBudget: (category: CategoryId) => void;

  hydrate: (userId: string) => Promise<void>;
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

  setSalary: (month: string, amount: number, accountId?: string) => void;

  addEmi: (input: EmiInput) => void;
  updateEmi: (id: string, patch: Partial<Emi>) => void;
  deleteEmi: (id: string) => void;
  addEmiPayment: (
    emiId: string,
    input: {
      month: string;
      amount: number;
      paidOn?: string;
      accountId?: string | null;
    },
  ) => void;
  updateEmiPayment: (
    emiId: string,
    paymentId: string,
    patch: {
      month?: string;
      amount?: number;
      paidOn?: string;
      accountId?: string | null;
    },
  ) => void;
  deleteEmiPayment: (emiId: string, paymentId: string) => void;

  addBorrowing: (input: BorrowingInput) => void;
  updateBorrowing: (id: string, patch: Partial<Borrowing>) => void;
  deleteBorrowing: (id: string) => void;
  addBorrowingPayment: (
    borrowingId: string,
    input: { amount: number; paidOn: string; note?: string },
  ) => void;
  updateBorrowingPayment: (
    borrowingId: string,
    paymentId: string,
    patch: { amount?: number; paidOn?: string; note?: string | null },
  ) => void;
  deleteBorrowingPayment: (borrowingId: string, paymentId: string) => void;
}

export const emptyState = {
  initialized: false,
  majorAccountId: null,
  dailyAccountId: null,
  profile: null,
  accounts: [],
  transactions: [],
  emis: [],
  borrowings: [],
  budgets: {},
} satisfies Partial<FinanceState>;

export type FinanceSet = StoreApi<FinanceState>["setState"];
export type FinanceGet = StoreApi<FinanceState>["getState"];

export interface MutationHelpers {
  ownerId: () => string;
  sync: (work: () => Promise<void>, rollback?: () => void) => void;
  toastError: (message: string) => void;
}

export type SliceCreator<T> = (
  set: FinanceSet,
  get: FinanceGet,
  h: MutationHelpers,
) => T;
