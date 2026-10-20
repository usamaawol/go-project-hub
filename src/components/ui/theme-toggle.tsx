import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-foreground transition-all hover:bg-surface-2 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
    >
      {theme === "light" ? (
        <Moon className="h-4 w-4 text-stone-700 transition-transform duration-200 hover:rotate-12" />
      ) : (
        <Sun className="h-4 w-4 text-amber-400 transition-transform duration-200 hover:rotate-45" />
      )}
    </button>
  );
}
