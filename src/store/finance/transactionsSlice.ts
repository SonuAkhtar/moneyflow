import { BIG_EXPENSE_THRESHOLD } from "@/constants";
import { accountRepo, transactionRepo } from "@/services/repositories";
import { isoNow, monthKey } from "@/utils";
import type { Account, Transaction } from "@/types";
import { applyBalance, balanceDelta, makeRollback, newId } from "./helpers";
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
      note: input.note?.trim() || null,
      merchant: input.merchant ?? null,
      isBigExpense: input.isBigExpense ?? input.amount > BIG_EXPENSE_THRESHOLD,
      occurredAt: input.occurredAt,
      createdAt: isoNow(),
    };
    const delta = balanceDelta(txn.type, txn.amount, txn.note);
    const accounts = applyBalance(s.accounts, input.accountId, delta);
    set({ transactions: [txn, ...s.transactions], accounts });

    const account = accounts.find((a) => a.id === input.accountId);
    sync(
      () =>
        Promise.all([
          transactionRepo.save(txn),
          ...(account ? [accountRepo.save(account)] : []),
        ]).then(() => undefined),
      makeRollback(set, s, ["transactions", "accounts"]),
    );
  },

  deleteTransaction: (id) => {
    const s = get();
    const txn = s.transactions.find((t) => t.id === id);
    if (!txn) return;
    const delta = -balanceDelta(txn.type, txn.amount, txn.note);
    const accounts = applyBalance(s.accounts, txn.accountId, delta);
    set({
      transactions: s.transactions.filter((t) => t.id !== id),
      accounts,
    });

    const account = accounts.find((a) => a.id === txn.accountId);
    const uid = ownerId();
    sync(
      () =>
        Promise.all([
          transactionRepo.remove(id, uid),
          ...(account ? [accountRepo.save(account)] : []),
        ]).then(() => undefined),
      makeRollback(set, s, ["transactions", "accounts"]),
    );
  },

  updateTransaction: (id, input) => {
    const s = get();
    const old = s.transactions.find((t) => t.id === id);
    if (!old) return;

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

    let accounts = applyBalance(
      s.accounts,
      old.accountId,
      -balanceDelta(old.type, old.amount, old.note),
    );
    accounts = applyBalance(
      accounts,
      updated.accountId,
      balanceDelta(updated.type, updated.amount, updated.note),
    );

    set({
      transactions: s.transactions.map((t) => (t.id === id ? updated : t)),
      accounts,
    });

    const dirtyAccounts = [old.accountId, input.accountId]
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .map((aid) => accounts.find((a) => a.id === aid))
      .filter((a): a is Account => Boolean(a));
    sync(
      () =>
        Promise.all([
          transactionRepo.save(updated),
          ...dirtyAccounts.map((a) => accountRepo.save(a)),
        ]).then(() => undefined),
      makeRollback(set, s, ["transactions", "accounts"]),
    );
  },

  setSalary: (month, amount, accountId) => {
    const s = get();
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
      let accounts = s.accounts;
      if (targetId === existing.accountId) {
        accounts = applyBalance(accounts, targetId, amount - existing.amount);
      } else {
        accounts = applyBalance(accounts, existing.accountId, -existing.amount);
        accounts = applyBalance(accounts, targetId, amount);
      }
      const transactions = s.transactions.map((t) =>
        t.id === existing.id ? { ...t, amount, accountId: targetId } : t,
      );
      set({ transactions, accounts });
      const updatedTxn = transactions.find((t) => t.id === existing.id);
      const dirtyAccounts = [existing.accountId, targetId]
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .map((aid) => accounts.find((a) => a.id === aid))
        .filter((a): a is Account => Boolean(a));
      sync(
        () =>
          Promise.all([
            ...(updatedTxn ? [transactionRepo.save(updatedTxn)] : []),
            ...dirtyAccounts.map((a) => accountRepo.save(a)),
          ]).then(() => undefined),
        makeRollback(set, s, ["transactions", "accounts"]),
      );
      return;
    }
    const base =
      (accountId && s.accounts.find((a) => a.id === accountId)) ??
      s.accounts.find((a) => a.isPrimary) ??
      s.accounts[0];
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
    const accounts = applyBalance(s.accounts, base.id, amount);
    set({ transactions: [txn, ...s.transactions], accounts });
    const account = accounts.find((a) => a.id === base.id);
    sync(
      () =>
        Promise.all([
          transactionRepo.save(txn),
          ...(account ? [accountRepo.save(account)] : []),
        ]).then(() => undefined),
      makeRollback(set, s, ["transactions", "accounts"]),
    );
  },
});
