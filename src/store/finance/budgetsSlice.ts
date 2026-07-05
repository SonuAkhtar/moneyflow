import type { FinanceState, SliceCreator } from "./types";

type BudgetsSlice = Pick<FinanceState, "setBudget" | "removeBudget">;

export const createBudgetsSlice: SliceCreator<BudgetsSlice> = (set, get) => ({
  setBudget: (category, amount) => {
    const budgets = { ...get().budgets };
    if (amount > 0) {
      budgets[category] = Math.round(amount * 100) / 100;
    } else {
      delete budgets[category];
    }
    set({ budgets });
  },

  removeBudget: (category) => {
    const budgets = { ...get().budgets };
    delete budgets[category];
    set({ budgets });
  },
});
