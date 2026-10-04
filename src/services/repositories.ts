"use client";

import { startOfMonth, subMonths } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireBrowserSupabase } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { runWithRetry } from "@/lib/retry";
import { INITIAL_HISTORY_MONTHS } from "@/constants";
import {
  accountToRow,
  borrowingPaymentToRow,
  borrowingToRow,
  emiPaymentToRow,
  emiToRow,
  profileToUpdate,
  rowToAccount,
  rowToBorrowing,
  rowToBorrowingPayment,
  rowToEmi,
  rowToEmiPayment,
  rowToProfile,
  rowToTransaction,
  transactionToRow,
  type ProfileBundle,
} from "@/lib/supabase/mappers";
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

const sb = (): SupabaseClient =>
  requireBrowserSupabase() as unknown as SupabaseClient;

const fail = (context: string, message?: string): never => {
  throw new Error(`${context}: ${message ?? "unknown error"}`);
};

export const profileRepo = {
  async get(userId: string): Promise<ProfileBundle | null> {
    const { data, error } = await sb()
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) fail("profileRepo.get", error.message);
    return data ? rowToProfile(data) : null;
  },
  async update(
    userId: string,
    patch: Partial<Profile> & {
      majorAccountId?: string | null;
      dailyAccountId?: string | null;
    },
  ): Promise<void> {
    const { error } = await sb()
      .from("profiles")
      .update(profileToUpdate(patch))
      .eq("id", userId);
    if (error) fail("profileRepo.update", error.message);
  },
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function makeRepo<T extends { id: string }>(
  table: string,
  toRow: (entity: T) => any,
  fromRow: (row: any) => T,
  orderBy?: { column: string; ascending: boolean },
) {
  return {
    async list(
      userId: string,
      opts?: { since?: { column: string; value: string } },
    ): Promise<T[]> {
      let query = sb().from(table).select("*").eq("user_id", userId);
      if (opts?.since) query = query.gte(opts.since.column, opts.since.value);
      if (orderBy)
        query = query.order(orderBy.column, { ascending: orderBy.ascending });
      const { data, error } = await query;
      if (error) fail(`${table}.list`, error.message);
      return ((data ?? []) as any[]).map(fromRow);
    },
    async save(entity: T): Promise<void> {
      const { error } = await sb().from(table).upsert(toRow(entity));
      if (error) fail(`${table}.save`, error.message);
    },
    async remove(id: string, userId: string): Promise<void> {
      const { error } = await sb()
        .from(table)
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) fail(`${table}.remove`, error.message);
    },
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const baseAccountRepo = makeRepo<Account>(
  "accounts",
  accountToRow,
  rowToAccount,
);

const MAX_BALANCE_ATTEMPTS = 5;

export interface BalanceAttempt {
  before: number;
  next: number;
}

export type AccountMetaPatch = Partial<
  Pick<Account, "name" | "type" | "institution" | "colorTag" | "isPrimary">
>;

export const accountRepo = {
  list: baseAccountRepo.list,
  remove: baseAccountRepo.remove,
  insert: baseAccountRepo.save,
  async updateMeta(
    id: string,
    userId: string,
    patch: AccountMetaPatch,
  ): Promise<void> {
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.type !== undefined) row.type = patch.type;
    if (patch.institution !== undefined) row.institution = patch.institution;
    if (patch.colorTag !== undefined) row.color_tag = patch.colorTag;
    if (patch.isPrimary !== undefined) row.is_primary = patch.isPrimary;
    if (Object.keys(row).length === 0) return;
    const { error } = await sb()
      .from("accounts")
      .update(row)
      .eq("id", id)
      .eq("user_id", userId);
    if (error) fail("accounts.updateMeta", error.message);
  },
  async adjustBalance(
    id: string,
    userId: string,
    delta: number,
    opts: {
      lastAttempt?: BalanceAttempt;
      onAttempt?: (attempt: BalanceAttempt) => void;
    } = {},
  ): Promise<number | null> {
    if (!delta) return null;
    const read = () =>
      runWithRetry(async () => {
        const { data, error } = await sb()
          .from("accounts")
          .select("balance")
          .eq("id", id)
          .eq("user_id", userId)
          .maybeSingle();
        if (error) fail("accounts.adjustBalance", error.message);
        return data as { balance: number | string } | null;
      });
    for (let attempt = 0; attempt < MAX_BALANCE_ATTEMPTS; attempt += 1) {
      const current = await read();
      if (!current) return null;
      const balance = Number(current.balance);
      if (attempt === 0 && opts.lastAttempt) {
        if (balance === opts.lastAttempt.next) return balance;
      }
      const next = Math.round((balance + delta) * 100) / 100;
      opts.onAttempt?.({ before: balance, next });
      const { data, error } = await sb()
        .from("accounts")
        .update({ balance: next })
        .eq("id", id)
        .eq("user_id", userId)
        .eq("balance", current.balance)
        .select("id");
      if (error) fail("accounts.adjustBalance", error.message);
      if (data && data.length > 0) return next;
    }
    return fail(
      "accounts.adjustBalance",
      "balance changed concurrently, please refresh",
    );
  },
};

