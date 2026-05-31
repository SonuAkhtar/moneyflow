"use client";

import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { createMutationHelpers } from "./finance/helpers";
import { emptyState, type FinanceState } from "./finance/types";
import { createCoreSlice } from "./finance/coreSlice";
import { createTransactionsSlice } from "./finance/transactionsSlice";
import { createAccountsSlice } from "./finance/accountsSlice";
import { createEmisSlice } from "./finance/emisSlice";
import { createBorrowingsSlice } from "./finance/borrowingsSlice";

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => {
      const helpers = createMutationHelpers(get);
      return {
        ...emptyState,
        hasHydrated: false,
        ...createCoreSlice(set, get, helpers),
        ...createTransactionsSlice(set, get, helpers),
        ...createAccountsSlice(set, get, helpers),
        ...createEmisSlice(set, get, helpers),
        ...createBorrowingsSlice(set, get, helpers),
      };
    },
    {
      name: "mf-finance-cache",
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : noopStorage,
      ),
      partialize: (s) => ({
        majorAccountId: s.majorAccountId,
        dailyAccountId: s.dailyAccountId,
        profile: s.profile,
        accounts: s.accounts,
        transactions: s.transactions,
        emis: s.emis,
        borrowings: s.borrowings,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.profile) useFinanceStore.setState({ hasHydrated: true });
      },
    },
  ),
);
