import { isoNow, SAVINGS_DEPOSIT_NOTE, SAVINGS_WITHDRAWAL_NOTE } from "@/utils";
import type { Account, Emi, EmiPayment, Transaction } from "@/types";
import { applyBalance, newId } from "./helpers";
import { balanceSteps, step } from "./steps";
import type { FinanceState, SliceCreator, SyncStep } from "./types";

type AccountsSlice = Pick<
  FinanceState,
  | "setMajorAccount"
  | "setDailyAccount"
  | "addAccount"
  | "updateAccount"
  | "deleteAccount"
  | "addSavingDeposit"
  | "addSavingWithdrawal"
>;

const META_KEYS = [
  "name",
  "type",
  "institution",
  "colorTag",
  "isPrimary",
] as const;

const pickMeta = (a: Partial<Account>) => {
  const out: Partial<Pick<Account, (typeof META_KEYS)[number]>> = {};
  for (const k of META_KEYS)
    if (a[k] !== undefined) Object.assign(out, { [k]: a[k] });
  return out;
};

export const createAccountsSlice: SliceCreator<AccountsSlice> = (
  set,
  get,
  { ownerId, sync },
) => {
  const savingTransfer = (
    accountId: string,
    amount: number,
    note: typeof SAVINGS_DEPOSIT_NOTE | typeof SAVINGS_WITHDRAWAL_NOTE,
  ) => {
    const s = get();
    const account = s.accounts.find((a) => a.id === accountId);
    if (!account || amount <= 0) return;
    const uid = ownerId();
    const txn: Transaction = {
      id: newId(),
      userId: uid,
      accountId,
      type: "transfer",
      amount,
      category: "transfer",
      note,
      merchant: null,
      isBigExpense: false,
      occurredAt: isoNow(),
      createdAt: isoNow(),
    };
    const delta = note === SAVINGS_DEPOSIT_NOTE ? amount : -amount;
    set({
      transactions: [txn, ...s.transactions],
      accounts: applyBalance(s.accounts, accountId, delta),
    });
    sync([step.saveTransaction(txn), ...balanceSteps([[accountId, delta]])]);
  };

  const setLinkedAccount = (
    key: "majorAccountId" | "dailyAccountId",
    id: string,
  ) => {
    const s = get();
    ownerId();
    const previous = s[key];
    set({ [key]: id } as Partial<FinanceState>);
    sync([step.updateProfile({ [key]: id }, { [key]: previous })]);
  };

  return {
    setMajorAccount: (id) => setLinkedAccount("majorAccountId", id),
    setDailyAccount: (id) => setLinkedAccount("dailyAccountId", id),

    addAccount: (input) => {
      const s = get();
      const uid = ownerId();
      const isPrimary = input.isPrimary ?? s.accounts.length === 0;
      const account: Account = {
        id: newId(),
        userId: uid,
        name: input.name,
        type: input.type,
        balance: input.balance,
        institution: input.institution ?? null,
        colorTag: input.colorTag,
        isPrimary,
        createdAt: isoNow(),
      };
      const demote = isPrimary ? s.accounts.filter((a) => a.isPrimary) : [];
      set({
        accounts: [
          ...s.accounts.map((a) =>
            isPrimary ? { ...a, isPrimary: false } : a,
          ),
          account,
        ],
      });
      sync([
        step.insertAccount(account),
        ...demote.map((a) =>
          step.updateAccountMeta(
            a.id,
            { isPrimary: false },
            { isPrimary: true },
          ),
        ),
      ]);
    },

    updateAccount: (id, patch) => {
      const s = get();
      const current = s.accounts.find((a) => a.id === id);
      if (!current) return;
      ownerId();
      const delta =
        patch.balance !== undefined
          ? Math.round((patch.balance - current.balance) * 100) / 100
          : 0;
      const meta = pickMeta(patch);
      const previousMeta = pickMeta(
        Object.fromEntries(
          Object.keys(meta).map((k) => [k, current[k as keyof Account]]),
        ),
      );
      const demote = meta.isPrimary
        ? s.accounts.filter((a) => a.id !== id && a.isPrimary)
        : [];
      set({
        accounts: s.accounts.map((a) => {
          if (a.id === id)
            return {
              ...a,
              ...meta,
              balance: Math.round((a.balance + delta) * 100) / 100,
            };
          return meta.isPrimary ? { ...a, isPrimary: false } : a;
        }),
      });
      const steps: SyncStep[] = [];
      if (Object.keys(meta).length > 0)
        steps.push(step.updateAccountMeta(id, meta, previousMeta));
      for (const a of demote)
        steps.push(
          step.updateAccountMeta(
            a.id,
            { isPrimary: false },
            { isPrimary: true },
          ),
        );
      steps.push(...balanceSteps([[id, delta]]));
      sync(steps);
    },

    deleteAccount: (id) => {
      const s = get();
      const account = s.accounts.find((a) => a.id === id);
      if (!account) return;
      ownerId();
      const major = s.majorAccountId === id ? null : s.majorAccountId;
      const daily = s.dailyAccountId === id ? null : s.dailyAccountId;
      const removedTxns = s.transactions.filter((t) => t.accountId === id);

      const detachedPayments: {
        payment: EmiPayment;
        previous: EmiPayment;
        emiId: string;
      }[] = [];
      const detachedEmis: { emi: Emi; previous: Emi }[] = [];
      const emis = s.emis.map((e) => {
        const touchesPayments = (e.payments ?? []).some(
          (p) => p.accountId === id,
        );
        if (!touchesPayments && e.accountId !== id) return e;
        const payments = (e.payments ?? []).map((p) => {
          if (p.accountId !== id) return p;
          const detached: EmiPayment = { ...p, accountId: null };
          detachedPayments.push({
            payment: detached,
            previous: p,
            emiId: e.id,
          });
          return detached;
        });
        const next: Emi = {
          ...e,
          accountId: e.accountId === id ? null : e.accountId,
          payments,
        };
        if (e.accountId === id) detachedEmis.push({ emi: next, previous: e });
        return next;
      });

      set({
        accounts: s.accounts.filter((a) => a.id !== id),
        transactions: s.transactions.filter((t) => t.accountId !== id),
        emis,
        majorAccountId: major,
        dailyAccountId: daily,
      });

      const steps: SyncStep[] = [
        step.removeAccountTransactions(id, removedTxns),
        ...detachedPayments.map(({ payment, previous, emiId }) =>
          step.saveEmiPayment(emiId, payment, previous),
        ),
        ...detachedEmis.map(({ emi, previous }) => step.saveEmi(emi, previous)),
      ];
      if (major !== s.majorAccountId || daily !== s.dailyAccountId) {
        steps.push(
          step.updateProfile(
            { majorAccountId: major, dailyAccountId: daily },
            {
              majorAccountId: s.majorAccountId,
              dailyAccountId: s.dailyAccountId,
            },
          ),
        );
      }
      steps.push(step.removeAccount(account));
      sync(steps);
    },

    addSavingDeposit: (accountId, amount) =>
      savingTransfer(accountId, amount, SAVINGS_DEPOSIT_NOTE),
    addSavingWithdrawal: (accountId, amount) =>
      savingTransfer(accountId, amount, SAVINGS_WITHDRAWAL_NOTE),
  };
};
