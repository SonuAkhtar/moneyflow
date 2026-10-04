import { isoNow } from "@/utils";
import type { Borrowing, BorrowingPayment } from "@/types";
import { newId } from "./helpers";
import { step } from "./steps";
import type { FinanceState, SliceCreator } from "./types";

type BorrowingsSlice = Pick<
  FinanceState,
  | "addBorrowing"
  | "updateBorrowing"
  | "deleteBorrowing"
  | "addBorrowingPayment"
  | "updateBorrowingPayment"
  | "deleteBorrowingPayment"
>;

export const createBorrowingsSlice: SliceCreator<BorrowingsSlice> = (
  set,
  get,
  { ownerId, sync },
) => {
  const replace = (id: string, next: Borrowing) =>
    set({ borrowings: get().borrowings.map((b) => (b.id === id ? next : b)) });

  return {
    addBorrowing: (input) => {
      const borrowing: Borrowing = {
        id: newId(),
        userId: ownerId(),
        lender: input.lender,
        purpose: input.purpose ?? null,
        amount: input.amount,
        borrowedOn: input.borrowedOn,
        dueDate: input.dueDate ?? null,
        note: input.note ?? null,
        payments: [],
        createdAt: isoNow(),
      };
      set({ borrowings: [borrowing, ...get().borrowings] });
      sync([step.saveBorrowing(borrowing)]);
    },

    updateBorrowing: (id, patch) => {
      const old = get().borrowings.find((b) => b.id === id);
      if (!old) return;
      const updated = { ...old, ...patch };
      replace(id, updated);
      sync([step.saveBorrowing(updated, old)]);
    },

    deleteBorrowing: (id) => {
      const old = get().borrowings.find((b) => b.id === id);
      if (!old) return;
      ownerId();
      set({ borrowings: get().borrowings.filter((b) => b.id !== id) });
      sync([
        ...(old.payments ?? []).map((p) => step.removeBorrowingPayment(id, p)),
        step.removeBorrowing(old),
      ]);
    },

    addBorrowingPayment: (borrowingId, input) => {
      const old = get().borrowings.find((b) => b.id === borrowingId);
      if (!old) return;
      const payment: BorrowingPayment = {
        id: newId(),
        paidOn: input.paidOn,
        amount: input.amount,
        note: input.note ?? null,
      };
      replace(borrowingId, {
        ...old,
        payments: [payment, ...(old.payments ?? [])],
      });
      sync([step.saveBorrowingPayment(borrowingId, payment)]);
    },

    updateBorrowingPayment: (borrowingId, paymentId, patch) => {
      const old = get().borrowings.find((b) => b.id === borrowingId);
      const previous = old?.payments?.find((p) => p.id === paymentId);
      if (!old || !previous) return;
      const updated = { ...previous, ...patch };
      replace(borrowingId, {
        ...old,
        payments: (old.payments ?? []).map((p) =>
          p.id === paymentId ? updated : p,
        ),
      });
      sync([step.saveBorrowingPayment(borrowingId, updated, previous)]);
    },

    deleteBorrowingPayment: (borrowingId, paymentId) => {
      const old = get().borrowings.find((b) => b.id === borrowingId);
      const payment = old?.payments?.find((p) => p.id === paymentId);
      if (!old || !payment) return;
      replace(borrowingId, {
        ...old,
        payments: (old.payments ?? []).filter((p) => p.id !== paymentId),
      });
      sync([step.removeBorrowingPayment(borrowingId, payment)]);
    },
  };
};
