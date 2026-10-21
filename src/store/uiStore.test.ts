import { beforeEach, describe, expect, it } from "vitest";
import { useUiStore } from "@/store/uiStore";

beforeEach(() => useUiStore.setState({ toasts: [] }));

describe("uiStore.pushToast", () => {
  it("drops an identical plain toast", () => {
    const { pushToast } = useUiStore.getState();
    pushToast({ title: "Saved", variant: "success" });
    pushToast({ title: "Saved", variant: "success" });
    expect(useUiStore.getState().toasts).toHaveLength(1);
  });

  it("keeps each undo toast so every delete can be undone", () => {
    const { pushToast } = useUiStore.getState();
    const toast = {
      title: "Expense deleted",
      description: "₹250",
      variant: "info" as const,
    };
    pushToast({ ...toast, action: { label: "Undo", onClick: () => {} } });
    pushToast({ ...toast, action: { label: "Undo", onClick: () => {} } });
    expect(useUiStore.getState().toasts).toHaveLength(2);
  });
});
