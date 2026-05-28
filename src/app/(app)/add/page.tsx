"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PageIntro } from "@/components/PageIntro/PageIntro";
import { Card } from "@/components/Card/Card";
import { TransactionForm } from "@/sections/TransactionForm/TransactionForm";
import { fadeInUp } from "@/themes/animations";
import { ROUTES } from "@/constants";

export default function AddPage() {
  const router = useRouter();

  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="visible">
      <PageIntro title="Add transaction" subtitle="Log income or an expense" />
      <Card surface="solid">
        <TransactionForm onSuccess={() => router.push(ROUTES.home)} />
      </Card>
    </motion.div>
  );
}
