import { borrowingRepo } from "@/services/repositories";
import { isoNow } from "@/utils";
import type { Borrowing, BorrowingPayment } from "@/types";
import { newId } from "./helpers";
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
) => ({
  addBorrowing: (input) => {
    const s = get();
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
    set({ borrowings: [borrowing, ...s.borrowings] });
    sync(() => borrowingRepo.save(borrowing));
  },

  updateBorrowing: (id, patch) => {
    const s = get();
    const borrowings = s.borrowings.map((b) =>
      b.id === id ? { ...b, ...patch } : b,
    );
    set({ borrowings });
    const updated = borrowings.find((b) => b.id === id);
    if (updated) sync(() => borrowingRepo.save(updated));
  },

  deleteBorrowing: (id) => {
    const s = get();
    set({ borrowings: s.borrowings.filter((b) => b.id !== id) });
    sync(() => borrowingRepo.remove(id));
  },

  addBorrowingPayment: (borrowingId, input) => {
    const s = get();
    const payment: BorrowingPayment = {
      id: newId(),
      paidOn: input.paidOn,
      amount: input.amount,
      note: input.note ?? null,
    };
    set({
      borrowings: s.borrowings.map((b) =>
        b.id === borrowingId
          ? { ...b, payments: [payment, ...(b.payments ?? [])] }
          : b,
      ),
    });
    sync(() => borrowingRepo.savePayment(payment, borrowingId, ownerId()));
  },

  updateBorrowingPayment: (borrowingId, paymentId, patch) => {
    const s = get();
    let updated: BorrowingPayment | undefined;
    const borrowings = s.borrowings.map((b) => {
      if (b.id !== borrowingId) return b;
      const payments = (b.payments ?? []).map((p) => {
        if (p.id !== paymentId) return p;
        updated = { ...p, ...patch };
        return updated;
      });
      return { ...b, payments };
    });
    set({ borrowings });
    if (updated)
      sync(() => borrowingRepo.savePayment(updated!, borrowingId, ownerId()));
  },

  deleteBorrowingPayment: (borrowingId, paymentId) => {
    const s = get();
    set({
      borrowings: s.borrowings.map((b) =>
        b.id === borrowingId
          ? {
              ...b,
              payments: (b.payments ?? []).filter((p) => p.id !== paymentId),
            }
          : b,
      ),
    });
    sync(() => borrowingRepo.removePayment(paymentId));
  },
});
