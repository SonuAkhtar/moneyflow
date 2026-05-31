import { BIG_EXPENSE_THRESHOLD } from "@/constants";
import { accountRepo, transactionRepo } from "@/services/repositories";
import { isoNow, monthKey } from "@/utils";
import type { Account, Transaction } from "@/types";
import { applyBalance, newId } from "./helpers";
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
    const txn: Transaction = {
      id: newId(),
      userId: ownerId(),
      accountId: input.accountId,
      type: input.type,
      amount: input.amount,
      category: input.category,
      note: input.note ?? null,
      merchant: input.merchant ?? null,
      isBigExpense: input.isBigExpense ?? input.amount > BIG_EXPENSE_THRESHOLD,
      occurredAt: input.occurredAt,
      createdAt: isoNow(),
    };
    const delta = input.type === "income" ? input.amount : -input.amount;
    const accounts = applyBalance(s.accounts, input.accountId, delta);
    set({ transactions: [txn, ...s.transactions], accounts });

    const account = accounts.find((a) => a.id === input.accountId);
    sync(() =>
      Promise.all([
        transactionRepo.save(txn),
        ...(account ? [accountRepo.save(account)] : []),
      ]).then(() => undefined),
    );
  },

  deleteTransaction: (id) => {
    const s = get();
    const txn = s.transactions.find((t) => t.id === id);
    if (!txn) return;
    const delta = txn.type === "income" ? -txn.amount : txn.amount;
    const accounts = applyBalance(s.accounts, txn.accountId, delta);
    set({
      transactions: s.transactions.filter((t) => t.id !== id),
      accounts,
    });

    const account = accounts.find((a) => a.id === txn.accountId);
    sync(() =>
      Promise.all([
        transactionRepo.remove(id),
        ...(account ? [accountRepo.save(account)] : []),
      ]).then(() => undefined),
    );
  },

  updateTransaction: (id, input) => {
    const s = get();
    const old = s.transactions.find((t) => t.id === id);
    if (!old) return;

    const oldDelta = old.type === "income" ? old.amount : -old.amount;
    let accounts = applyBalance(s.accounts, old.accountId, -oldDelta);
    const newDelta = input.type === "income" ? input.amount : -input.amount;
    accounts = applyBalance(accounts, input.accountId, newDelta);

    const updated: Transaction = {
      ...old,
      accountId: input.accountId,
      type: input.type,
      amount: input.amount,
      category: input.category,
      note: input.note ?? old.note,
      merchant: input.merchant ?? null,
      isBigExpense: input.isBigExpense ?? old.isBigExpense,
      occurredAt: input.occurredAt,
    };

    set({
      transactions: s.transactions.map((t) => (t.id === id ? updated : t)),
      accounts,
    });

    const dirtyAccounts = [old.accountId, input.accountId]
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .map((aid) => accounts.find((a) => a.id === aid))
      .filter((a): a is Account => Boolean(a));
    sync(() =>
      Promise.all([
        transactionRepo.save(updated),
        ...dirtyAccounts.map((a) => accountRepo.save(a)),
      ]).then(() => undefined),
    );
  },

  // Salary is an income RECORD only - it is intentionally NOT credited to any
  // account balance (it doesn't inflate banks/savings). It still counts as
  // monthly income; the balance trail excludes it (see useBalanceTrail).
  setSalary: (month, amount) => {
    const s = get();
    const existing = s.transactions.find(
      (t) =>
        t.type === "income" &&
        t.category === "salary" &&
        monthKey(t.occurredAt) === month,
    );
    if (existing) {
      const transactions = s.transactions.map((t) =>
        t.id === existing.id ? { ...t, amount } : t,
      );
      set({ transactions });
      const updatedTxn = transactions.find((t) => t.id === existing.id);
      if (updatedTxn) sync(() => transactionRepo.save(updatedTxn));
      return;
    }
    const base = s.accounts.find((a) => a.isPrimary) ?? s.accounts[0];
    if (!base) return;
    const [year, m] = month.split("-").map(Number);
    const occurredAt = new Date(year ?? 0, (m ?? 1) - 1, 1, 9).toISOString();
    const txn: Transaction = {
      id: newId(),
      userId: ownerId(),
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
    set({ transactions: [txn, ...s.transactions] });
    sync(() => transactionRepo.save(txn));
  },
});
