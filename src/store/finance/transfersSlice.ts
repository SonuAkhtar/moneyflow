import {
  BANK_TRANSFER_IN_NOTE,
  BANK_TRANSFER_OUT_NOTE,
  findTransferPair,
  isBankTransfer,
  isoNow,
  round2,
} from "@/utils";
import type { Transaction } from "@/types";
import { applyBalance, newId } from "./helpers";
import { balanceSteps, step } from "./steps";
import type { FinanceState, SliceCreator } from "./types";

type TransfersSlice = Pick<
  FinanceState,
  "addBankTransfer" | "updateBankTransfer" | "deleteBankTransfer"
>;

const transferTimestamp = (date: string, time: Date): string => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(
    y ?? 0,
    (m ?? 1) - 1,
    d ?? 1,
    time.getHours(),
    time.getMinutes(),
    time.getSeconds(),
    time.getMilliseconds(),
  ).toISOString();
};

const uniqueInstant = (
  iso: string,
  transactions: Transaction[],
  ignore: Set<string> = new Set(),
): string => {
  const taken = new Set(
    transactions
      .filter((t) => isBankTransfer(t) && !ignore.has(t.id))
      .map((t) => +new Date(t.occurredAt)),
  );
  let at = +new Date(iso);
  while (taken.has(at)) at += 1;
  return new Date(at).toISOString();
};

const orderLegs = (a: Transaction, b?: Transaction) =>
  a.note === BANK_TRANSFER_OUT_NOTE ? [a, b] : [b, a];

export const createTransfersSlice: SliceCreator<TransfersSlice> = (
  set,
  get,
  { ownerId, sync },
) => ({
  addBankTransfer: ({ fromAccountId, toAccountId, amount, date }) => {
    const s = get();
    const from = s.accounts.find((a) => a.id === fromAccountId);
    const to = s.accounts.find((a) => a.id === toAccountId);
    const value = round2(amount);
    if (!from || !to || from.id === to.id || !(value > 0)) return;
    const uid = ownerId();
    const occurredAt = uniqueInstant(
      transferTimestamp(date, new Date()),
      s.transactions,
    );
    const createdAt = isoNow();
    const base = {
      userId: uid,
      type: "transfer" as const,
      amount: value,
      category: "transfer" as const,
      isBigExpense: false,
      occurredAt,
      createdAt,
    };
    const out: Transaction = {
      ...base,
      id: newId(),
      accountId: from.id,
      note: BANK_TRANSFER_OUT_NOTE,
      merchant: `To ${to.name}`,
    };
    const inn: Transaction = {
      ...base,
      id: newId(),
      accountId: to.id,
      note: BANK_TRANSFER_IN_NOTE,
      merchant: `From ${from.name}`,
    };
    let accounts = applyBalance(s.accounts, from.id, -value);
    accounts = applyBalance(accounts, to.id, value);
    set({ transactions: [out, inn, ...s.transactions], accounts });
    sync([
      step.saveTransaction(out),
      step.saveTransaction(inn),
      ...balanceSteps([
        [from.id, -value],
        [to.id, value],
      ]),
    ]);
  },

  updateBankTransfer: (legId, { amount, date }) => {
    const s = get();
    const leg = s.transactions.find((t) => t.id === legId);
    if (!leg || !isBankTransfer(leg)) return;
    const value = round2(amount);
    if (!(value > 0)) return;
    ownerId();
    const [out, inn] = orderLegs(leg, findTransferPair(leg, s.transactions));
    const legs = [out, inn].filter((t): t is Transaction => Boolean(t));
    const occurredAt = uniqueInstant(
      transferTimestamp(date, new Date(leg.occurredAt)),
      s.transactions,
      new Set(legs.map((t) => t.id)),
    );
    const updates = legs.map((old) => ({
      old,
      next: { ...old, amount: value, occurredAt },
    }));
    const deltas: [string, number][] = updates.map(({ old }) => [
      old.accountId,
      old.note === BANK_TRANSFER_OUT_NOTE
        ? old.amount - value
        : value - old.amount,
    ]);
    let accounts = s.accounts;
    for (const [aid, delta] of deltas)
      accounts = applyBalance(accounts, aid, delta);
    const byId = new Map(updates.map((u) => [u.old.id, u.next]));
    set({
      transactions: s.transactions.map((t) => byId.get(t.id) ?? t),
      accounts,
    });
    sync([
      ...updates.map(({ old, next }) => step.saveTransaction(next, old)),
      ...balanceSteps(deltas),
    ]);
  },

  deleteBankTransfer: (legId) => {
    const s = get();
    const leg = s.transactions.find((t) => t.id === legId);
    if (!leg || !isBankTransfer(leg)) return;
    ownerId();
    const legs = [leg, findTransferPair(leg, s.transactions)].filter(
      (t): t is Transaction => Boolean(t),
    );
    const deltas: [string, number][] = legs.map((t) => [
      t.accountId,
      t.note === BANK_TRANSFER_OUT_NOTE ? t.amount : -t.amount,
    ]);
    let accounts = s.accounts;
    for (const [aid, delta] of deltas)
      accounts = applyBalance(accounts, aid, delta);
    const ids = new Set(legs.map((t) => t.id));
    set({
      transactions: s.transactions.filter((t) => !ids.has(t.id)),
      accounts,
    });
    sync([
      ...legs.map((t) => step.removeTransaction(t)),
      ...balanceSteps(deltas),
    ]);
  },
});
