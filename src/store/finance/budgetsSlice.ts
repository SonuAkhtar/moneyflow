import type { CategoryId } from "@/types";
import { step } from "./steps";
import type { FinanceState, SliceCreator } from "./types";

type BudgetsSlice = Pick<FinanceState, "setBudgets">;

type Budgets = Partial<Record<CategoryId, number>>;

const clean = (budgets: Budgets): Budgets => {
  const out: Budgets = {};
  for (const [id, amount] of Object.entries(budgets) as [CategoryId, number][])
    if (amount > 0) out[id] = Math.round(amount * 100) / 100;
  return out;
};

export const createBudgetsSlice: SliceCreator<BudgetsSlice> = (
  set,
  _get,
  { sync },
) => {
  return {
    setBudgets: (next) => {
      const budgets = clean(next);
      set({ budgets });
      sync([step.saveBudgets(budgets)]);
    },
  };
};
