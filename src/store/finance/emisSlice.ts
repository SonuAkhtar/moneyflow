import { accountRepo, emiRepo } from "@/services/repositories";
import { emiKind, isoNow } from "@/utils";
import type { Account, Emi, EmiPayment } from "@/types";

const withPaidMonths = (emi: Emi, paidMonths: number): Emi => {
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
import { applyBalance, makeRollback, newId } from "./helpers";
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
    sync(() => emiRepo.save(emi), makeRollback(set, s, ["emis"]));
  },

  updateEmi: (id, patch) => {
    const s = get();
    const emis = s.emis.map((e) => (e.id === id ? { ...e, ...patch } : e));
    set({ emis });
    const updated = emis.find((e) => e.id === id);
    if (updated)
      sync(() => emiRepo.save(updated), makeRollback(set, s, ["emis"]));
  },

  deleteEmi: (id) => {
    const s = get();
    const emi = s.emis.find((e) => e.id === id);
    let accounts = s.accounts;
    const dirtyIds = new Set<string>();
    for (const p of emi?.payments ?? []) {
      if (!p.accountId) continue;
      accounts = applyBalance(accounts, p.accountId, p.amount);
      dirtyIds.add(p.accountId);
    }
    set({ emis: s.emis.filter((e) => e.id !== id), accounts });
    const dirty = [...dirtyIds]
      .map((aid) => accounts.find((a) => a.id === aid))
      .filter((a): a is Account => Boolean(a));
    const uid = ownerId();
    sync(
      () =>
        Promise.all([
          emiRepo.remove(id, uid),
          ...dirty.map((a) => accountRepo.save(a)),
        ]).then(() => undefined),
      makeRollback(set, s, ["emis", "accounts"]),
    );
  },

  addEmiPayment: (emiId, input) => {
    const s = get();
    const payment: EmiPayment = {
      id: newId(),
      month: input.month,
      paidOn: input.paidOn ?? `${input.month}-01`,
      amount: input.amount,
      accountId: input.accountId ?? null,
    };
    const accounts = payment.accountId
      ? applyBalance(s.accounts, payment.accountId, -payment.amount)
      : s.accounts;
    const emis = s.emis.map((e) =>
      e.id === emiId
        ? withPaidMonths(
            { ...e, payments: [payment, ...(e.payments ?? [])] },
            (e.paidMonths ?? 0) + 1,
          )
        : e,
    );
    set({ emis, accounts });
    const updatedEmi = emis.find((e) => e.id === emiId);
    const account = payment.accountId
      ? accounts.find((a) => a.id === payment.accountId)
      : undefined;
    sync(
      () =>
        Promise.all([
          emiRepo.savePayment(payment, emiId, ownerId()),
          ...(updatedEmi ? [emiRepo.save(updatedEmi)] : []),
          ...(account ? [accountRepo.save(account)] : []),
        ]).then(() => undefined),
      makeRollback(set, s, ["emis", "accounts"]),
    );
  },

  updateEmiPayment: (emiId, paymentId, patch) => {
    const s = get();
    const emi = s.emis.find((e) => e.id === emiId);
    const old = emi?.payments?.find((p) => p.id === paymentId);
    if (!old) return;
    const updated: EmiPayment = { ...old, ...patch };

    let accounts = s.accounts;
    if (old.accountId)
      accounts = applyBalance(accounts, old.accountId, old.amount);
    if (updated.accountId)
      accounts = applyBalance(accounts, updated.accountId, -updated.amount);

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

    const ids = [old.accountId, updated.accountId].filter((v): v is string =>
      Boolean(v),
    );
    const dirty = ids
      .filter((v, i) => ids.indexOf(v) === i)
      .map((id) => accounts.find((a) => a.id === id))
      .filter((a): a is Account => Boolean(a));
    sync(
      () =>
        Promise.all([
          emiRepo.savePayment(updated, emiId, ownerId()),
          ...dirty.map((a) => accountRepo.save(a)),
        ]).then(() => undefined),
      makeRollback(set, s, ["emis", "accounts"]),
    );
  },

  deleteEmiPayment: (emiId, paymentId) => {
    const s = get();
    const emi = s.emis.find((e) => e.id === emiId);
    const payment = emi?.payments?.find((p) => p.id === paymentId);
    if (!payment) return;
    const accounts = payment.accountId
      ? applyBalance(s.accounts, payment.accountId, payment.amount)
      : s.accounts;
    const emis = s.emis.map((e) =>
      e.id === emiId
        ? withPaidMonths(
            {
              ...e,
              payments: (e.payments ?? []).filter((p) => p.id !== paymentId),
            },
            (e.paidMonths ?? 0) - 1,
          )
        : e,
    );
    set({ emis, accounts });
    const updatedEmi = emis.find((e) => e.id === emiId);
    const account = payment.accountId
      ? accounts.find((a) => a.id === payment.accountId)
      : undefined;
    const uid = ownerId();
    sync(
      () =>
        Promise.all([
          emiRepo.removePayment(paymentId, uid),
          ...(updatedEmi ? [emiRepo.save(updatedEmi)] : []),
          ...(account ? [accountRepo.save(account)] : []),
        ]).then(() => undefined),
      makeRollback(set, s, ["emis", "accounts"]),
    );
  },
});
