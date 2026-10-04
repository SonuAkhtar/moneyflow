import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@/types";

const calls: string[] = [];

vi.mock("@/services/repositories", () => {
  const rec = (name: string) =>
    vi.fn(async () => {
      calls.push(name);
    });
  return {
    accountRepo: {
      list: async () => [],
      insert: rec("a"),
      updateMeta: rec("a"),
      remove: rec("a"),
      adjustBalance: rec("adjust"),
    },
    transactionRepo: {
      list: async () => [],
      save: rec("t"),
      remove: rec("t"),
      removeByAccount: rec("t"),
    },
    emiRepo: {
      save: rec("e"),
      remove: rec("e"),
      savePayment: rec("e"),
      removePayment: rec("e"),
    },
    borrowingRepo: {
      save: rec("borrowing.save"),
      remove: rec("borrowing.remove"),
      savePayment: rec("payment.save"),
      removePayment: rec("payment.remove"),
    },
    budgetRepo: { save: rec("b") },
    profileRepo: { get: async () => null, update: rec("p") },
    fetchSnapshot: vi.fn(),
  };
});

import { useFinanceStore } from "@/store/financeStore";
import { borrowingOutstanding, borrowingSettled } from "@/utils";

const settle = () => useFinanceStore.getState().flushSync();

beforeEach(() => {
  calls.length = 0;
  useFinanceStore.getState().discardPendingSync();
  useFinanceStore.setState({
    profile: { id: "u1", currency: "INR" } as Profile,
    borrowings: [],
    accounts: [],
    transactions: [],
  });
});

describe("borrowings", () => {
  it("tracks repayments until settled and syncs each change", async () => {
    const s = useFinanceStore.getState();
    s.addBorrowing({ lender: "Rahul", amount: 5000, borrowedOn: "2026-09-01" });
    const id = useFinanceStore.getState().borrowings[0]!.id;
    useFinanceStore
      .getState()
      .addBorrowingPayment(id, { amount: 2000, paidOn: "2026-09-10" });
    let b = useFinanceStore.getState().borrowings[0]!;
    expect(borrowingOutstanding(b)).toBe(3000);

    const paymentId = b.payments[0]!.id;
    useFinanceStore
      .getState()
      .updateBorrowingPayment(id, paymentId, { amount: 5000 });
    b = useFinanceStore.getState().borrowings[0]!;
    expect(borrowingSettled(b)).toBe(true);

    useFinanceStore.getState().deleteBorrowingPayment(id, paymentId);
    useFinanceStore.getState().updateBorrowing(id, { lender: "Rahul K" });
    await settle();
    expect(useFinanceStore.getState().borrowings[0]!.lender).toBe("Rahul K");
    expect(calls).toEqual([
      "borrowing.save",
      "payment.save",
      "payment.save",
      "payment.remove",
      "borrowing.save",
    ]);
  });

  it("deleting a borrowing removes its payments explicitly first", async () => {
    useFinanceStore.getState().addBorrowing({
      lender: "Office",
      amount: 1000,
      borrowedOn: "2026-09-01",
    });
    const id = useFinanceStore.getState().borrowings[0]!.id;
    useFinanceStore
      .getState()
      .addBorrowingPayment(id, { amount: 400, paidOn: "2026-09-02" });
    await settle();
    calls.length = 0;
    useFinanceStore.getState().deleteBorrowing(id);
    await settle();
    expect(useFinanceStore.getState().borrowings).toHaveLength(0);
    expect(calls).toEqual(["payment.remove", "borrowing.remove"]);
  });
});
