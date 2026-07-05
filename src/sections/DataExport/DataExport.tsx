"use client";

import { Download, FileJson, FileSpreadsheet } from "lucide-react";
import { Card } from "@/components/Card/Card";
import { SectionHeader } from "@/components/SectionHeader/SectionHeader";
import { useFinanceStore } from "@/store/financeStore";
import { useToast } from "@/hooks/useToast";
import { buildBackup, downloadFile, transactionsToCsv } from "@/utils/export";
import styles from "./DataExport.module.scss";

export const DataExport = () => {
  const toast = useToast();

  const stamp = () => new Date().toISOString().slice(0, 10);

  const exportCsv = () => {
    const { transactions, accounts } = useFinanceStore.getState();
    if (transactions.length === 0) {
      toast({ title: "Nothing to export yet", variant: "info" });
      return;
    }
    downloadFile(
      `moneyflow-transactions-${stamp()}.csv`,
      transactionsToCsv(transactions, accounts),
      "text/csv;charset=utf-8",
    );
    toast({ title: "Transactions exported", variant: "success" });
  };

  const exportJson = () => {
    const { profile, accounts, transactions, emis, borrowings } =
      useFinanceStore.getState();
    downloadFile(
      `moneyflow-backup-${stamp()}.json`,
      buildBackup(
        { profile, accounts, transactions, emis, borrowings },
        new Date().toISOString(),
      ),
      "application/json",
    );
    toast({ title: "Backup downloaded", variant: "success" });
  };

  return (
    <section>
      <SectionHeader title="Your data" caption="Export or back up anytime" />
      <Card surface="solid" className={styles.card}>
        <button type="button" className={styles.row} onClick={exportCsv}>
          <span className={styles.row_icon}>
            <FileSpreadsheet size={18} />
          </span>
          <span className={styles.row_text}>
            <span className={styles.row_title}>Export transactions</span>
            <span className={styles.row_sub}>Spreadsheet-ready CSV</span>
          </span>
          <Download size={16} className={styles.row_action} />
        </button>
        <button type="button" className={styles.row} onClick={exportJson}>
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
