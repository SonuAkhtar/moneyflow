import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile, Transaction } from "@/types";

const listRange = vi.fn();

vi.mock("@/services/repositories", () => {
  const ok = vi.fn(async () => undefined);
  return {
    accountRepo: {
      list: async () => [],
      insert: ok,
      updateMeta: ok,
      remove: ok,
      adjustBalance: vi.fn(async () => 0),
    },
    transactionRepo: {
      list: async () => [],
      save: ok,
      remove: ok,
      removeByAccount: ok,
      listRange: (...args: unknown[]) => listRange(...args),
    },
    emiRepo: { save: ok, remove: ok, savePayment: ok, removePayment: ok },
    borrowingRepo: { save: ok, remove: ok, savePayment: ok, removePayment: ok },
    budgetRepo: { save: ok },
    profileRepo: { get: async () => null, update: ok },
    fetchSnapshot: vi.fn(),
  };
});

import { useFinanceStore } from "@/store/financeStore";
import { accountLabel, currentDateKey, currentMonthKey } from "@/utils";
import { monthTotals } from "./selectors";

const profile = { id: "u1", currency: "INR" } as Profile;

beforeEach(() => {
  listRange.mockReset();
  useFinanceStore.getState().discardPendingSync();
  useFinanceStore.setState({
    profile,
    accounts: [],
    transactions: [],
    emis: [],
    borrowings: [],
    historyFrom: null,
    historyLoading: false,
  });
});

describe("account types", () => {
  it("credit card balance tracks what is owed and the bill is paid by transfer", () => {
    const s = useFinanceStore.getState();
    s.addAccount({
      name: "HDFC",
      type: "savings",
      balance: 10000,
      colorTag: "#000",
    });
    s.addAccount({ name: "Card", type: "card", balance: 0, colorTag: "#000" });
    const [bank, card] = useFinanceStore.getState().accounts;
    useFinanceStore.getState().addTransaction({
      accountId: card!.id,
      type: "expense",
      amount: 1200,
      category: "food",
      occurredAt: new Date().toISOString(),
    });
    let cardNow = useFinanceStore
      .getState()
      .accounts.find((a) => a.id === card!.id)!;
    expect(cardNow.balance).toBe(-1200);
    expect(accountLabel(cardNow)).toContain("1,200 due");

    useFinanceStore.getState().addBankTransfer({
      fromAccountId: bank!.id,
      toAccountId: card!.id,
      amount: 1200,
      date: currentDateKey(),
    });
    cardNow = useFinanceStore
      .getState()
      .accounts.find((a) => a.id === card!.id)!;
    expect(cardNow.balance).toBe(0);
    const totals = monthTotals(
      useFinanceStore.getState().transactions,
      currentMonthKey(),
    );
    expect(totals.expenses).toBe(1200);
  });

  it("only the first account becomes primary; a new primary demotes the old one", () => {
    const s = useFinanceStore.getState();
    s.addAccount({ name: "A", type: "savings", balance: 0, colorTag: "#000" });
    s.addAccount({ name: "B", type: "wallet", balance: 0, colorTag: "#000" });
    expect(useFinanceStore.getState().accounts.map((a) => a.isPrimary)).toEqual(
      [true, false],
    );
    useFinanceStore.getState().addAccount({
      name: "C",
      type: "cash",
      balance: 0,
      colorTag: "#000",
      isPrimary: true,
    });
    expect(useFinanceStore.getState().accounts.map((a) => a.isPrimary)).toEqual(
      [false, false, true],
    );
  });
});

describe("loadHistory", () => {
  const txn = (id: string, occurredAt: string): Transaction => ({
    id,
    userId: "u1",
    accountId: "a",
    type: "expense",
    amount: 10,
    category: "food",
    note: null,
    merchant: null,
    isBigExpense: false,
    occurredAt,
    createdAt: occurredAt,
  });

  it("fetches only the missing range, merges without duplicates and extends the window", async () => {
    useFinanceStore.setState({
      historyFrom: "2025-10-01T00:00:00.000Z",
      transactions: [txn("recent", "2025-11-05T12:00:00.000Z")],
    });
    listRange.mockResolvedValue([
      txn("old", "2024-03-10T12:00:00.000Z"),
      txn("recent", "2025-11-05T12:00:00.000Z"),
    ]);
    await useFinanceStore.getState().loadHistory("2024-03");
    expect(listRange).toHaveBeenCalledWith(
      "u1",
      new Date(2024, 2, 1).toISOString(),
      "2025-10-01T00:00:00.000Z",
    );
    const s = useFinanceStore.getState();
    expect(s.transactions.map((t) => t.id).sort()).toEqual(["old", "recent"]);
    expect(s.historyFrom).toBe(new Date(2024, 2, 1).toISOString());
    expect(s.historyLoading).toBe(false);
  });

  it("does nothing for months already loaded", async () => {
    useFinanceStore.setState({ historyFrom: "2025-10-01T00:00:00.000Z" });
    await useFinanceStore.getState().loadHistory("2025-12");
    expect(listRange).not.toHaveBeenCalled();
  });
});
