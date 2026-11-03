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
  CategoryId,
  Emi,
  EmiPayment,
  Profile,
  SpendBudget,
  Transaction,
} from "@/types";

const sb = (): SupabaseClient =>
  requireBrowserSupabase() as unknown as SupabaseClient;

interface ApiError {
  message: string;
  code?: string;
}

const repoError = (context: string, error: ApiError | null) =>
  Object.assign(new Error(`${context}: ${error?.message ?? "unknown error"}`), {
    code: error?.code || "unknown",
  });

const fail = (context: string, error: ApiError | null): never => {
  throw repoError(context, error);
};

const PAGE_SIZE = 1000;

const fetchAll = async <R>(
  context: string,
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: R[] | null; error: ApiError | null }>,
): Promise<R[]> => {
  const rows: R[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) fail(context, error);
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < PAGE_SIZE) return rows;
  }
};

export const profileRepo = {
  async get(userId: string): Promise<ProfileBundle | null> {
    const { data, error } = await sb()
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) fail("profileRepo.get", error);
    return data ? rowToProfile(data) : null;
  },
  async update(
    userId: string,
    patch: Partial<Profile> & {
      majorAccountId?: string | null;
      dailyAccountId?: string | null;
    },
  ): Promise<void> {
    const row = profileToUpdate(patch);
    if (Object.keys(row).length === 0) return;
    const { error } = await sb().from("profiles").update(row).eq("id", userId);
    if (error) fail("profileRepo.update", error);
  },
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function makeRepo<T extends { id: string }>(
  table: string,
  toRow: (entity: T) => any,
  fromRow: (row: any) => T,
  orderBy: { column: string; ascending: boolean },
) {
  return {
    async list(
      userId: string,
      opts?: { since?: { column: string; value: string } },
    ): Promise<T[]> {
      const rows = await fetchAll<any>(`${table}.list`, (from, to) => {
        let query = sb().from(table).select("*").eq("user_id", userId);
        if (opts?.since) query = query.gte(opts.since.column, opts.since.value);
        return query
          .order(orderBy.column, { ascending: orderBy.ascending })
          .order("id")
          .range(from, to);
      });
      return rows.map(fromRow);
    },
    async save(entity: T): Promise<void> {
      const { error } = await sb().from(table).upsert(toRow(entity));
      if (error) fail(`${table}.save`, error);
    },
    async remove(id: string, userId: string): Promise<void> {
      const { error } = await sb()
        .from(table)
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) fail(`${table}.remove`, error);
    },
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const baseAccountRepo = makeRepo<Account>(
  "accounts",
  accountToRow,
  rowToAccount,
  { column: "created_at", ascending: true },
);

export type AccountMetaPatch = Partial<
  Pick<Account, "name" | "type" | "institution" | "colorTag" | "isPrimary">
>;

export const accountRepo = {
  list: baseAccountRepo.list,
  remove: baseAccountRepo.remove,
  async insert(account: Account): Promise<void> {
    const { error } = await sb()
      .from("accounts")
      .upsert(accountToRow(account), {
        onConflict: "id",
        ignoreDuplicates: true,
      });
    if (error) fail("accounts.insert", error);
  },
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
    if (error) fail("accounts.updateMeta", error);
  },
  async adjustBalance(
    id: string,
    delta: number,
    opId: string,
  ): Promise<number | null> {
    if (!delta) return null;
    const { data, error } = await sb().rpc("adjust_balance", {
      p_account_id: id,
      p_delta: delta,
      p_op_id: opId,
    });
    if (error) fail("accounts.adjustBalance", error);
    return data == null ? null : Number(data);
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
    const rows = await fetchAll<Parameters<typeof rowToTransaction>[0]>(
      "transactions.listRange",
      (from, to) =>
        sb()
          .from("transactions")
          .select("*")
          .eq("user_id", userId)
          .gte("occurred_at", fromIso)
          .lt("occurred_at", toIso)
          .order("occurred_at", { ascending: false })
          .order("id")
          .range(from, to),
    );
    return rows.map(rowToTransaction);
  },
  async removeByAccount(accountId: string, userId: string): Promise<void> {
    const { error } = await sb()
      .from("transactions")
      .delete()
      .eq("account_id", accountId)
      .eq("user_id", userId);
    if (error) fail("transactions.removeByAccount", error);
  },
};

export const emiRepo = {
  async save(emi: Emi): Promise<void> {
    const { error } = await sb().from("emis").upsert(emiToRow(emi));
    if (error) fail("emiRepo.save", error);
  },
  async remove(id: string, userId: string): Promise<void> {
    const { error } = await sb()
      .from("emis")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) fail("emiRepo.remove", error);
  },
  async savePayment(
    payment: EmiPayment,
    emiId: string,
    userId: string,
  ): Promise<void> {
    const { error } = await sb()
      .from("emi_payments")
      .upsert(emiPaymentToRow(payment, emiId, userId));
    if (error) fail("emiRepo.savePayment", error);
  },
  async removePayment(paymentId: string, userId: string): Promise<void> {
    const { error } = await sb()
      .from("emi_payments")
      .delete()
      .eq("id", paymentId)
      .eq("user_id", userId);
    if (error) fail("emiRepo.removePayment", error);
  },
};

