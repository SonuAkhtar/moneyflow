import {
  accountRepo,
  profileRepo,
  transactionRepo,
} from "@/services/repositories";
import { isoNow, SAVINGS_DEPOSIT_NOTE, SAVINGS_WITHDRAWAL_NOTE } from "@/utils";
import type { Account, Transaction } from "@/types";
import { applyBalance, newId } from "./helpers";
import type { FinanceState, SliceCreator } from "./types";

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

export const createAccountsSlice: SliceCreator<AccountsSlice> = (
  set,
  get,
  { ownerId, sync },
) => ({
  setMajorAccount: (id) => {
    set({ majorAccountId: id });
    const uid = ownerId();
    sync(() => profileRepo.update(uid, { majorAccountId: id }));
  },

  setDailyAccount: (id) => {
    set({ dailyAccountId: id });
    const uid = ownerId();
    sync(() => profileRepo.update(uid, { dailyAccountId: id }));
  },

  addAccount: (input) => {
    const s = get();
    const account: Account = {
      id: newId(),
      userId: ownerId(),
      name: input.name,
      type: input.type,
      balance: input.balance,
      institution: input.institution ?? null,
      colorTag: input.colorTag,
      isPrimary: input.isPrimary ?? s.accounts.length === 0,
      createdAt: isoNow(),
    };
    const demoted = input.isPrimary
      ? s.accounts.map((a) => ({ ...a, isPrimary: false }))
      : s.accounts;
    set({ accounts: [...demoted, account] });

    sync(async () => {
      await accountRepo.save(account);
      if (input.isPrimary) {
        for (const a of demoted) {
          const before = s.accounts.find((o) => o.id === a.id);
          if (before && before.isPrimary !== a.isPrimary)
            await accountRepo.save(a);
        }
      }
    });
  },

  updateAccount: (id, patch) => {
    const s = get();
    const accounts = s.accounts.map((a) =>
      a.id === id ? { ...a, ...patch } : a,
    );
    set({ accounts });
    const updated = accounts.find((a) => a.id === id);
    if (updated) sync(() => accountRepo.save(updated));
  },

  deleteAccount: (id) => {
    const s = get();
    const major = s.majorAccountId === id ? null : s.majorAccountId;
    const daily = s.dailyAccountId === id ? null : s.dailyAccountId;
    set({
      accounts: s.accounts.filter((a) => a.id !== id),
      majorAccountId: major,
      dailyAccountId: daily,
    });
    const uid = ownerId();
    sync(async () => {
      await accountRepo.remove(id);
      if (major !== s.majorAccountId || daily !== s.dailyAccountId) {
        await profileRepo.update(uid, {
          majorAccountId: major,
          dailyAccountId: daily,
        });
      }
    });
  },

  addSavingDeposit: (accountId, amount) => {
    const s = get();
    const account = s.accounts.find((a) => a.id === accountId);
    if (!account || amount <= 0) return;
    const txn: Transaction = {
      id: newId(),
      userId: ownerId(),
      accountId,
      type: "transfer",
      amount,
      category: "transfer",
      note: SAVINGS_DEPOSIT_NOTE,
      merchant: null,
      isBigExpense: false,
      occurredAt: isoNow(),
      createdAt: isoNow(),
    };
    const accounts = applyBalance(s.accounts, accountId, amount);
    set({ transactions: [txn, ...s.transactions], accounts });
    const updated = accounts.find((a) => a.id === accountId);
    sync(() =>
      Promise.all([
        transactionRepo.save(txn),
        ...(updated ? [accountRepo.save(updated)] : []),
      ]).then(() => undefined),
    );
  },

  addSavingWithdrawal: (accountId, amount) => {
    const s = get();
    const account = s.accounts.find((a) => a.id === accountId);
    if (!account || amount <= 0) return;
    const txn: Transaction = {
      id: newId(),
      userId: ownerId(),
      accountId,
      type: "transfer",
      amount,
      category: "transfer",
      note: SAVINGS_WITHDRAWAL_NOTE,
      merchant: null,
      isBigExpense: false,
      occurredAt: isoNow(),
      createdAt: isoNow(),
    };
    const accounts = applyBalance(s.accounts, accountId, -amount);
    set({ transactions: [txn, ...s.transactions], accounts });
    const updated = accounts.find((a) => a.id === accountId);
    sync(() =>
      Promise.all([
        transactionRepo.save(txn),
        ...(updated ? [accountRepo.save(updated)] : []),
      ]).then(() => undefined),
    );
  },
});
