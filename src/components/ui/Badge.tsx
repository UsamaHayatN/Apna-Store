import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "neutral" | "outline" | "success" | "warning" | "danger" | "sale";
}

export function Badge({
  className,
  variant = "neutral",
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    neutral: "bg-neutral-100 text-neutral-800 border-transparent",
    outline: "border-neutral-300 text-neutral-800 bg-transparent",
    success: "bg-emerald-50 text-emerald-800 border-emerald-200",
    warning: "bg-amber-50 text-amber-800 border-amber-200",
    danger: "bg-rose-50 text-rose-800 border-rose-200",
    sale: "bg-neutral-900 text-neutral-50 border-neutral-900",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider whitespace-nowrap",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
