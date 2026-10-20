import { useEffect, useState } from "react";
import { Menu, X, User as UserIcon, LogOut, FileText, LayoutTemplate, Shield } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";
import { AuthModal } from "./AuthModal";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navLinks = [
  { href: "/#tools", label: "Tools" },
  { href: "/#templates", label: "Templates" },
  { href: "/#how", label: "How It Works" },
  { href: "/#students", label: "For Students" },
  { href: "/#business", label: "For Business" },
  { href: "/#pricing", label: "Free Access" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const { user, logout } = useAuth();

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on);
    return () => window.removeEventListener("scroll", on);
  }, []);

  const handleOpenAuth = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthOpen(true);
    setOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Signed Out", {
        description: "You have been signed out of DocuMind.",
      });
      setOpen(false);
    } catch (err) {
      console.error("Logout error:", err);
      toast.error("Sign out failed.");
    }
  };

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      const parts = name.trim().split(" ");
      if (parts.length >= 2 && parts[0] && parts[1]) {
        return (parts[0][0]! + parts[1][0]!).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return "DM";
  };

  return (
    <>
      <header
        className={`sticky top-0 z-50 border-b transition-all duration-200 ${
          scrolled || open
            ? "border-border bg-background/95 backdrop-blur-md shadow-xs"
            : "border-border/60 bg-background/80 backdrop-blur-xs"
        }`}
      >
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link
            to="/"
            aria-label="DocuMind Home"
            className="transition-opacity hover:opacity-90 flex items-center"
          >
            <Logo />
          </Link>

          {/* Desktop Navigation Links */}
          <ul className="hidden items-center gap-1 lg:flex">
            {navLinks.map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-foreground/80 transition-colors hover:text-primary hover:bg-surface-2/60"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          {/* Right Action CTAs */}
          <div className="hidden items-center gap-2.5 sm:flex">
            <ThemeToggle />

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full border border-border bg-card p-1 pr-3 text-xs font-semibold text-foreground hover:border-primary/40 hover:bg-surface-2 transition-all shadow-xs">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || "User"}
                        className="h-7 w-7 rounded-full object-cover border border-border"
                      />
                    ) : (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary font-mono text-[11px] font-bold">
                        {getInitials(user.displayName, user.email)}
                      </span>
                    )}
                    <span className="max-w-[120px] truncate font-medium">
                      {user.displayName || user.email?.split("@")[0] || "Account"}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-1.5">
                  <DropdownMenuLabel className="p-2 font-normal">
                    <p className="text-xs font-bold text-foreground truncate">
                      {user.displayName || "DocuMind Creator"}
                    </p>
                    <p className="text-[11px] font-mono text-muted-foreground truncate">
                      {user.email}
                    </p>
                    <span className="mt-1.5 inline-block rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      100% Free Access Active
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/account" className="flex items-center gap-2 cursor-pointer text-xs">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                      <span>Account & Saved Files</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a
                      href="/#workspace"
                      className="flex items-center gap-2 cursor-pointer text-xs"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>Open Workspace</span>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a
                      href="/#templates"
                      className="flex items-center gap-2 cursor-pointer text-xs"
                    >
                      <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
                      <span>110+ Free Templates</span>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      to="/admin"
                      className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground"
                    >
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span>Admin Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-destructive cursor-pointer text-xs focus:text-destructive focus:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenAuth("signin")}
                  className="text-sm font-medium text-foreground/90 hover:text-foreground hover:bg-surface-2"
                >
                  Sign In
                </Button>
                <Button
                  variant="hero"
                  size="sm"
                  onClick={() => handleOpenAuth("signup")}
                  className="text-sm font-medium px-4"
                >
                  Start for Free
                </Button>
              </>
            )}
          </div>

          {/* Mobile controls */}
          <div className="flex items-center gap-2 sm:hidden">
            <ThemeToggle />
            <button
              className="rounded-lg p-2 text-foreground/80 hover:bg-surface-2 border border-border/60"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>

        {/* Mobile Dropdown */}
        {open && (
          <div className="border-t border-border bg-card px-5 pb-6 pt-3 sm:hidden animate-in fade-in slide-in-from-top-1 shadow-lg">
            {user && (
              <div className="mb-3 flex items-center justify-between rounded-xl border border-border bg-surface-2 p-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-mono text-xs font-bold">
                    {getInitials(user.displayName, user.email)}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-foreground truncate max-w-[150px]">
                      {user.displayName || "Creator"}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                      {user.email}
                    </p>
                  </div>
                </div>
                <Link
                  to="/account"
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-primary"
                >
                  Account
                </Link>
              </div>
            )}

            <div className="space-y-1">
              {navLinks.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-3 py-2.5 text-sm font-medium text-foreground/90 hover:bg-surface-2 hover:text-primary transition-colors"
                >
                  {l.label}
                </a>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-border">
              {user ? (
                <Button
                  variant="glass"
                  size="sm"
                  onClick={handleLogout}
                  className="w-full text-xs text-destructive border-destructive/20 hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4 mr-1.5" /> Sign Out
                </Button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="glass"
                    size="sm"
                    onClick={() => handleOpenAuth("signin")}
                    className="w-full text-xs"
                  >
                    Sign In
                  </Button>
                  <Button
                    variant="hero"
                    size="sm"
                    onClick={() => handleOpenAuth("signup")}
                    className="w-full text-xs"
                  >
                    Start for Free
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} defaultMode={authMode} />
    </>
  );
}
