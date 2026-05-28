"use client";

import { motion } from "framer-motion";
import { PageIntro } from "@/components/PageIntro/PageIntro";
import { Card } from "@/components/Card/Card";
import { SectionHeader } from "@/components/SectionHeader/SectionHeader";
import { AiInsightsFeed } from "@/sections/AiInsightsFeed/AiInsightsFeed";
import { AiAssistant } from "@/sections/AiAssistant/AiAssistant";
import { staggerContainer, listItem } from "@/themes/animations";
import styles from "./page.module.scss";

export default function InsightsPage() {
  return (
    <motion.div
      className={styles.page}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={listItem}>
        <PageIntro title="AI Insights" subtitle="Smart analysis of your money" />
      </motion.div>

      <motion.div variants={listItem}>
        <AiInsightsFeed />
      </motion.div>

      <motion.div variants={listItem}>
        <SectionHeader title="Money assistant" caption="Ask anything" />
        <Card surface="solid">
          <AiAssistant />
        </Card>
      </motion.div>
    </motion.div>
  );
}
