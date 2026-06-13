"use client";

import { create } from "zustand";
import {
  persist,
  createJSONStorage,
  type StateStorage,
} from "zustand/middleware";
import { setActiveCurrency } from "@/utils";
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

type LegacyEmiPayment = {
  id: string;
  month: string;
  amount: number;
  paidOn?: string;
  accountId?: string | null;
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
      version: 2,
      migrate: (persisted) => {
        const state = persisted as Partial<FinanceState> | undefined;
        if (state?.emis) {
          state.emis = state.emis.map((e) => ({
            ...e,
            payments: ((e.payments ?? []) as unknown as LegacyEmiPayment[]).map(
              (p) => ({
                id: p.id,
                month: p.month,
                amount: p.amount,
                paidOn: p.paidOn ?? `${p.month}-01`,
                accountId: p.accountId ?? null,
              }),
            ),
          }));
        }
        return state as FinanceState;
      },
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
        if (state?.profile) setActiveCurrency(state.profile.currency);
        useFinanceStore.setState({ hasHydrated: true });
      },
    },
  ),
);
