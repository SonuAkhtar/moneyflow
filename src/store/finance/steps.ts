import type { AccountMetaPatch } from "@/services/repositories";
import type {
  Account,
  Borrowing,
  BorrowingPayment,
  CategoryId,
  Emi,
  EmiPayment,
  Transaction,
} from "@/types";
import type { ProfilePatch } from "./ops";
import type { SyncStep } from "./types";

export const step = {
  adjustBalance: (accountId: string, delta: number): SyncStep => ({
    op: { k: "account.adjust", id: accountId, delta },
    undo: [{ k: "account.adjust", id: accountId, delta: -delta }],
    retry: false,
  }),

  insertAccount: (account: Account): SyncStep => ({
    op: { k: "account.insert", account },
    undo: [{ k: "account.remove", id: account.id }],
  }),

  updateAccountMeta: (
    id: string,
    patch: AccountMetaPatch,
    previous: AccountMetaPatch,
  ): SyncStep => ({
    op: { k: "account.meta", id, patch },
    undo: [{ k: "account.meta", id, patch: previous }],
  }),

  removeAccount: (account: Account): SyncStep => ({
    op: { k: "account.remove", id: account.id },
  }),

  saveTransaction: (txn: Transaction, previous?: Transaction): SyncStep => ({
    op: { k: "txn.save", txn },
    undo: [
      previous
        ? { k: "txn.save", txn: previous }
        : { k: "txn.remove", id: txn.id },
    ],
  }),

  removeTransaction: (txn: Transaction): SyncStep => ({
    op: { k: "txn.remove", id: txn.id },
    undo: [{ k: "txn.save", txn }],
  }),

  removeAccountTransactions: (
    accountId: string,
    loaded: Transaction[],
  ): SyncStep => ({
    op: { k: "txn.removeByAccount", accountId },
    undo: loaded.map((txn) => ({ k: "txn.save" as const, txn })),
  }),

  updateProfile: (patch: ProfilePatch, previous: ProfilePatch): SyncStep => ({
    op: { k: "profile.update", patch },
    undo: [{ k: "profile.update", patch: previous }],
  }),

  saveEmi: (emi: Emi, previous?: Emi): SyncStep => ({
    op: { k: "emi.save", emi },
    undo: [
      previous
        ? { k: "emi.save", emi: previous }
        : { k: "emi.remove", id: emi.id },
    ],
  }),

  removeEmi: (emi: Emi): SyncStep => ({ op: { k: "emi.remove", id: emi.id } }),

  saveEmiPayment: (
    emiId: string,
    payment: EmiPayment,
    previous?: EmiPayment,
  ): SyncStep => ({
    op: { k: "emi.savePayment", emiId, payment },
    undo: [
      previous
        ? { k: "emi.savePayment", emiId, payment: previous }
        : { k: "emi.removePayment", id: payment.id },
    ],
  }),

  removeEmiPayment: (emiId: string, payment: EmiPayment): SyncStep => ({
    op: { k: "emi.removePayment", id: payment.id },
    undo: [{ k: "emi.savePayment", emiId, payment }],
  }),

  saveBorrowing: (borrowing: Borrowing, previous?: Borrowing): SyncStep => ({
    op: { k: "borrowing.save", borrowing },
    undo: [
      previous
        ? { k: "borrowing.save", borrowing: previous }
        : { k: "borrowing.remove", id: borrowing.id },
    ],
  }),

  removeBorrowing: (borrowing: Borrowing): SyncStep => ({
    op: { k: "borrowing.remove", id: borrowing.id },
  }),

  saveBorrowingPayment: (
    borrowingId: string,
    payment: BorrowingPayment,
    previous?: BorrowingPayment,
  ): SyncStep => ({
    op: { k: "borrowing.savePayment", borrowingId, payment },
    undo: [
      previous
        ? { k: "borrowing.savePayment", borrowingId, payment: previous }
        : { k: "borrowing.removePayment", id: payment.id },
    ],
  }),

  removeBorrowingPayment: (
    borrowingId: string,
    payment: BorrowingPayment,
  ): SyncStep => ({
    op: { k: "borrowing.removePayment", id: payment.id },
    undo: [{ k: "borrowing.savePayment", borrowingId, payment }],
  }),

  saveBudgets: (budgets: Partial<Record<CategoryId, number>>): SyncStep => ({
    op: { k: "budgets.save", budgets },
  }),
};

export const balanceSteps = (
  deltas: [accountId: string | null | undefined, delta: number][],
): SyncStep[] => {
  const totals = new Map<string, number>();
  for (const [id, delta] of deltas) {
    if (!id || !delta) continue;
    totals.set(id, (totals.get(id) ?? 0) + delta);
  }
  return [...totals]
    .map(([id, delta]) => [id, Math.round(delta * 100) / 100] as const)
    .filter(([, delta]) => delta !== 0)
    .map(([id, delta]) => step.adjustBalance(id, delta));
};
