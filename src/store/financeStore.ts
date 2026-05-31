"use client";

import { create } from "zustand";
import { createMutationHelpers } from "./finance/helpers";
import { emptyState, type FinanceState } from "./finance/types";
import { createCoreSlice } from "./finance/coreSlice";
import { createTransactionsSlice } from "./finance/transactionsSlice";
import { createAccountsSlice } from "./finance/accountsSlice";
import { createBudgetsSlice } from "./finance/budgetsSlice";
import { createEmisSlice } from "./finance/emisSlice";

// The store is composed from domain slices (transactions, accounts, budgets,
// emis, core). Every slice shares one `set`/`get` over the full state and the
// same mutation helpers, so cross-entity writes (e.g. a transaction updating an
// account balance) work exactly as before. The public selector API is unchanged.
export const useFinanceStore = create<FinanceState>()((set, get) => {
  const helpers = createMutationHelpers(get);
  return {
    ...emptyState,
    hasHydrated: false,
    ...createCoreSlice(set, get, helpers),
    ...createTransactionsSlice(set, get, helpers),
    ...createAccountsSlice(set, get, helpers),
    ...createBudgetsSlice(set, get, helpers),
    ...createEmisSlice(set, get, helpers),
  };
});
