"use client";

import { Moon, Sun } from "lucide-react";

import { useBlogTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { toggleTheme } = useBlogTheme();

  return (
    <Button
      type="button"
      variant="glass"
      size="icon"
      aria-label="Toggle theme"
      title="Toggle theme"
      onClick={toggleTheme}
    >
      <Moon className="size-4 dark:hidden" />
      <Sun className="hidden size-4 dark:block" />
    </Button>
  );
}
