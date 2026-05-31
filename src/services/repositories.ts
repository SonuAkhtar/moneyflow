"use client";

// Reusable Supabase data layer. Every method is user-scoped and relies on RLS
// (user_id = auth.uid()) so a user can only ever read/write their own rows.
// Mutations use upsert(by id) so the store can generate a uuid, update locally
// (optimistic), then persist the same row.

import type { SupabaseClient } from "@supabase/supabase-js";
import { requireBrowserSupabase } from "@/lib/supabase/client";
import {
  accountToRow,
  budgetToRow,
  emiPaymentToRow,
  emiToRow,
  profileToUpdate,
  rowToAccount,
  rowToBudget,
  rowToEmi,
  rowToEmiPayment,
  rowToProfile,
  rowToTransaction,
  transactionToRow,
  type ProfileBundle,
} from "@/lib/supabase/mappers";
import type {
  Account,
  Budget,
  Emi,
  EmiPayment,
  Profile,
  Transaction,
} from "@/types";

// Query-building against a hand-written Database type fights the supabase-js
// generics; the mappers are where row shapes are enforced, so use an untyped
// client for the fluent calls and keep all typing at the mapper boundary.
const sb = (): SupabaseClient => requireBrowserSupabase() as unknown as SupabaseClient;

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

// Generic list/save/remove repo shared by the symmetrical entity tables.
/* eslint-disable @typescript-eslint/no-explicit-any */
function makeRepo<T extends { id: string }>(
  table: string,
  toRow: (entity: T) => any,
  fromRow: (row: any) => T,
  orderBy?: { column: string; ascending: boolean },
) {
  return {
    async list(userId: string): Promise<T[]> {
      let query = sb().from(table).select("*").eq("user_id", userId);
      if (orderBy) query = query.order(orderBy.column, { ascending: orderBy.ascending });
      const { data, error } = await query;
      if (error) fail(`${table}.list`, error.message);
      return ((data ?? []) as any[]).map(fromRow);
    },
    async save(entity: T): Promise<void> {
      const { error } = await sb().from(table).upsert(toRow(entity));
      if (error) fail(`${table}.save`, error.message);
    },
    async remove(id: string): Promise<void> {
      const { error } = await sb().from(table).delete().eq("id", id);
      if (error) fail(`${table}.remove`, error.message);
    },
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export const accountRepo = makeRepo<Account>("accounts", accountToRow, rowToAccount);

export const transactionRepo = makeRepo<Transaction>(
  "transactions",
  transactionToRow,
  rowToTransaction,
  { column: "occurred_at", ascending: false },
);

export const budgetRepo = makeRepo<Budget>("budgets", budgetToRow, rowToBudget);

export const emiRepo = {
  async save(emi: Emi): Promise<void> {
    const { error } = await sb().from("emis").upsert(emiToRow(emi));
    if (error) fail("emiRepo.save", error.message);
  },
  async remove(id: string): Promise<void> {
    const { error } = await sb().from("emis").delete().eq("id", id);
    if (error) fail("emiRepo.remove", error.message);
  },
  async savePayment(payment: EmiPayment, emiId: string, userId: string): Promise<void> {
    const { error } = await sb()
      .from("emi_payments")
      .upsert(emiPaymentToRow(payment, emiId, userId));
    if (error) fail("emiRepo.savePayment", error.message);
  },
  async removePayment(paymentId: string): Promise<void> {
    const { error } = await sb().from("emi_payments").delete().eq("id", paymentId);
    if (error) fail("emiRepo.removePayment", error.message);
  },
};

export interface FinanceSnapshot {
  profile: Profile | null;
  majorAccountId: string | null;
  dailyAccountId: string | null;
  accounts: Account[];
  transactions: Transaction[];
  emis: Emi[];
  budgets: Budget[];
}

export async function fetchSnapshot(userId: string): Promise<FinanceSnapshot> {
  const client = sb();
  const [bundle, accounts, transactions, emiRows, emiPaymentRows, budgets] =
    await Promise.all([
      profileRepo.get(userId),
      accountRepo.list(userId),
      transactionRepo.list(userId),
      client.from("emis").select("*").eq("user_id", userId),
      client.from("emi_payments").select("*").eq("user_id", userId),
      budgetRepo.list(userId),
    ]);

  if (emiRows.error) fail("fetchSnapshot.emis", emiRows.error.message);
  if (emiPaymentRows.error) fail("fetchSnapshot.emi_payments", emiPaymentRows.error.message);

  // Group payments by emi and nest them onto each EMI.
  const paymentsByEmi = new Map<string, EmiPayment[]>();
  for (const row of emiPaymentRows.data ?? []) {
    const list = paymentsByEmi.get(row.emi_id) ?? [];
    list.push(rowToEmiPayment(row));
    paymentsByEmi.set(row.emi_id, list);
  }
  const emis = (emiRows.data ?? []).map((r) =>
    rowToEmi(r, paymentsByEmi.get(r.id) ?? []),
  );

  return {
    profile: bundle?.profile ?? null,
    majorAccountId: bundle?.majorAccountId ?? null,
    dailyAccountId: bundle?.dailyAccountId ?? null,
    accounts,
    transactions,
    emis,
    budgets,
  };
}
