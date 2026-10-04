import { beforeEach, describe, expect, it, vi } from "vitest";
import { currentMonthKey, emiPaidAmount } from "@/utils";
import { loadOutbox } from "./outbox";
import type { Account, Profile, Transaction } from "@/types";

const calls: string[] = [];
const failures = new Set<string>();
const transient = new Set<string>();
const serverBalance = new Map<string, number>();
const serverTxns = new Map<string, Transaction>();
let loseNextAdjustResponse = false;

vi.mock("@/services/repositories", () => {
  const rec = (name: string, effect?: (...args: never[]) => void) =>
    vi.fn(async (...args: unknown[]) => {
      if (failures.has(name)) {
        failures.delete(name);
        throw new Error("permission denied");
      }
      if (transient.has(name)) throw new Error("TypeError: Failed to fetch");
      calls.push(name);
      effect?.(...(args as never[]));
      return args;
    });
  return {
    accountRepo: {
      list: () => Promise.resolve([]),
      insert: rec("account.insert"),
      updateMeta: rec("account.updateMeta"),
      remove: rec("account.remove"),
      adjustBalance: vi.fn(
        async (
          id: string,
          _uid: string,
          delta: number,
          opts: {
            lastAttempt?: { before: number; next: number };
            onAttempt?: (a: { before: number; next: number }) => void;
          } = {},
        ) => {
          if (failures.has("account.adjust")) {
            failures.delete("account.adjust");
            throw new Error("permission denied");
          }
          const current = serverBalance.get(id) ?? 0;
          if (opts.lastAttempt && current === opts.lastAttempt.next) {
            calls.push(`account.adjust:already-applied`);
            return current;
          }
          const next = current + delta;
          opts.onAttempt?.({ before: current, next });
          serverBalance.set(id, next);
          if (loseNextAdjustResponse) {
            loseNextAdjustResponse = false;
            throw new Error("TypeError: Failed to fetch");
          }
          calls.push(`account.adjust:${delta}`);
          return next;
        },
      ),
    },
    transactionRepo: {
      list: () => Promise.resolve([]),
      save: rec("txn.save", (t: Transaction) => serverTxns.set(t.id, t)),
      remove: rec("txn.remove", (id: string) => serverTxns.delete(id)),
      removeByAccount: rec("txn.removeByAccount"),
    },
    emiRepo: {
      save: rec("emi.save"),
      remove: rec("emi.remove"),
      savePayment: rec("emi.savePayment"),
      removePayment: rec("emi.removePayment"),
    },
    borrowingRepo: {
      save: rec("borrowing.save"),
      remove: rec("borrowing.remove"),
      savePayment: rec("borrowing.savePayment"),
      removePayment: rec("borrowing.removePayment"),
    },
    budgetRepo: { save: rec("budgets.save") },
    profileRepo: {
      get: () => Promise.resolve(null),
      update: rec("profile.update"),
    },
    fetchSnapshot: vi.fn(async () => ({
      profile,
      majorAccountId: null,
      dailyAccountId: null,
      accounts: [{ ...account, balance: serverBalance.get("acc1") ?? 0 }],
      transactions: [...serverTxns.values()],
      emis: [],
      borrowings: [],
      budgets: null,
      authEmail: null,
    })),
  };
});

import { useFinanceStore } from "@/store/financeStore";

const profile: Profile = {
  id: "u1",
  email: "a@b.c",
  username: null,
  fullName: "A",
  phone: null,
  avatarUrl: null,
  currency: "INR",
  monthlySalary: 0,
  savingsTarget: 0,
  onboardingComplete: true,
  streakCount: 0,
  createdAt: "",
  updatedAt: "",
};
const account: Account = {
  id: "acc1",
  userId: "u1",
  name: "HDFC",
  type: "savings",
  balance: 10000,
  institution: null,
  colorTag: "#000",
  isPrimary: true,
  createdAt: "",
};
const expense = (amount: number) => ({
  accountId: "acc1",
  type: "expense" as const,
  amount,
  category: "food" as const,
  occurredAt: new Date().toISOString(),
});
const settle = async () => {
  for (let i = 0; i < 5; i += 1) {
    await useFinanceStore.getState().flushSync();
    await new Promise((r) => setTimeout(r, 0));
  }
};

beforeEach(() => {
  calls.length = 0;
  failures.clear();
  transient.clear();
  serverTxns.clear();
  loseNextAdjustResponse = false;
  useFinanceStore.getState().discardPendingSync();
  serverBalance.clear();
  serverBalance.set("acc1", 10000);
  useFinanceStore.setState({
    profile,
    accounts: [account],
    transactions: [],
    emis: [],
    borrowings: [],
    budgets: {},
  });
});

describe("serial sync queue", () => {
  it("sends balance changes as deltas, never absolute balances", async () => {
    useFinanceStore.getState().addTransaction(expense(100));
    await settle();
    expect(calls).toEqual(["txn.save", "account.adjust:-100"]);
    expect(serverBalance.get("acc1")).toBe(9900);
  });

  it("a rejected change is undone alone; later saves still apply and local resyncs", async () => {
    failures.add("txn.save");
    useFinanceStore.getState().addTransaction(expense(100));
    useFinanceStore.getState().addTransaction(expense(200));
    await settle();
    expect(serverBalance.get("acc1")).toBe(9800);
    expect([...serverTxns.values()].map((t) => t.amount)).toEqual([200]);
    const s = useFinanceStore.getState();
    expect(s.transactions.map((t) => t.amount)).toEqual([200]);
    expect(s.accounts[0]!.balance).toBe(9800);
    expect(s.pendingSync).toBe(0);
  });

  it("undoes completed steps when a later step of the same mutation fails", async () => {
    failures.add("account.adjust");
    useFinanceStore.getState().addTransaction(expense(100));
    await settle();
    expect(calls).toEqual(["txn.save", "txn.remove"]);
  });

  it("editing a bank's name and balance never sends a stale row", async () => {
    useFinanceStore.getState().addSavingDeposit("acc1", 2000);
    useFinanceStore
      .getState()
      .updateAccount("acc1", { name: "ICICI", balance: 12000 });
    await settle();
    expect(calls).toEqual([
      "txn.save",
      "account.adjust:2000",
      "account.updateMeta",
    ]);
    expect(serverBalance.get("acc1")).toBe(12000);
  });
});

