"use client";

import { forwardRef, type ComponentProps } from "react";
import { Input } from "@/components/Input/Input";

type NumberInputProps = Omit<ComponentProps<typeof Input>, "type">;

const MAX_WHOLE_DIGITS = 10;

export const sanitizeNumber = (raw: string, decimal: boolean): string => {
  const cleaned = raw.replace(decimal ? /[^0-9.]/g : /[^0-9]/g, "");
  const dot = decimal ? cleaned.indexOf(".") : -1;
  const whole = (dot === -1 ? cleaned : cleaned.slice(0, dot)).slice(
    0,
    MAX_WHOLE_DIGITS,
  );
  if (dot === -1) return whole;
  return `${whole}.${cleaned
    .slice(dot + 1)
    .replace(/\./g, "")
    .slice(0, 2)}`;
};

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
        const input = e.target;
        const decimal = inputMode !== "numeric";
        const next = sanitizeNumber(input.value, decimal);
        if (next !== input.value) {
          const caret = input.selectionStart ?? input.value.length;
          const pos = Math.min(
            next.length,
            sanitizeNumber(input.value.slice(0, caret), decimal).length,
          );
          input.value = next;
          input.setSelectionRange(pos, pos);
        }
        onChange?.(e);
      }}
      {...rest}
    />
  ),
);

NumberInput.displayName = "NumberInput";
