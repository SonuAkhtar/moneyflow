"use client";

import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { TransactionForm } from "@/sections/TransactionForm/TransactionForm";
import { useUiStore } from "@/store/uiStore";

export const QuickAddSheet = () => {
  const open = useUiStore((s) => s.quickAddOpen);
  const closeQuickAdd = useUiStore((s) => s.closeQuickAdd);

  return (
    <BottomSheet
      open={open}
      onClose={closeQuickAdd}
      title="Quick add"
      description="Log a transaction in seconds"
    >
      <TransactionForm onSuccess={closeQuickAdd} />
    </BottomSheet>
  );
};
