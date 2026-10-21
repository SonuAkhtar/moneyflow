"use client";

import { m } from "framer-motion";
import { Landmark, TrendingUp } from "lucide-react";
import { AccountsList } from "@/sections/AccountsList/AccountsList";
import { EmiList } from "@/sections/EmiList/EmiList";
import { useFinanceStore } from "@/store/financeStore";
import {
  bankMonthFlow,
  currentMonthKey,
  emiKind,
  emiPaidAmount,
  formatCurrency,
  sumBy,
} from "@/utils";
import { staggerContainer, listItem } from "@/themes/animations";
import styles from "./page.module.scss";

export default function SavingsPage() {
  const accounts = useFinanceStore((s) => s.accounts);
  const emis = useFinanceStore((s) => s.emis);
  const transactions = useFinanceStore((s) => s.transactions);
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");

  const month = currentMonthKey();
  const banks = accounts.filter((a) => a.type === "savings");
  const banksTotal = sumBy(banks, (a) => a.balance);
  const banksThisMonth = sumBy(
    banks,
    (a) => bankMonthFlow(a.id, transactions, month).net,
  );
  const sips = emis.filter(
    (e) => e.status === "active" && emiKind(e) === "sip",
  );
  const sipMonthly = sumBy(sips, (e) => e.monthlyAmount);
  const sipTotal = sumBy(sips, emiPaidAmount);
  const totalSavings = banksTotal + sipTotal;

  return (
    <m.div
      className={styles.page}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <m.div variants={listItem}>
        <div className={styles.hero}>
          <div className={styles.hero_head}>
            <div className={styles.hero_headText}>
              <span className={styles.hero_label}>Total savings</span>
              <span className={styles.hero_total}>
                {formatCurrency(totalSavings, currency)}
              </span>
            </div>
            <span className={styles.hero_chip} aria-hidden />
          </div>

          {totalSavings > 0 && (
            <div className={styles.hero_split}>
              <span className={styles.hero_bar}>
                <span
                  className={styles.hero_barBanks}
                  style={{ flexGrow: Math.max(0, banksTotal) }}
                />
                <span
                  className={styles.hero_barSips}
                  style={{ flexGrow: Math.max(0, sipTotal) }}
                />
              </span>
            </div>
          )}

          <div className={styles.hero_grid}>
            <div className={styles.hero_cell}>
              <span className={styles.hero_cellHead}>
                <Landmark size={14} className={styles.hero_iconBanks} /> Banks
              </span>
              <span className={styles.hero_cellValue}>
                {formatCurrency(banksTotal, currency)}
              </span>
              <span
                className={`${styles.hero_cellSub} ${
                  banksThisMonth > 0
                    ? styles["hero_cellSub--up"]
                    : banksThisMonth < 0
                      ? styles["hero_cellSub--down"]
                      : ""
                }`}
              >
                {banksThisMonth > 0
                  ? `+${formatCurrency(banksThisMonth, currency)} this month`
                  : banksThisMonth < 0
                    ? `-${formatCurrency(Math.abs(banksThisMonth), currency)} this month`
                    : "No deposits yet"}
              </span>
            </div>
            <div className={styles.hero_cell}>
              <span className={styles.hero_cellHead}>
                <TrendingUp size={14} className={styles.hero_iconSips} /> SIPs
              </span>
              <span className={styles.hero_cellValue}>
                {formatCurrency(sipTotal, currency)}
              </span>
              <span className={styles.hero_cellSub}>
                {sipMonthly > 0
                  ? `${formatCurrency(sipMonthly, currency)}/mo`
                  : "No active SIPs"}
              </span>
            </div>
          </div>
        </div>
      </m.div>

      <m.div variants={listItem} className={styles.panel} data-tone="bank">
        <AccountsList />
      </m.div>

      <m.div variants={listItem} className={styles.panel} data-tone="sip">
        <EmiList kind="sip" />
      </m.div>
    </m.div>
  );
}
