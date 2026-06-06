import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-white/45 bg-white/35 px-3 py-1 text-xs font-semibold tracking-[0] text-slate-700 shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-white/10 dark:text-slate-200",
        className,
      )}
      {...props}
    />
  );
}
