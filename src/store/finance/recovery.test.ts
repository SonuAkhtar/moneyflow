import { beforeEach, describe, expect, it, vi } from "vitest";
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
describe("sync recovery", () => {
  it("a rejected change also reverts later changes that depend on it", async () => {
    transient.add("txn.save");
    useFinanceStore.getState().addTransaction(expense(100));
    await settle();
    const id = useFinanceStore.getState().transactions[0]!.id;
    useFinanceStore.getState().updateTransaction(id, expense(150));
    transient.clear();
    failures.add("txn.save");
    useFinanceStore.getState().retrySync();
    await settle();

    expect(serverBalance.get("acc1")).toBe(10000);
    expect(serverTxns.size).toBe(0);
    expect(useFinanceStore.getState().pendingSync).toBe(0);
    expect(useFinanceStore.getState().accounts[0]!.balance).toBe(10000);
  }, 20000);

  it("a snapshot fetched before a change synced does not overwrite it", async () => {
    const repos = await import("@/services/repositories");
    const stale = {
      profile,
      majorAccountId: null,
      dailyAccountId: null,
      accounts: [{ ...account, balance: 10000 }],
      transactions: [],
      emis: [],
      borrowings: [],
      budgets: null,
      spendBudget: null,
      authEmail: null,
      historyFrom: null,
    };
    let release!: () => void;
    vi.mocked(repos.fetchSnapshot).mockImplementationOnce(
      () => new Promise((r) => (release = () => r(stale as never))),
    );
    const loading = useFinanceStore.getState().hydrate("u1");
    await new Promise((r) => setTimeout(r, 0));
    useFinanceStore.getState().addTransaction(expense(100));
    await settle();
    release();
    await loading;
    await settle();

    const s = useFinanceStore.getState();
    expect(s.accounts[0]!.balance).toBe(9900);
    expect(s.transactions).toHaveLength(1);
  });
});