describe("offline outbox", () => {
  it("keeps saves queued and persisted while the network is down, then sends them", async () => {
    transient.add("txn.save");
    useFinanceStore.getState().addTransaction(expense(100));
    await settle();
    let s = useFinanceStore.getState();
    expect(s.pendingSync).toBe(1);
    expect(s.syncStatus).toBe("offline");
    expect(s.transactions).toHaveLength(1);
    expect(s.accounts[0]!.balance).toBe(9900);
    expect(loadOutbox()).toHaveLength(1);
    expect(serverTxns.size).toBe(0);

    transient.clear();
    useFinanceStore.getState().retrySync();
    await settle();
    s = useFinanceStore.getState();
    expect(s.pendingSync).toBe(0);
    expect(s.syncStatus).toBe("idle");
    expect(loadOutbox()).toHaveLength(0);
    expect(serverTxns.size).toBe(1);
    expect(serverBalance.get("acc1")).toBe(9900);
  }, 10_000);

  it("a reload while saves are queued keeps the unsent changes on screen", async () => {
    transient.add("txn.save");
    useFinanceStore.getState().addTransaction(expense(100));
    await settle();
    await useFinanceStore.getState().hydrate("u1");
    const s = useFinanceStore.getState();
    expect(s.transactions).toHaveLength(1);
    expect(s.accounts[0]!.balance).toBe(9900);
    expect(s.pendingSync).toBe(1);
  }, 10_000);

  it("never applies a balance change twice when the response was lost", async () => {
    loseNextAdjustResponse = true;
    useFinanceStore.getState().addTransaction(expense(100));
    await settle();
    expect(serverBalance.get("acc1")).toBe(9900);
    expect(calls).toContain("account.adjust:already-applied");
    expect(useFinanceStore.getState().pendingSync).toBe(0);
  });
});

describe("EMI fixes", () => {
  it("re-saving a SIP with unchanged pre-tracking amount does not double count", () => {
    const s = useFinanceStore.getState();
    s.addEmi({
      name: "SIP",
      kind: "sip",
      startMonth: "2025-01",
      monthlyAmount: 5000,
      principal: 50000,
      interestRate: 0,
      dueDay: 5,
      totalMonths: 0,
      paidMonths: 10,
      remainingMonths: 0,
    });
    const id = useFinanceStore.getState().emis[0]!.id;
    useFinanceStore
      .getState()
      .addEmiPayment(id, { month: currentMonthKey(), amount: 5000 });
    const before = emiPaidAmount(useFinanceStore.getState().emis[0]!);
    useFinanceStore.getState().updateEmi(id, {
      principal: 50000,
      paidMonths: 10 + 1,
      totalMonths: 0,
      remainingMonths: 0,
    });
    expect(emiPaidAmount(useFinanceStore.getState().emis[0]!)).toBe(before);
  });

  it("updateEmi re-derives status from paid months", () => {
    useFinanceStore.getState().addEmi({
      name: "Car Loan",
      kind: "loan",
      startMonth: "2025-01",
      monthlyAmount: 1000,
      principal: 0,
      interestRate: 0,
      dueDay: 5,
      totalMonths: 12,
      paidMonths: 3,
      remainingMonths: 9,
    });
    const id = useFinanceStore.getState().emis[0]!.id;
    useFinanceStore.getState().updateEmi(id, { paidMonths: 12 });
    expect(useFinanceStore.getState().emis[0]!.status).toBe("closed");
    useFinanceStore.getState().updateEmi(id, { paidMonths: 5 });
    expect(useFinanceStore.getState().emis[0]!.status).toBe("active");
  });

  it("deleteEmi removes its payments explicitly", async () => {
    useFinanceStore.getState().addEmi({
      name: "Loan",
      kind: "loan",
      startMonth: "2025-01",
      monthlyAmount: 100,
      principal: 0,
      interestRate: 0,
      dueDay: 5,
      totalMonths: 12,
      paidMonths: 0,
      remainingMonths: 12,
    });
    const id = useFinanceStore.getState().emis[0]!.id;
    useFinanceStore.getState().addEmiPayment(id, {
      month: currentMonthKey(),
      amount: 100,
      accountId: "acc1",
    });
    await settle();
    calls.length = 0;
    useFinanceStore.getState().deleteEmi(id);
    await settle();
    expect(calls).toEqual([
      "account.adjust:100",
      "emi.removePayment",
      "emi.remove",
    ]);
  });
});

describe("budgets", () => {
  it("are synced to the server in one write", async () => {
    useFinanceStore.getState().setBudgets({ food: 5000, rent: 0 });
    await settle();
    expect(calls).toEqual(["budgets.save"]);
    expect(useFinanceStore.getState().budgets).toEqual({ food: 5000 });
  });
});
