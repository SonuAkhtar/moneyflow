import { BIG_EXPENSE_THRESHOLD } from "@/constants";
import { dateKey, isBankTransfer, isoNow, monthKey } from "@/utils";
import type { Transaction } from "@/types";
import { applyBalance, balanceDelta, newId } from "./helpers";
import { balanceSteps, step } from "./steps";
import type { FinanceState, SliceCreator } from "./types";

type TransactionsSlice = Pick<
  FinanceState,
  "addTransaction" | "updateTransaction" | "deleteTransaction" | "setSalary"
>;

export const createTransactionsSlice: SliceCreator<TransactionsSlice> = (
  set,
  get,
  { ownerId, sync },
) => ({
  addTransaction: (input) => {
    const s = get();
    const uid = ownerId();
    const txn: Transaction = {
      id: newId(),
      userId: uid,
      accountId: input.accountId,
      type: input.type,
      amount: input.amount,
      category: input.category,
      note: input.note?.trim() || null,
      merchant: input.merchant ?? null,
      isBigExpense: input.isBigExpense ?? input.amount > BIG_EXPENSE_THRESHOLD,
      occurredAt: input.occurredAt,
      createdAt: isoNow(),
    };
    const delta = balanceDelta(txn.type, txn.amount, txn.note);
    set({
      transactions: [txn, ...s.transactions],
      accounts: applyBalance(s.accounts, input.accountId, delta),
    });
    sync([
      step.saveTransaction(txn),
      ...balanceSteps([[txn.accountId, delta]]),
    ]);
  },

  deleteTransaction: (id) => {
    const s = get();
    const txn = s.transactions.find((t) => t.id === id);
    if (!txn) return;
    if (isBankTransfer(txn)) return get().deleteBankTransfer(id);
    ownerId();
    const delta = -balanceDelta(txn.type, txn.amount, txn.note);
    set({
      transactions: s.transactions.filter((t) => t.id !== id),
      accounts: applyBalance(s.accounts, txn.accountId, delta),
    });
    sync([
      step.removeTransaction(txn),
      ...balanceSteps([[txn.accountId, delta]]),
    ]);
  },

  updateTransaction: (id, input) => {
    const s = get();
    const old = s.transactions.find((t) => t.id === id);
    if (!old) return;
    if (isBankTransfer(old))
      return get().updateBankTransfer(id, {
        amount: input.amount,
        date: dateKey(input.occurredAt),
      });
    ownerId();

    const updated: Transaction = {
      ...old,
      accountId: input.accountId,
      type: input.type,
      amount: input.amount,
      category: input.category,
      note: input.note !== undefined ? input.note.trim() || null : old.note,
      merchant: input.merchant ?? null,
      isBigExpense: input.isBigExpense ?? old.isBigExpense,
      occurredAt: input.occurredAt,
    };

    const deltas: [string, number][] = [
      [old.accountId, -balanceDelta(old.type, old.amount, old.note)],
      [
        updated.accountId,
        balanceDelta(updated.type, updated.amount, updated.note),
      ],
    ];
    let accounts = s.accounts;
    for (const [aid, delta] of deltas)
      accounts = applyBalance(accounts, aid, delta);

    set({
      transactions: s.transactions.map((t) => (t.id === id ? updated : t)),
      accounts,
    });
    sync([step.saveTransaction(updated, old), ...balanceSteps(deltas)]);
  },

  setSalary: (month, amount, accountId) => {
    const s = get();
    const uid = ownerId();
    const existing = s.transactions.find(
      (t) =>
        t.type === "income" &&
        t.category === "salary" &&
        monthKey(t.occurredAt) === month,
    );
    if (existing) {
      const targetId =
        (accountId &&
          s.accounts.some((a) => a.id === accountId) &&
          accountId) ||
        existing.accountId;
      const deltas: [string, number][] = [
        [existing.accountId, -existing.amount],
        [targetId, amount],
      ];
      let accounts = s.accounts;
      for (const [aid, delta] of deltas)
        accounts = applyBalance(accounts, aid, delta);
      const updatedTxn: Transaction = {
        ...existing,
        amount,
        accountId: targetId,
      };
      set({
        transactions: s.transactions.map((t) =>
          t.id === existing.id ? updatedTxn : t,
        ),
        accounts,
      });
      sync([
        step.saveTransaction(updatedTxn, existing),
        ...balanceSteps(deltas),
      ]);
      return;
    }
    const base =
      (accountId && s.accounts.find((a) => a.id === accountId)) ||
      s.accounts.find((a) => a.isPrimary) ||
      s.accounts[0];
    if (!base) return;
    const [year, m] = month.split("-").map(Number);
    const occurredAt = new Date(year ?? 0, (m ?? 1) - 1, 1, 9).toISOString();
    const txn: Transaction = {
      id: newId(),
      userId: uid,
      accountId: base.id,
      type: "income",
      amount,
      category: "salary",
      note: "Monthly salary",
      merchant: "Salary",
      isBigExpense: false,
      occurredAt,
      createdAt: isoNow(),
    };
    set({
      transactions: [txn, ...s.transactions],
      accounts: applyBalance(s.accounts, base.id, amount),
    });
    sync([step.saveTransaction(txn), ...balanceSteps([[base.id, amount]])]);
  },
});