export const borrowingRepo = {
  async save(borrowing: Borrowing): Promise<void> {
    const { error } = await sb()
      .from("borrowings")
      .upsert(borrowingToRow(borrowing));
    if (error) fail("borrowingRepo.save", error);
  },
  async remove(id: string, userId: string): Promise<void> {
    const { error } = await sb()
      .from("borrowings")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) fail("borrowingRepo.remove", error);
  },
  async savePayment(
    payment: BorrowingPayment,
    borrowingId: string,
    userId: string,
  ): Promise<void> {
    const { error } = await sb()
      .from("borrowing_payments")
      .upsert(borrowingPaymentToRow(payment, borrowingId, userId));
    if (error) fail("borrowingRepo.savePayment", error);
  },
  async removePayment(paymentId: string, userId: string): Promise<void> {
    const { error } = await sb()
      .from("borrowing_payments")
      .delete()
      .eq("id", paymentId)
      .eq("user_id", userId);
    if (error) fail("borrowingRepo.removePayment", error);
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
  spendBudget: SpendBudget | null;
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
  const all = (table: string) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetchAll<any>(`fetchSnapshot.${table}`, (from, to) =>
      client
        .from(table)
        .select("*")
        .eq("user_id", userId)
        .order("id")
        .range(from, to),
    );
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
    all("emis"),
    all("emi_payments"),
    all("borrowings"),
    all("borrowing_payments"),
    client.auth.getUser(),
  ]);
  if (authUser.error) fail("fetchSnapshot.user", authUser.error);

  const paymentsByEmi = new Map<string, EmiPayment[]>();
  for (const row of emiPaymentRows) {
    const list = paymentsByEmi.get(row.emi_id) ?? [];
    list.push(rowToEmiPayment(row));
    paymentsByEmi.set(row.emi_id, list);
  }
  const emis = emiRows.map((r) => rowToEmi(r, paymentsByEmi.get(r.id) ?? []));

  const paymentsByBorrowing = new Map<string, BorrowingPayment[]>();
  for (const row of borrowingPaymentRows) {
    const list = paymentsByBorrowing.get(row.borrowing_id) ?? [];
    list.push(rowToBorrowingPayment(row));
    paymentsByBorrowing.set(row.borrowing_id, list);
  }
  const borrowings = borrowingRows.map((r) =>
    rowToBorrowing(r, paymentsByBorrowing.get(r.id) ?? []),
  );

  return {
    profile: bundle?.profile ?? null,
    majorAccountId: bundle?.majorAccountId ?? null,
    dailyAccountId: bundle?.dailyAccountId ?? null,
    accounts,
    transactions,
    emis,
    borrowings,
    budgets: parseBudgets(authUser.data.user?.user_metadata?.budgets),
    spendBudget: parseSpendBudget(
      authUser.data.user?.user_metadata?.spend_budget,
    ),
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

const parseSpendBudget = (raw: unknown): SpendBudget | null => {
  if (!raw || typeof raw !== "object") return null;
  const { daily, major, dailySince } = raw as Record<string, unknown>;
  const amount = (v: unknown) =>
    Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0;
  const budget = {
    daily: amount(daily),
    major: amount(major),
    dailySince: typeof dailySince === "string" ? dailySince : null,
  };
  return budget.daily > 0 || budget.major > 0 ? budget : null;
};

export const avatarRepo = {
  async upload(userId: string, image: Blob): Promise<string> {
    const bucket = sb().storage.from("avatars");
    const path = `${userId}/${Date.now()}.jpg`;
    const { error } = await bucket.upload(path, image, {
      contentType: "image/jpeg",
      upsert: true,
    });
    if (error) fail("avatars.upload", error);
    const { data: listed, error: listError } = await bucket.list(userId);
    if (listError)
      logger.error("avatars.list", repoError("avatars.list", listError));
    const stale = (listed ?? [])
      .map((f) => `${userId}/${f.name}`)
      .filter((p) => p !== path);
    if (stale.length) {
      const { error: removeError } = await bucket.remove(stale);
      if (removeError)
        logger.error(
          "avatars.remove",
          repoError("avatars.remove", removeError),
        );
    }
    return bucket.getPublicUrl(path).data.publicUrl;
  },
};

export const budgetRepo = {
  async save(budgets: Partial<Record<CategoryId, number>>): Promise<void> {
    const { error } = await sb().auth.updateUser({ data: { budgets } });
    if (error) fail("budgets.save", error);
  },
  async saveSpend(budget: SpendBudget | null): Promise<void> {
    const { error } = await sb().auth.updateUser({
      data: { spend_budget: budget },
    });
    if (error) fail("spendBudget.save", error);
  },
};
