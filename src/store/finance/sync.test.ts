import { beforeEach, describe, expect, it, vi } from "vitest";
import { currentMonthKey, emiPaidAmount } from "@/utils";
import { loadOutbox, saveOutbox, type OutboxGroup } from "./outbox";
import type { Account, Profile, Transaction } from "@/types";

const calls: string[] = [];
const failures = new Set<string>();
const transient = new Set<string>();
const authFail = new Set<string>();
const serverBalance = new Map<string, number>();
const serverTxns = new Map<string, Transaction>();
const appliedOps = new Set<string>();
let loseNextAdjustResponse = false;

vi.mock("@/services/repositories", () => {
  const rec = (name: string, effect?: (...args: never[]) => void) =>
    vi.fn(async (...args: unknown[]) => {
      if (failures.has(name)) {
        failures.delete(name);
        throw new Error("permission denied");
      }
      if (transient.has(name)) throw new Error("TypeError: Failed to fetch");
      if (authFail.has(name)) throw new Error("JWT expired");
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
      adjustBalance: vi.fn(async (id: string, delta: number, opId: string) => {
        if (failures.has("account.adjust")) {
          failures.delete("account.adjust");
          throw new Error("permission denied");
        }
        const current = serverBalance.get(id) ?? 0;
        if (appliedOps.has(opId)) {
          calls.push(`account.adjust:already-applied`);
          return current;
        }
        appliedOps.add(opId);
        const next = current + delta;
        serverBalance.set(id, next);
        if (loseNextAdjustResponse) {
          loseNextAdjustResponse = false;
          throw new Error("TypeError: Failed to fetch");
        }
        calls.push(`account.adjust:${delta}`);
        return next;
      }),
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

const { refreshSession } = vi.hoisted(() => ({
  refreshSession: vi.fn(
    async (): Promise<{ data: object; error: Error | null }> => ({
      data: {},
      error: null,
    }),
  ),
}));
vi.mock("@/lib/supabase/client", () => ({
  getBrowserSupabase: () => ({ auth: { refreshSession } }),
}));

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
  authFail.clear();
  refreshSession.mockReset();
  refreshSession.mockResolvedValue({ data: {}, error: null });
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
      startMonth: currentMonthKey(),
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

describe("shared outbox across tabs", () => {
  it("doesn't re-run a group another tab already synced", async () => {
    transient.add("txn.save");
    useFinanceStore.getState().addTransaction(expense(100));
    await settle();
    expect(loadOutbox()).toHaveLength(1);
    saveOutbox([]);
    transient.clear();
    calls.length = 0;
    useFinanceStore.getState().retrySync();
    await settle();
    expect(calls).toEqual([]);
    expect(useFinanceStore.getState().pendingSync).toBe(0);
  }, 10_000);

  it("keeps and runs groups queued by another tab", async () => {
    transient.add("txn.save");
    useFinanceStore.getState().addTransaction(expense(100));
    await settle();
    const foreign: OutboxGroup = {
      id: "other-tab",
      uid: "u1",
      steps: [{ op: { k: "budgets.save", budgets: { food: 1 } } }],
      cursor: 0,
    };
    saveOutbox([...loadOutbox(), foreign]);
    useFinanceStore.getState().addTransaction(expense(50));
    expect(loadOutbox().map((g) => g.id)).toContain("other-tab");
    expect(loadOutbox()).toHaveLength(3);
    transient.clear();
    useFinanceStore.getState().retrySync();
    await settle();
    expect(calls).toEqual([
      "txn.save",
      "account.adjust:-100",
      "budgets.save",
      "txn.save",
      "account.adjust:-50",
    ]);
    expect(loadOutbox()).toHaveLength(0);
  }, 10_000);

  it("works through the queue under a web lock", async () => {
    const request = vi.spyOn(navigator.locks, "request");
    useFinanceStore.getState().addTransaction(expense(100));
    await settle();
    expect(request).toHaveBeenCalledWith("mf-outbox", expect.any(Function));
    request.mockRestore();
  });
});

describe("blocked sync", () => {
  it("keeps changes queued when the session can't be refreshed", async () => {
    authFail.add("txn.save");
    refreshSession.mockResolvedValue({ data: {}, error: new Error("expired") });
    useFinanceStore.getState().addTransaction(expense(100));
    await settle();
    expect(refreshSession).toHaveBeenCalled();
    let s = useFinanceStore.getState();
    expect(calls).toEqual([]);
    expect(s.pendingSync).toBe(1);
    expect(s.transactions).toHaveLength(1);

    authFail.clear();
    useFinanceStore.getState().retrySync();
    await settle();
    s = useFinanceStore.getState();
    expect(calls).toEqual(["txn.save", "account.adjust:-100"]);
    expect(s.pendingSync).toBe(0);
  });

  it("rolls back a change that still fails after a successful refresh", async () => {
    authFail.add("txn.save");
    useFinanceStore.getState().addTransaction(expense(100));
    await settle();
    const s = useFinanceStore.getState();
    expect(refreshSession).toHaveBeenCalledTimes(2);
    expect(s.pendingSync).toBe(0);
    expect(s.transactions).toHaveLength(0);
  });

  it("resumes an interrupted rollback instead of re-running the change", async () => {
    failures.add("account.adjust");
    transient.add("txn.remove");
    useFinanceStore.getState().addTransaction(expense(100));
    await settle();
    expect(calls).toEqual(["txn.save"]);
    expect(loadOutbox()[0]?.undoing).toBe(true);
    expect(useFinanceStore.getState().pendingSync).toBe(1);

    transient.clear();
    useFinanceStore.getState().retrySync();
    await settle();
    expect(calls).toEqual(["txn.save", "txn.remove"]);
    expect(serverTxns.size).toBe(0);
    expect(useFinanceStore.getState().pendingSync).toBe(0);
  });
});

describe("one outbox group per edit", () => {
  const salary = (id: string, amount: number): Transaction => ({
    id,
    userId: "u1",
    accountId: "acc1",
    type: "income",
    amount,
    category: "salary",
    note: null,
    merchant: null,
    isBigExpense: false,
    occurredAt: new Date().toISOString(),
    createdAt: "",
  });

  it("setSalary updates the first salary row and removes the month's extras", async () => {
    useFinanceStore.setState({
      transactions: [salary("s1", 3000), salary("s2", 2000)],
    });
    useFinanceStore.getState().setSalary(currentMonthKey(), 7000);
    expect(loadOutbox()).toHaveLength(1);
    const s = useFinanceStore.getState();
    expect(s.transactions.map((t) => [t.id, t.amount])).toEqual([["s1", 7000]]);
    expect(s.accounts[0]!.balance).toBe(12000);
    await settle();
    expect(calls).toEqual(["txn.save", "txn.remove", "account.adjust:2000"]);
  });

  it("editing a bank with a savings adjustment queues a single group", async () => {
    useFinanceStore
      .getState()
      .updateAccount("acc1", { name: "ICICI", balance: 12000 }, 2000);
    expect(loadOutbox()).toHaveLength(1);
    const s = useFinanceStore.getState();
    expect(s.accounts[0]!.balance).toBe(12000);
    expect(s.transactions[0]!.amount).toBe(2000);
    await settle();
    expect(calls).toEqual([
      "txn.save",
      "account.updateMeta",
      "account.adjust:2000",
    ]);
  });
});
