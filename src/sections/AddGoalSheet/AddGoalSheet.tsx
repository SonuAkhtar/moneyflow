"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { Input } from "@/components/Input/Input";
import { Button } from "@/components/Button/Button";
import { ColorPicker } from "@/components/ColorPicker/ColorPicker";
import { useFinanceStore } from "@/store/financeStore";
import { useToast } from "@/hooks/useToast";
import { goalSchema, type GoalValues } from "@/utils/validation";
import { ACCOUNT_COLOR_TAGS } from "@/constants";
import styles from "./AddGoalSheet.module.scss";

interface AddGoalSheetProps {
  open: boolean;
  onClose: () => void;
}

export const AddGoalSheet = ({ open, onClose }: AddGoalSheetProps) => {
  const addGoal = useFinanceStore((s) => s.addGoal);
  const toast = useToast();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GoalValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      title: "",
      targetAmount: undefined,
      savedAmount: 0,
      deadline: "",
      colorTag: ACCOUNT_COLOR_TAGS[3],
    },
  });

  const colorTag = watch("colorTag");

  const submit = handleSubmit((values) => {
    addGoal({ ...values, deadline: values.deadline || undefined });
    toast({ title: "Goal created", description: values.title, variant: "success" });
    reset();
    onClose();
  });

  return (
    <BottomSheet open={open} onClose={onClose} title="New saving goal">
      <form className={styles.form} onSubmit={submit}>
        <Input
          label="Goal name"
          placeholder="e.g. New laptop"
          error={errors.title?.message}
          {...register("title")}
        />
        <Input
          label="Target amount"
          type="number"
          inputMode="decimal"
          error={errors.targetAmount?.message}
          {...register("targetAmount")}
        />
        <Input
          label="Already saved"
          type="number"
          inputMode="decimal"
          {...register("savedAmount")}
        />
        <Input label="Target date" type="date" {...register("deadline")} />

        <ColorPicker value={colorTag} onChange={(color) => setValue("colorTag", color)} />

        <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
          Create goal
        </Button>
      </form>
    </BottomSheet>
  );
};