const baseTransactionRepo = makeRepo<Transaction>(
  "transactions",
  transactionToRow,
  rowToTransaction,
  { column: "occurred_at", ascending: false },
);

export const transactionRepo = {
  ...baseTransactionRepo,
  async listRange(
    userId: string,
    fromIso: string,
    toIso: string,
  ): Promise<Transaction[]> {
    const { data, error } = await sb()
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .gte("occurred_at", fromIso)
      .lt("occurred_at", toIso)
      .order("occurred_at", { ascending: false });
    if (error) fail("transactions.listRange", error.message);
    return ((data ?? []) as Parameters<typeof rowToTransaction>[0][]).map(
      rowToTransaction,
    );
  },
  async removeByAccount(accountId: string, userId: string): Promise<void> {
    const { error } = await sb()
      .from("transactions")
      .delete()
      .eq("account_id", accountId)
      .eq("user_id", userId);
    if (error) fail("transactions.removeByAccount", error.message);
  },
};

export const emiRepo = {
  async save(emi: Emi): Promise<void> {
    const { error } = await sb().from("emis").upsert(emiToRow(emi));
    if (error) fail("emiRepo.save", error.message);
  },
  async remove(id: string, userId: string): Promise<void> {
    const { error } = await sb()
      .from("emis")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) fail("emiRepo.remove", error.message);
  },
  async savePayment(
    payment: EmiPayment,
    emiId: string,
    userId: string,
  ): Promise<void> {
    const { error } = await sb()
      .from("emi_payments")
      .upsert(emiPaymentToRow(payment, emiId, userId));
    if (error) fail("emiRepo.savePayment", error.message);
  },
  async removePayment(paymentId: string, userId: string): Promise<void> {
    const { error } = await sb()
      .from("emi_payments")
      .delete()
      .eq("id", paymentId)
      .eq("user_id", userId);
    if (error) fail("emiRepo.removePayment", error.message);
  },
};

export const borrowingRepo = {
  async save(borrowing: Borrowing): Promise<void> {
    const { error } = await sb()
      .from("borrowings")
      .upsert(borrowingToRow(borrowing));
    if (error) fail("borrowingRepo.save", error.message);
  },
  async remove(id: string, userId: string): Promise<void> {
    const { error } = await sb()
      .from("borrowings")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) fail("borrowingRepo.remove", error.message);
  },
  async savePayment(
    payment: BorrowingPayment,
    borrowingId: string,
    userId: string,
  ): Promise<void> {
    const { error } = await sb()
      .from("borrowing_payments")
      .upsert(borrowingPaymentToRow(payment, borrowingId, userId));
    if (error) fail("borrowingRepo.savePayment", error.message);
  },
  async removePayment(paymentId: string, userId: string): Promise<void> {
    const { error } = await sb()
      .from("borrowing_payments")
      .delete()
      .eq("id", paymentId)
      .eq("user_id", userId);
    if (error) fail("borrowingRepo.removePayment", error.message);
  },
};

export interface FinanceSnapshot {
  profile: Profile | null;
  majorAccountId: string | null;
  dailyAccountId: string | null;
  accounts: Account[];
  transactions: Transaction[];
  emis: Emi[];
  borrowings: Borrowing[];
  budgets: Partial<Record<CategoryId, number>> | null;
  authEmail: string | null;
  historyFrom: string | null;
}

