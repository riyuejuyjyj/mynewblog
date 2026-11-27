import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full text-sm font-semibold transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-accent-500 text-white shadow-md shadow-accent-500/25 hover:bg-accent-600 dark:bg-accent-500 dark:text-white dark:hover:bg-accent-400",
        glass:
          "border border-slate-200/80 bg-white/80 text-slate-800 shadow-sm backdrop-blur-md hover:border-accent-200 hover:bg-white hover:text-accent-700 dark:border-white/12 dark:bg-white/8 dark:text-slate-100 dark:hover:border-accent-400/40 dark:hover:bg-white/14",
        soft:
          "bg-accent-100 text-accent-700 hover:bg-accent-200/80 dark:bg-accent-500/18 dark:text-accent-200 dark:hover:bg-accent-500/28",
        ghost:
          "text-slate-600 hover:bg-accent-50 hover:text-accent-700 dark:text-slate-300 dark:hover:bg-white/8 dark:hover:text-white",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-9 px-3.5 text-xs",
        icon: "size-9 shrink-0",
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
