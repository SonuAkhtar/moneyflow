"use client";

import { useMemo } from "react";
import { useFinanceStore } from "@/store/financeStore";

export interface BalancePoint {
  before: number;
  after: number;
}

const round = (n: number) => Math.round(n * 100) / 100;

export const useBalanceTrail = (): Map<string, BalancePoint> => {
  const accounts = useFinanceStore((s) => s.accounts);
  const transactions = useFinanceStore((s) => s.transactions);

  return useMemo(() => {
    const map = new Map<string, BalancePoint>();
    for (const account of accounts) {
      const txns = transactions
        .filter((t) => t.accountId === account.id)
        .sort((a, b) => {
          const d = +new Date(a.occurredAt) - +new Date(b.occurredAt);
          return d !== 0 ? d : +new Date(a.createdAt) - +new Date(b.createdAt);
        });
      const totalDelta = txns.reduce(
        (acc, t) => acc + (t.type === "income" ? t.amount : -t.amount),
        0,
      );
      let running = account.balance - totalDelta;
      for (const t of txns) {
        const before = running;
        running += t.type === "income" ? t.amount : -t.amount;
        map.set(t.id, { before: round(before), after: round(running) });
      }
    }
    return map;
  }, [accounts, transactions]);
};
