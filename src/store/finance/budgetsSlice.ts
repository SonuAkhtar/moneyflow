import { currentDateKey, round2 } from "@/utils";
import type { CategoryId } from "@/types";
import { step } from "./steps";
import type { FinanceState, SliceCreator } from "./types";

type BudgetsSlice = Pick<FinanceState, "setBudgets" | "setSpendBudget">;

type Budgets = Partial<Record<CategoryId, number>>;

const clean = (budgets: Budgets): Budgets => {
  const out: Budgets = {};
  for (const [id, amount] of Object.entries(budgets) as [CategoryId, number][])
    if (amount > 0) out[id] = Math.round(amount * 100) / 100;
  return out;
};

export const createBudgetsSlice: SliceCreator<BudgetsSlice> = (
  set,
  get,
  { ownerId, sync },
) => {
  return {
    setBudgets: (next) => {
      ownerId();
      const budgets = clean(next);
      set({ budgets });
      sync([step.saveBudgets(budgets)]);
    },

    setSpendBudget: ({ daily, major }) => {
      ownerId();
      const prev = get().spendBudget;
      const spendBudget =
        daily > 0 || major > 0
          ? {
              daily: round2(Math.max(0, daily)),
              major: round2(Math.max(0, major)),
              dailySince:
                daily > 0
                  ? prev?.daily
                    ? prev.dailySince
                    : currentDateKey()
                  : null,
            }
          : null;
      set({ spendBudget });
      sync([step.saveSpendBudget(spendBudget)]);
    },
  };
};
