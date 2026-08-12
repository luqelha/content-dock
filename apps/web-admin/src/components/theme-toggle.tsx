"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    return <div className="h-8 w-17" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex items-center gap-2">
      <Sun className="h-3.5 w-3.5 text-muted-foreground" />
      <Switch
        checked={isDark}
        onCheckedChange={(checked: boolean) =>
          setTheme(checked ? "dark" : "light")
        }
        aria-label="Toggle dark mode"
        size="sm"
      />
      <Moon className="h-3.5 w-3.5 text-muted-foreground" />
    </div>
  );
}