export async function fetchSnapshot(
  userId: string,
  opts: { fullHistory?: boolean } = {},
): Promise<FinanceSnapshot> {
  const client = sb();
  const since = opts.fullHistory
    ? null
    : startOfMonth(subMonths(new Date(), INITIAL_HISTORY_MONTHS)).toISOString();
  const [
    bundle,
    accounts,
    transactions,
    emiRows,
    emiPaymentRows,
    borrowingRows,
    borrowingPaymentRows,
    authUser,
  ] = await Promise.all([
    profileRepo.get(userId),
    accountRepo.list(userId),
    transactionRepo.list(
      userId,
      since ? { since: { column: "occurred_at", value: since } } : undefined,
    ),
    client.from("emis").select("*").eq("user_id", userId),
    client.from("emi_payments").select("*").eq("user_id", userId),
    client.from("borrowings").select("*").eq("user_id", userId),
    client.from("borrowing_payments").select("*").eq("user_id", userId),
    client.auth.getUser(),
  ]);

  if (emiRows.error) fail("fetchSnapshot.emis", emiRows.error.message);
  if (emiPaymentRows.error)
    fail("fetchSnapshot.emi_payments", emiPaymentRows.error.message);

  const paymentsByEmi = new Map<string, EmiPayment[]>();
  for (const row of emiPaymentRows.data ?? []) {
    const list = paymentsByEmi.get(row.emi_id) ?? [];
    list.push(rowToEmiPayment(row));
    paymentsByEmi.set(row.emi_id, list);
  }
  const emis = (emiRows.data ?? []).map((r) =>
    rowToEmi(r, paymentsByEmi.get(r.id) ?? []),
  );

  let borrowings: Borrowing[] = [];
  if (borrowingRows.error)
    logger.error("fetchSnapshot.borrowings", borrowingRows.error.message);
  if (borrowingPaymentRows.error)
    logger.error(
      "fetchSnapshot.borrowing_payments",
      borrowingPaymentRows.error.message,
    );
  if (!borrowingRows.error && !borrowingPaymentRows.error) {
    const paymentsByBorrowing = new Map<string, BorrowingPayment[]>();
    for (const row of borrowingPaymentRows.data ?? []) {
      const list = paymentsByBorrowing.get(row.borrowing_id) ?? [];
      list.push(rowToBorrowingPayment(row));
      paymentsByBorrowing.set(row.borrowing_id, list);
    }
    borrowings = (borrowingRows.data ?? []).map((r) =>
      rowToBorrowing(r, paymentsByBorrowing.get(r.id) ?? []),
    );
  }

  return {
    profile: bundle?.profile ?? null,
    majorAccountId: bundle?.majorAccountId ?? null,
    dailyAccountId: bundle?.dailyAccountId ?? null,
    accounts,
    transactions,
    emis,
    borrowings,
    budgets: parseBudgets(authUser.data.user?.user_metadata?.budgets),
    authEmail: authUser.data.user?.email ?? null,
    historyFrom: since,
  };
}

const parseBudgets = (
  raw: unknown,
): Partial<Record<CategoryId, number>> | null => {
  if (!raw || typeof raw !== "object") return null;
  const out: Partial<Record<CategoryId, number>> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const amount = Number(value);
    if (Number.isFinite(amount) && amount > 0) out[key as CategoryId] = amount;
  }
  return out;
};

export const avatarRepo = {
  async upload(userId: string, image: Blob): Promise<string> {
    const bucket = sb().storage.from("avatars");
    const path = `${userId}/${Date.now()}.jpg`;
    const { error } = await bucket.upload(path, image, {
      contentType: "image/jpeg",
      upsert: true,
    });
    if (error) fail("avatars.upload", error.message);
    const { data: listed } = await bucket.list(userId);
    const stale = (listed ?? [])
      .map((f) => `${userId}/${f.name}`)
      .filter((p) => p !== path);
    if (stale.length) await bucket.remove(stale);
    return bucket.getPublicUrl(path).data.publicUrl;
  },
};

export const budgetRepo = {
  async save(budgets: Partial<Record<CategoryId, number>>): Promise<void> {
    const { error } = await sb().auth.updateUser({ data: { budgets } });
    if (error) fail("budgets.save", error.message);
  },
};
