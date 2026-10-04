import {
  accountRepo,
  borrowingRepo,
  budgetRepo,
  emiRepo,
  profileRepo,
  transactionRepo,
  type AccountMetaPatch,
  type BalanceAttempt,
} from "@/services/repositories";
import type {
  Account,
  Borrowing,
  BorrowingPayment,
  CategoryId,
  Emi,
  EmiPayment,
  Profile,
  Transaction,
} from "@/types";

export type ProfilePatch = Partial<Profile> & {
  majorAccountId?: string | null;
  dailyAccountId?: string | null;
};

export type Op =
  | { k: "account.insert"; account: Account }
  | { k: "account.meta"; id: string; patch: AccountMetaPatch }
  | { k: "account.remove"; id: string }
  | {
      k: "account.adjust";
      id: string;
      delta: number;
      attempt?: BalanceAttempt;
    }
  | { k: "txn.save"; txn: Transaction }
  | { k: "txn.remove"; id: string }
  | { k: "txn.removeByAccount"; accountId: string }
  | { k: "profile.update"; patch: ProfilePatch }
  | { k: "emi.save"; emi: Emi }
  | { k: "emi.remove"; id: string }
  | { k: "emi.savePayment"; emiId: string; payment: EmiPayment }
  | { k: "emi.removePayment"; id: string }
  | { k: "borrowing.save"; borrowing: Borrowing }
  | { k: "borrowing.remove"; id: string }
  | {
      k: "borrowing.savePayment";
      borrowingId: string;
      payment: BorrowingPayment;
    }
  | { k: "borrowing.removePayment"; id: string }
  | { k: "budgets.save"; budgets: Partial<Record<CategoryId, number>> };

export const runOp = async (
  uid: string,
  op: Op,
  persist: () => void = () => undefined,
): Promise<void> => {
  switch (op.k) {
    case "account.insert":
      return accountRepo.insert(op.account);
    case "account.meta":
      return accountRepo.updateMeta(op.id, uid, op.patch);
    case "account.remove":
      return accountRepo.remove(op.id, uid);
    case "account.adjust":
      await accountRepo.adjustBalance(op.id, uid, op.delta, {
        lastAttempt: op.attempt,
        onAttempt: (attempt) => {
          op.attempt = attempt;
          persist();
        },
      });
      return;
    case "txn.save":
      return transactionRepo.save(op.txn);
    case "txn.remove":
      return transactionRepo.remove(op.id, uid);
    case "txn.removeByAccount":
      return transactionRepo.removeByAccount(op.accountId, uid);
    case "profile.update":
      return profileRepo.update(uid, op.patch);
    case "emi.save":
      return emiRepo.save(op.emi);
    case "emi.remove":
      return emiRepo.remove(op.id, uid);
    case "emi.savePayment":
      return emiRepo.savePayment(op.payment, op.emiId, uid);
    case "emi.removePayment":
      return emiRepo.removePayment(op.id, uid);
    case "borrowing.save":
      return borrowingRepo.save(op.borrowing);
    case "borrowing.remove":
      return borrowingRepo.remove(op.id, uid);
    case "borrowing.savePayment":
      return borrowingRepo.savePayment(op.payment, op.borrowingId, uid);
    case "borrowing.removePayment":
      return borrowingRepo.removePayment(op.id, uid);
    case "budgets.save":
      return budgetRepo.save(op.budgets);
  }
};
