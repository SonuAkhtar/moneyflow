"use client";

import { useFinanceStore } from "@/store/financeStore";
import type { Account } from "@/types";

export const useSpendAccounts = (preferredId?: string | null) => {
  const accounts = useFinanceStore((s) => s.accounts);

  const banks = accounts;

  const defaultBankId =
    (preferredId && banks.some((a) => a.id === preferredId) && preferredId) ||
    banks.find((a) => a.isPrimary)?.id ||
    banks[0]?.id ||
    "";

  const resolve = (id: string): Account | undefined =>
    accounts.find((a) => a.id === id);

  return { accounts, banks, defaultBankId, resolve };
};
