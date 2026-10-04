import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  accountMonthDelta,
  bankMonthFlow,
  currentDateKey,
  currentMonthKey,
  findTransferPair,
} from "@/utils";
import { monthTotals } from "@/store/finance/selectors";
import type { Account, Profile } from "@/types";

const calls: string[] = [];
const server = new Map<string, number>();

vi.mock("@/services/repositories", () => {
  const rec = (name: string) =>
    vi.fn(async () => {
      calls.push(name);
    });
  return {
    accountRepo: {
      list: () => Promise.resolve([]),
      insert: rec("account.insert"),
      updateMeta: rec("account.updateMeta"),
      remove: rec("account.remove"),
      adjustBalance: vi.fn(async (id: string, _u: string, delta: number) => {
        calls.push(`adjust:${id}:${delta}`);
        server.set(id, (server.get(id) ?? 0) + delta);
        return server.get(id);
      }),
    },
    transactionRepo: {
      list: () => Promise.resolve([]),
      save: rec("txn.save"),
      remove: rec("txn.remove"),
      removeByAccount: rec("txn.removeByAccount"),
    },
    emiRepo: {
      save: rec("emi.save"),
      remove: rec("emi.remove"),
      savePayment: rec("emi.savePayment"),
      removePayment: rec("emi.removePayment"),
    },
    borrowingRepo: {
      save: rec("b.save"),
      remove: rec("b.remove"),
      savePayment: rec("b.savePayment"),
      removePayment: rec("b.removePayment"),
    },
    budgetRepo: { save: rec("budgets.save") },
    profileRepo: { get: () => Promise.resolve(null), update: rec("profile") },
    fetchSnapshot: vi.fn(),
  };
});

import { useFinanceStore } from "@/store/financeStore";

const profile = { id: "u1", currency: "INR" } as Profile;
const bank = (id: string, name: string, balance: number): Account => ({
  id,
  userId: "u1",
  name,
  type: "savings",
  balance,
  institution: name,
  colorTag: "#000",
  isPrimary: id === "hdfc",
  createdAt: "",
});
const balances = () =>
  Object.fromEntries(
    useFinanceStore.getState().accounts.map((a) => [a.id, a.balance]),
  );
const settle = () => useFinanceStore.getState().flushSync();

beforeEach(() => {
  calls.length = 0;
  server.clear();
  server.set("hdfc", 10000);
  server.set("icici", 2000);
  useFinanceStore.setState({
    profile,
    accounts: [bank("hdfc", "HDFC", 10000), bank("icici", "ICICI", 2000)],
    transactions: [],
    emis: [],
    borrowings: [],
  });
});

const transfer = (amount = 3000) =>
  useFinanceStore.getState().addBankTransfer({
    fromAccountId: "hdfc",
    toAccountId: "icici",
    amount,
    date: currentDateKey(),
  });

describe("bank transfers", () => {
  it("moves money between banks locally and on the server", async () => {
    transfer();
    expect(balances()).toEqual({ hdfc: 7000, icici: 5000 });
    await settle();
    expect(calls).toEqual([
      "txn.save",
      "txn.save",
      "adjust:hdfc:-3000",
      "adjust:icici:3000",
    ]);
    expect(Object.fromEntries(server)).toEqual({ hdfc: 7000, icici: 5000 });
  });

  it("stores two linked legs that feed every per-bank figure", () => {
    transfer();
    const txns = useFinanceStore.getState().transactions;
    expect(txns).toHaveLength(2);
    expect(findTransferPair(txns[0]!, txns)?.id).toBe(txns[1]!.id);
    const month = currentMonthKey();
    expect(bankMonthFlow("hdfc", txns, month).transferOut).toBe(3000);
    expect(bankMonthFlow("icici", txns, month).transferIn).toBe(3000);
    expect(accountMonthDelta("hdfc", txns, month)).toBe(-3000);
    expect(accountMonthDelta("icici", txns, month)).toBe(3000);
  });

  it("is never counted as income, expense or saving", () => {
    transfer(3000);
    const txns = useFinanceStore.getState().transactions;
    const month = currentMonthKey();
    expect(monthTotals(txns, month)).toEqual({
      income: 0,
      expenses: 0,
      savingsDeposits: 0,
    });
    for (const id of ["hdfc", "icici"]) {
      expect(bankMonthFlow(id, txns, month).net).toBe(0);
    }
    expect(bankMonthFlow("hdfc", txns, month).transferNet).toBe(-3000);
    expect(bankMonthFlow("icici", txns, month).transferNet).toBe(3000);
  });

  it("keeps real savings separate from transfers in the same month", () => {
    useFinanceStore.getState().addSavingDeposit("hdfc", 1000);
    transfer(3000);
    const txns = useFinanceStore.getState().transactions;
    const month = currentMonthKey();
    expect(bankMonthFlow("hdfc", txns, month).net).toBe(1000);
    expect(monthTotals(txns, month).savingsDeposits).toBe(1000);
    expect(monthTotals(txns, month).expenses).toBe(0);
    expect(balances()).toEqual({ hdfc: 8000, icici: 5000 });
  });

  it("editing either leg updates both banks", async () => {
    transfer();
    const inLeg = useFinanceStore
      .getState()
      .transactions.find((t) => t.accountId === "icici")!;
    useFinanceStore
      .getState()
      .updateBankTransfer(inLeg.id, { amount: 1000, date: currentDateKey() });
    expect(balances()).toEqual({ hdfc: 9000, icici: 3000 });
    const txns = useFinanceStore.getState().transactions;
    expect(txns.every((t) => t.amount === 1000)).toBe(true);
    expect(findTransferPair(txns[0]!, txns)).toBeDefined();
    await settle();
    expect(Object.fromEntries(server)).toEqual({ hdfc: 9000, icici: 3000 });
  });

  it("deleting one leg (from any screen) removes the whole transfer", async () => {
    transfer();
    const outLeg = useFinanceStore.getState().transactions[0]!;
    useFinanceStore.getState().deleteTransaction(outLeg.id);
    expect(useFinanceStore.getState().transactions).toHaveLength(0);
    expect(balances()).toEqual({ hdfc: 10000, icici: 2000 });
    await settle();
    expect(calls.filter((c) => c === "txn.remove")).toHaveLength(2);
    expect(Object.fromEntries(server)).toEqual({ hdfc: 10000, icici: 2000 });
  });

  it("ignores invalid transfers", () => {
    const s = useFinanceStore.getState();
    s.addBankTransfer({
      fromAccountId: "hdfc",
      toAccountId: "hdfc",
      amount: 100,
      date: currentDateKey(),
    });
    s.addBankTransfer({
      fromAccountId: "hdfc",
      toAccountId: "icici",
      amount: 0,
      date: currentDateKey(),
    });
    expect(useFinanceStore.getState().transactions).toHaveLength(0);
    expect(balances()).toEqual({ hdfc: 10000, icici: 2000 });
  });

  it("separate transfers of the same amount on the same day stay distinct pairs", () => {
    transfer(500);
    transfer(500);
    const txns = useFinanceStore.getState().transactions;
    const pairs = new Set(
      txns.map((t) => [t.id, findTransferPair(t, txns)?.id].sort().join()),
    );
    expect(pairs.size).toBe(2);
  });
});
