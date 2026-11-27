import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-accent-200/70 bg-accent-50/90 px-2.5 py-0.5 text-xs font-semibold text-accent-700 dark:border-accent-400/25 dark:bg-accent-500/15 dark:text-accent-200",
        className,
      )}
      {...props}
    />
  );
}
