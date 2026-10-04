"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Card } from "@/components/Card/Card";
import { SectionHeader } from "@/components/SectionHeader/SectionHeader";
import { OtherAccountSheet } from "@/sections/OtherAccountSheet/OtherAccountSheet";
import { useFinanceStore } from "@/store/financeStore";
import { OTHER_ACCOUNT_KINDS } from "@/constants/accounts";
import { cn, formatCurrency, isCreditCard } from "@/utils";
import type { Account } from "@/types";
import styles from "./OtherAccountsList.module.scss";

export const OtherAccountsList = () => {
  const accounts = useFinanceStore((s) => s.accounts);
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  const items = useMemo(
    () =>
      accounts.filter((a) =>
        OTHER_ACCOUNT_KINDS.some((k) => k.type === a.type),
      ),
    [accounts],
  );
  const owed = items
    .filter(isCreditCard)
    .reduce((sum, a) => sum + Math.max(0, -a.balance), 0);

  return (
    <section>
      <SectionHeader
        title="Wallets & cards"
        caption={
          owed > 0
            ? `${formatCurrency(owed, currency)} owed on cards`
            : "Cash, UPI wallets and credit cards"
        }
      />
      <Card surface="solid" padded={false} className={styles.list}>
        {items.map((account) => {
          const kind = OTHER_ACCOUNT_KINDS.find(
            (k) => k.type === account.type,
          )!;
          const Icon = kind.icon;
          const card = isCreditCard(account);
          const due = Math.max(0, -account.balance);
          return (
            <button
              key={account.id}
              type="button"
              className={styles.row}
              onClick={() => setEditing(account)}
              aria-label={`Edit ${account.name}`}
            >
              <span
                className={styles.row_icon}
                style={{ background: `${kind.color}1f`, color: kind.color }}
              >
                <Icon size={16} />
              </span>
              <span className={styles.row_text}>
                <span className={styles.row_name}>{account.name}</span>
                <span className={styles.row_kind}>{kind.label}</span>
              </span>
              <span
                className={cn(
                  styles.row_amount,
                  (card ? due > 0 : account.balance < 0) &&
                    styles["row_amount--neg"],
                )}
              >
                {card
                  ? due > 0
                    ? `${formatCurrency(due, currency)} due`
                    : "No dues"
                  : formatCurrency(account.balance, currency)}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          className={styles.add}
          onClick={() => setAdding(true)}
        >
          <Plus size={16} />
          Add wallet, cash or card
        </button>
      </Card>
      <OtherAccountSheet
        open={adding || editing !== null}
        account={editing}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
      />
    </section>
  );
};
