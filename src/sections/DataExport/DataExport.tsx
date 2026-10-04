"use client";

import { useState } from "react";
import { Download, FileJson, FileSpreadsheet } from "lucide-react";
import { Card } from "@/components/Card/Card";
import { SectionHeader } from "@/components/SectionHeader/SectionHeader";
import { useFinanceStore } from "@/store/financeStore";
import { useToast } from "@/hooks/useToast";
import { fetchSnapshot } from "@/services/repositories";
import { currentDateKey } from "@/utils";
import { buildBackup, downloadFile, transactionsToCsv } from "@/utils/export";
import styles from "./DataExport.module.scss";

export const DataExport = () => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const loadAll = async () => {
    const state = useFinanceStore.getState();
    await state.flushSync();
    const uid = state.profile?.id;
    if (!uid) throw new Error("Your profile isn't loaded yet");
    const snap = await fetchSnapshot(uid, { fullHistory: true });
    return {
      profile: snap.profile ?? state.profile,
      accounts: snap.accounts,
      transactions: snap.transactions,
      emis: snap.emis,
      borrowings: snap.borrowings,
      budgets: snap.budgets ?? state.budgets,
    };
  };

  const run = async (work: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await work();
    } catch (err) {
      toast({
        title: "Export failed",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () =>
    run(async () => {
      const { transactions, accounts } = await loadAll();
      if (transactions.length === 0) {
        toast({ title: "Nothing to export yet", variant: "info" });
        return;
      }
      downloadFile(
        `moneyflow-transactions-${currentDateKey()}.csv`,
        transactionsToCsv(transactions, accounts),
        "text/csv;charset=utf-8",
      );
      toast({ title: "Transactions exported", variant: "success" });
    });

  const exportJson = () =>
    run(async () => {
      downloadFile(
        `moneyflow-backup-${currentDateKey()}.json`,
        buildBackup(await loadAll(), new Date().toISOString()),
        "application/json",
      );
      toast({ title: "Backup downloaded", variant: "success" });
    });

  return (
    <section>
      <SectionHeader title="Your data" caption="Export or back up anytime" />
      <Card surface="solid" className={styles.card}>
        <button
          type="button"
          className={styles.row}
          onClick={exportCsv}
          disabled={busy}
        >
          <span className={styles.row_icon}>
            <FileSpreadsheet size={18} />
          </span>
          <span className={styles.row_text}>
            <span className={styles.row_title}>Export transactions</span>
            <span className={styles.row_sub}>Spreadsheet-ready CSV</span>
          </span>
          <Download size={16} className={styles.row_action} />
        </button>
        <button
          type="button"
          className={styles.row}
          onClick={exportJson}
          disabled={busy}
        >
          <span className={styles.row_icon}>
            <FileJson size={18} />
          </span>
          <span className={styles.row_text}>
            <span className={styles.row_title}>Download full backup</span>
            <span className={styles.row_sub}>Everything, as JSON</span>
          </span>
          <Download size={16} className={styles.row_action} />
        </button>
      </Card>
    </section>
  );
};
