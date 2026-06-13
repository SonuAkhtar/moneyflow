"use client";

import { useMemo } from "react";
import { useFinanceStore } from "@/store/financeStore";
import { SAVINGS_DEPOSIT_NOTE } from "@/utils";

export interface BalancePoint {
  before: number;
  after: number;
}

const round = (n: number) => Math.round(n * 100) / 100;

interface TrailEvent {
  id: string | null;
  at: number;
  seq: number;
  delta: number;
}

export const useBalanceTrail = (): Map<string, BalancePoint> => {
  const accounts = useFinanceStore((s) => s.accounts);
  const transactions = useFinanceStore((s) => s.transactions);
  const emis = useFinanceStore((s) => s.emis);

  return useMemo(() => {
    const map = new Map<string, BalancePoint>();

    const emiEventsByAccount = new Map<string, TrailEvent[]>();
    for (const emi of emis) {
      for (const p of emi.payments ?? []) {
        if (!p.accountId) continue;
        const at = +new Date(p.paidOn);
        const list = emiEventsByAccount.get(p.accountId) ?? [];
        list.push({ id: null, at, seq: at, delta: -p.amount });
        emiEventsByAccount.set(p.accountId, list);
      }
    }

    for (const account of accounts) {
      const events: TrailEvent[] = transactions
        .filter((t) => t.accountId === account.id && t.category !== "salary")
        .map((t): TrailEvent => {
          const isInflow =
            t.type === "income" ||
            (t.type === "transfer" && t.note === SAVINGS_DEPOSIT_NOTE);
          return {
            id: t.id,
            at: +new Date(t.occurredAt),
            seq: +new Date(t.createdAt),
            delta: isInflow ? t.amount : -t.amount,
          };
        })
        .concat(emiEventsByAccount.get(account.id) ?? [])
        .sort((a, b) => (a.at !== b.at ? a.at - b.at : a.seq - b.seq));

      const totalDelta = events.reduce((acc, e) => acc + e.delta, 0);
      let running = account.balance - totalDelta;
      for (const e of events) {
        const before = running;
        running += e.delta;
        if (e.id)
          map.set(e.id, { before: round(before), after: round(running) });
      }
    }
    return map;
  }, [accounts, transactions, emis]);
};
