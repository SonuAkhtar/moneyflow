"use client";

import { startOfMonth, subMonths } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireBrowserSupabase } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
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

export const accountRepo = makeRepo<Account>(
  "accounts",
  accountToRow,
  rowToAccount,
);

export const transactionRepo = makeRepo<Transaction>(
  "transactions",
  transactionToRow,
  rowToTransaction,
  { column: "occurred_at", ascending: false },
);

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
}

export async function fetchSnapshot(userId: string): Promise<FinanceSnapshot> {
  const client = sb();
  const since = startOfMonth(
    subMonths(new Date(), INITIAL_HISTORY_MONTHS),
  ).toISOString();
  const [
    bundle,
    accounts,
    transactions,
    emiRows,
    emiPaymentRows,
    borrowingRows,
    borrowingPaymentRows,
  ] = await Promise.all([
    profileRepo.get(userId),
    accountRepo.list(userId),
    transactionRepo.list(userId, {
      since: { column: "occurred_at", value: since },
    }),
    client.from("emis").select("*").eq("user_id", userId),
    client.from("emi_payments").select("*").eq("user_id", userId),
    client.from("borrowings").select("*").eq("user_id", userId),
    client.from("borrowing_payments").select("*").eq("user_id", userId),
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
  };
}
