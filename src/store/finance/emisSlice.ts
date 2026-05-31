import { emiRepo } from "@/services/repositories";
import { isoNow } from "@/utils";
import type { Emi } from "@/types";
import { newId } from "./helpers";
import type { FinanceState, SliceCreator } from "./types";

type EmisSlice = Pick<
  FinanceState,
  | "addEmi"
  | "updateEmi"
  | "deleteEmi"
  | "addEmiPayment"
  | "updateEmiPayment"
  | "deleteEmiPayment"
>;

export const createEmisSlice: SliceCreator<EmisSlice> = (
  set,
  get,
  { ownerId, sync },
) => ({
  addEmi: (input) => {
    const s = get();
    const base = s.accounts.find((a) => a.isPrimary) ?? s.accounts[0];
    const emi: Emi = {
      id: newId(),
      userId: ownerId(),
      accountId: base?.id ?? null,
      name: input.name,
      kind: input.kind,
      startMonth: input.startMonth,
      principal: input.principal,
      monthlyAmount: input.monthlyAmount,
      remainingMonths: input.remainingMonths,
      totalMonths: input.totalMonths,
      paidMonths: input.paidMonths,
      interestRate: input.interestRate,
      dueDay: input.dueDay,
      status: "active",
      payments: [],
      createdAt: isoNow(),
    };
    set({ emis: [emi, ...s.emis] });
    sync(() => emiRepo.save(emi));
  },

  updateEmi: (id, patch) => {
    const s = get();
    const emis = s.emis.map((e) => (e.id === id ? { ...e, ...patch } : e));
    set({ emis });
    const updated = emis.find((e) => e.id === id);
    if (updated) sync(() => emiRepo.save(updated));
  },

  deleteEmi: (id) => {
    const s = get();
    set({ emis: s.emis.filter((e) => e.id !== id) });
    sync(() => emiRepo.remove(id));
  },

  addEmiPayment: (emiId, input) => {
    const s = get();
    const payment = { id: newId(), month: input.month, amount: input.amount };
    set({
      emis: s.emis.map((e) =>
        e.id === emiId
          ? { ...e, payments: [payment, ...(e.payments ?? [])] }
          : e,
      ),
    });
    sync(() => emiRepo.savePayment(payment, emiId, ownerId()));
  },

  updateEmiPayment: (emiId, paymentId, patch) => {
    const s = get();
    let updated: { id: string; month: string; amount: number } | undefined;
    const emis = s.emis.map((e) => {
      if (e.id !== emiId) return e;
      const payments = (e.payments ?? []).map((p) => {
        if (p.id !== paymentId) return p;
        updated = { ...p, ...patch };
        return updated;
      });
      return { ...e, payments };
    });
    set({ emis });
    if (updated) sync(() => emiRepo.savePayment(updated!, emiId, ownerId()));
  },

  deleteEmiPayment: (emiId, paymentId) => {
    const s = get();
    set({
      emis: s.emis.map((e) =>
        e.id === emiId
          ? {
              ...e,
              payments: (e.payments ?? []).filter((p) => p.id !== paymentId),
            }
          : e,
      ),
    });
    sync(() => emiRepo.removePayment(paymentId));
  },
});
