"use client";

import type { ReactNode } from "react";
import { cn } from "@/utils";
import styles from "./FormStack.module.scss";

export const FormStack = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => <div className={cn(styles.stack, className)}>{children}</div>;
