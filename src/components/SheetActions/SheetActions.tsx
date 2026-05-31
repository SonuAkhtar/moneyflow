"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/Button/Button";
import styles from "./SheetActions.module.scss";

interface SheetActionsProps {
  onSave: () => void;
  onDelete?: () => void;
  saveLabel?: string;
  disabled?: boolean;
}

// Shared "[delete icon] + [Save] " row used in the bottom-sheet editors.
// Pass onDelete to show the delete button (it should open a confirm dialog).
export const SheetActions = ({
  onSave,
  onDelete,
  saveLabel = "Save changes",
  disabled = false,
}: SheetActionsProps) => (
  <div className={styles.actions}>
    {onDelete && (
      <button
        type="button"
        className={styles.delete}
        onClick={onDelete}
        aria-label="Delete"
      >
        <Trash2 size={18} />
      </button>
    )}
    <Button size="lg" className={styles.save} onClick={onSave} disabled={disabled}>
      {saveLabel}
    </Button>
  </div>
);
