import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full text-sm font-semibold tracking-[0] transition duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-slate-950 text-white shadow-lg shadow-slate-950/20 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200",
        glass:
          "border border-white/45 bg-white/35 text-slate-900 shadow-lg shadow-slate-900/10 backdrop-blur-xl hover:bg-white/55 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/20",
        soft:
          "bg-coral-100 text-coral-950 hover:bg-coral-200 dark:bg-coral-400/15 dark:text-coral-100 dark:hover:bg-coral-400/25",
        ghost:
          "text-slate-700 hover:bg-white/40 dark:text-slate-200 dark:hover:bg-white/10",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-4 text-xs",
        icon: "size-11 shrink-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
