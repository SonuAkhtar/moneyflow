import { emiKind, isoNow } from "@/utils";
import type { Emi, EmiPayment } from "@/types";
import { applyBalance, newId } from "./helpers";
import { balanceSteps, step } from "./steps";
import type { FinanceState, SliceCreator } from "./types";

export const withPaidMonths = (emi: Emi, paidMonths: number): Emi => {
  const paid = Math.max(0, paidMonths);
  const remainingMonths =
    emi.totalMonths > 0
      ? Math.max(0, emi.totalMonths - paid)
      : emi.remainingMonths;
  let status = emi.status;
  if (emiKind(emi) === "loan" && emi.totalMonths > 0) {
    status = paid >= emi.totalMonths ? "closed" : "active";
  } else if (status === "closed" && paid < emi.totalMonths) {
    status = "active";
  }
  return { ...emi, paidMonths: paid, remainingMonths, status };
};

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
    const uid = ownerId();
    const base = s.accounts.find((a) => a.isPrimary) ?? s.accounts[0];
    const emi = withPaidMonths(
      {
        id: newId(),
        userId: uid,
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
      },
      input.paidMonths,
    );
    set({ emis: [emi, ...s.emis] });
    sync([step.saveEmi(emi)]);
  },

  updateEmi: (id, patch) => {
    const s = get();
    const old = s.emis.find((e) => e.id === id);
    if (!old) return;
    const merged: Emi = { ...old, ...patch };
    const updated =
      patch.paidMonths !== undefined || patch.totalMonths !== undefined
        ? withPaidMonths(merged, merged.paidMonths)
        : merged;
    set({ emis: s.emis.map((e) => (e.id === id ? updated : e)) });
    sync([step.saveEmi(updated, old)]);
  },

  deleteEmi: (id) => {
    const s = get();
    const emi = s.emis.find((e) => e.id === id);
    if (!emi) return;
    ownerId();
    const deltas: [string | null, number][] = (emi.payments ?? []).map((p) => [
      p.accountId,
      p.amount,
    ]);
    let accounts = s.accounts;
    for (const [aid, delta] of deltas)
      if (aid) accounts = applyBalance(accounts, aid, delta);
    set({ emis: s.emis.filter((e) => e.id !== id), accounts });
    sync([
      ...balanceSteps(deltas),
      ...(emi.payments ?? []).map((p) => step.removeEmiPayment(id, p)),
      step.removeEmi(emi),
    ]);
  },

  addEmiPayment: (emiId, input) => {
    const s = get();
    const old = s.emis.find((e) => e.id === emiId);
    if (!old) return;
    ownerId();
    const payment: EmiPayment = {
      id: newId(),
      month: input.month,
      paidOn: input.paidOn ?? `${input.month}-01`,
      amount: input.amount,
      accountId: input.accountId ?? null,
    };
    const updatedEmi = withPaidMonths(
      { ...old, payments: [payment, ...(old.payments ?? [])] },
      (old.paidMonths ?? 0) + 1,
    );
    set({
      emis: s.emis.map((e) => (e.id === emiId ? updatedEmi : e)),
      accounts: payment.accountId
        ? applyBalance(s.accounts, payment.accountId, -payment.amount)
        : s.accounts,
    });
    sync([
      step.saveEmiPayment(emiId, payment),
      step.saveEmi(updatedEmi, old),
      ...balanceSteps([[payment.accountId, -payment.amount]]),
    ]);
  },

  updateEmiPayment: (emiId, paymentId, patch) => {
    const s = get();
    const emi = s.emis.find((e) => e.id === emiId);
    const old = emi?.payments?.find((p) => p.id === paymentId);
    if (!emi || !old) return;
    ownerId();
    const updated: EmiPayment = { ...old, ...patch };
    const deltas: [string | null, number][] = [
      [old.accountId, old.amount],
      [updated.accountId, -updated.amount],
    ];
    let accounts = s.accounts;
    for (const [aid, delta] of deltas)
      if (aid) accounts = applyBalance(accounts, aid, delta);
    set({
      emis: s.emis.map((e) =>
        e.id === emiId
          ? {
              ...e,
              payments: (e.payments ?? []).map((p) =>
                p.id === paymentId ? updated : p,
              ),
            }
          : e,
      ),
      accounts,
    });
    sync([step.saveEmiPayment(emiId, updated, old), ...balanceSteps(deltas)]);
  },

  deleteEmiPayment: (emiId, paymentId) => {
    const s = get();
    const old = s.emis.find((e) => e.id === emiId);
    const payment = old?.payments?.find((p) => p.id === paymentId);
    if (!old || !payment) return;
    ownerId();
    const updatedEmi = withPaidMonths(
      {
        ...old,
        payments: (old.payments ?? []).filter((p) => p.id !== paymentId),
      },
      (old.paidMonths ?? 0) - 1,
    );
    set({
      emis: s.emis.map((e) => (e.id === emiId ? updatedEmi : e)),
      accounts: payment.accountId
        ? applyBalance(s.accounts, payment.accountId, payment.amount)
        : s.accounts,
    });
    sync([
      step.removeEmiPayment(emiId, payment),
      step.saveEmi(updatedEmi, old),
      ...balanceSteps([[payment.accountId, payment.amount]]),
    ]);
  },
});
