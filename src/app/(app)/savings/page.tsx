"use client";

import { motion } from "framer-motion";
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
  const sips = emis.filter((e) => e.status === "active" && emiKind(e) === "sip");
  const sipMonthly = sumBy(sips, (e) => e.monthlyAmount);
  const sipTotal = sumBy(sips, emiPaidAmount);
  const totalSavings = banksTotal + sipTotal;

  return (
    <motion.div
      className={styles.page}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={listItem}>
        <div className={styles.hero}>
          <div className={styles.hero_head}>
            <span className={styles.hero_label}>Total savings</span>
            <span className={styles.hero_total}>
              {formatCurrency(totalSavings, currency)}
            </span>
          </div>
          <div className={styles.hero_grid}>
            <div className={styles.hero_cell}>
              <span className={styles.hero_cellHead}>
                <Landmark size={15} /> Banks
              </span>
              <span className={styles.hero_cellValue}>
                {formatCurrency(banksTotal, currency)}
              </span>
              <span
                className={`${styles.hero_cellSub} ${
                  banksThisMonth > 0 ? styles["hero_cellSub--up"] : ""
                }`}
              >
                {banksThisMonth > 0
                  ? `+${formatCurrency(banksThisMonth, currency)} this month`
                  : "No deposits this month"}
              </span>
            </div>
            <div className={styles.hero_cell}>
              <span className={styles.hero_cellHead}>
                <TrendingUp size={15} /> SIPs
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
      </motion.div>

      <motion.div variants={listItem}>
        <AccountsList />
      </motion.div>

      <motion.div variants={listItem}>
        <EmiList kind="sip" />
      </motion.div>
    </motion.div>
  );
}
