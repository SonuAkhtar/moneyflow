"use client";

import { forwardRef, type ComponentProps } from "react";
import { Input } from "@/components/Input/Input";

type NumberInputProps = Omit<ComponentProps<typeof Input>, "type">;

export const sanitizeNumber = (raw: string, decimal: boolean): string => {
  const cleaned = raw.replace(decimal ? /[^0-9.]/g : /[^0-9]/g, "");
  if (!decimal) return cleaned;
  const dot = cleaned.indexOf(".");
  return dot === -1
    ? cleaned
    : `${cleaned.slice(0, dot + 1)}${cleaned.slice(dot + 1).replace(/\./g, "")}`;
};

// Avoids type="number", which accepts "e" and changes value on wheel scroll.
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      inputMode = "decimal",
      onChange,
      min: _min,
      max: _max,
      step: _step,
      ...rest
    },
    ref,
  ) => (
    <Input
      ref={ref}
      type="text"
      inputMode={inputMode}
      autoComplete="off"
      onChange={(e) => {
        const next = sanitizeNumber(e.target.value, inputMode !== "numeric");
        if (next !== e.target.value) e.target.value = next;
        onChange?.(e);
      }}
      {...rest}
    />
  ),
);

NumberInput.displayName = "NumberInput";
