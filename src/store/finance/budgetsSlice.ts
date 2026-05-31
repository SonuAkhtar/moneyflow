import { budgetRepo } from "@/services/repositories";
import { isoNow, monthKey } from "@/utils";
import type { Budget } from "@/types";
import { newId } from "./helpers";
import type { FinanceState, SliceCreator } from "./types";

type BudgetsSlice = Pick<FinanceState, "upsertBudget" | "deleteBudget">;

export const createBudgetsSlice: SliceCreator<BudgetsSlice> = (
  set,
  get,
  { ownerId, sync },
) => ({
  upsertBudget: (input) => {
    const s = get();
    const existing = s.budgets.find(
      (b) => b.category === input.category && b.month === input.month,
    );
    if (existing) {
      const budgets = s.budgets.map((b) =>
        b.id === existing.id ? { ...b, limit: input.limit } : b,
      );
      set({ budgets });
      const updated = budgets.find((b) => b.id === existing.id);
      if (updated) sync(() => budgetRepo.save(updated));
      return;
    }
    const spent = s.transactions
      .filter(
        (t) =>
          t.type === "expense" &&
          t.category === input.category &&
          monthKey(t.occurredAt) === input.month,
      )
      .reduce((acc, t) => acc + t.amount, 0);
    const budget: Budget = {
      id: newId(),
      userId: ownerId(),
      category: input.category,
      limit: input.limit,
      spent: Math.round(spent * 100) / 100,
      month: input.month,
      createdAt: isoNow(),
    };
    set({ budgets: [...s.budgets, budget] });
    sync(() => budgetRepo.save(budget));
  },

  deleteBudget: (id) => {
    const s = get();
    set({ budgets: s.budgets.filter((b) => b.id !== id) });
    sync(() => budgetRepo.remove(id));
  },
});
