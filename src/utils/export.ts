import { getCategoryMeta } from "@/constants/categories";
import type { Account, Borrowing, Emi, Profile, Transaction } from "@/types";

const csvCell = (value: string | number): string => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const transactionsToCsv = (
  transactions: Transaction[],
  accounts: Account[],
): string => {
  const accountName = (id: string) =>
    accounts.find((a) => a.id === id)?.name ?? "";
  const header = [
    "Date",
    "Type",
    "Category",
    "Amount",
    "Account",
    "Merchant",
    "Note",
  ];
  const rows = [...transactions]
    .sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt))
    .map((t) => [
      t.occurredAt.slice(0, 10),
      t.type,
      getCategoryMeta(t.category).label,
      t.amount,
      accountName(t.accountId),
      t.merchant ?? "",
      t.note ?? "",
    ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
};

export interface BackupSnapshot {
  profile: Profile | null;
  accounts: Account[];
  transactions: Transaction[];
  emis: Emi[];
  borrowings: Borrowing[];
}

export const buildBackup = (
  snapshot: BackupSnapshot,
  exportedAt: string,
): string => JSON.stringify({ version: 1, exportedAt, ...snapshot }, null, 2);

export const downloadFile = (
  filename: string,
  content: string,
  mime: string,
): void => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};
