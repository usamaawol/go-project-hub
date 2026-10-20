import { useState, useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Sparkles,
  FileEdit,
  ArrowRightLeft,
  Minimize2,
  ScanText,
  LayoutTemplate,
  HelpCircle,
  Info,
  Mail,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Menu,
  X,
  User as UserIcon,
  LogOut,
  MessageSquare,
  Compass,
} from "lucide-react";
import { LogoMark } from "@/components/landing/Logo";
import { AuthModal } from "@/components/landing/AuthModal";
import { FeedbackModal } from "@/components/feedback/FeedbackModal";
import { restartProductTour } from "@/components/tour/ProductTour";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function AppSidebar({ collapsed, onToggleCollapse }: AppSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Get current pathname for active route highlighting
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [currentPath]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Signed out successfully.");
    } catch {
      toast.error("Sign out failed.");
    }
  };

  const navItems = [
    {
      label: "Home",
      to: "/",
      icon: Home,
      exact: true,
      tourId: "nav-home",
    },
    {
      label: "Presentation Maker",
      to: "/presentation-maker",
      icon: Sparkles,
      highlight: true,
      tourId: "nav-presentation-maker",
    },
    {
      label: "Document Studio",
      to: "/document-studio",
      icon: FileEdit,
      tourId: "nav-document-studio",
    },
    {
      label: "File Converter",
      to: "/converter",
      icon: ArrowRightLeft,
      tourId: "nav-converter",
    },
    {
      label: "PDF Compressor",
      to: "/pdf-compressor",
      icon: Minimize2,
      tourId: "nav-compressor",
    },
    {
      label: "Text Extractor",
      to: "/text-extractor",
      icon: ScanText,
      tourId: "nav-extractor",
    },
    {
      label: "Templates",
      to: "/templates",
      icon: LayoutTemplate,
      tourId: "nav-templates",
    },
    {
      label: "How It Works",
      to: "/how-it-works",
      icon: HelpCircle,
      tourId: "nav-how-it-works",
    },
    {
      label: "About",
      to: "/about",
      icon: Info,
      tourId: "nav-about",
    },
    {
      label: "Contact Us",
      to: "/contact",
      icon: Mail,
      tourId: "nav-contact",
    },
  ];

  return (
    <>
      {/* ============================================================== */}
      {/* Mobile Top App Bar (visible on sm/md screens) */}
      {/* ============================================================== */}
      <div className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-md lg:hidden">
        <Link to="/" className="flex items-center gap-2">
          <LogoMark className="h-7 w-7" />
          <span className="font-sans text-lg font-bold text-foreground">
            Docu<span className="text-primary font-serif italic">Mind</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFeedbackOpen(true)}
            aria-label="Send Feedback"
            title="Send Feedback"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
          <button
            onClick={toggleTheme}
            aria-label="Toggle color theme"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* Mobile Drawer Backdrop */}
      {/* ============================================================== */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs lg:hidden animate-in fade-in duration-200"
        />
      )}

      {/* ============================================================== */}
      {/* Mobile Flyout Drawer */}
      {/* ============================================================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col justify-between border-r border-border bg-card p-5 shadow-2xl transition-transform duration-300 lg:hidden overflow-y-auto ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          <div className="flex items-center justify-between border-b border-border pb-4">
            <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5">
              <LogoMark className="h-8 w-8" />
              <span className="font-sans text-xl font-bold text-foreground">
                Docu<span className="text-primary font-serif italic">Mind</span>
              </span>
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="mt-5 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? currentPath === item.to
                : currentPath.startsWith(item.to);
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : item.highlight
                        ? "bg-primary/10 text-primary font-semibold hover:bg-primary/20"
                        : "text-foreground/80 hover:bg-surface-2 hover:text-foreground"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? "" : item.highlight ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Mobile Sidebar Footer */}
        <div className="border-t border-border pt-4 mt-6 space-y-2.5">
          {/* Feedback & Tour buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setMobileOpen(false);
                setFeedbackOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-border py-1.5 text-xs text-foreground bg-surface-2 hover:bg-muted"
            >
              <MessageSquare className="h-3.5 w-3.5 text-primary" /> Feedback
            </button>
            <button
              onClick={() => {
                setMobileOpen(false);
                restartProductTour();
              }}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-border py-1.5 text-xs text-foreground bg-surface-2 hover:bg-muted"
            >
              <Compass className="h-3.5 w-3.5 text-amber-500" /> Take Tour
            </button>
          </div>

          {user ? (
            <div className="space-y-2 pt-1">
              <Link
                to="/account"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-2.5 transition-colors hover:bg-muted"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 font-bold text-xs text-primary">
                  {user.displayName?.slice(0, 2).toUpperCase() ||
                    user.email?.slice(0, 2).toUpperCase() ||
                    "DM"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {user.displayName || "Account"}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">{user.email}</p>
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-border py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-surface-2"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              <Button
                variant="hero"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  setAuthMode("signin");
                  setAuthOpen(true);
                  setMobileOpen(false);
                }}
              >
                Sign In
              </Button>
              <Button
                variant="glass"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  setAuthMode("signup");
                  setAuthOpen(true);
                  setMobileOpen(false);
                }}
              >
                Register (Free)
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <span>Theme</span>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-foreground bg-surface-2"
            >
              {theme === "dark" ? (
                <Sun className="h-3.5 w-3.5" />
              ) : (
                <Moon className="h-3.5 w-3.5" />
              )}
              <span>{theme === "dark" ? "Dark" : "Light"}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* Desktop Persistent Vertical Sidebar (lg+ screens) */}
      {/* ============================================================== */}
      <aside
        data-tour="sidebar-nav"
        className={`fixed inset-y-0 left-0 z-30 hidden lg:flex flex-col justify-between border-r border-border bg-card transition-all duration-300 ${
          collapsed ? "w-20 p-3" : "w-64 p-5"
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Top Logo & Desktop Collapse Toggle */}
          <div
            className={`flex items-center ${
              collapsed ? "justify-center" : "justify-between"
            } border-b border-border pb-4 shrink-0`}
          >
            <Link to="/" className="flex items-center gap-2.5 group">
              <LogoMark className="h-8 w-8" />
              {!collapsed && (
                <span className="font-sans text-xl font-bold text-foreground">
                  Docu<span className="text-primary font-serif italic">Mind</span>
                </span>
              )}
            </Link>

            {!collapsed && (
              <button
                onClick={onToggleCollapse}
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </div>

          {collapsed && (
            <div className="mt-2 flex justify-center shrink-0">
              <button
                onClick={onToggleCollapse}
                title="Expand sidebar"
                aria-label="Expand sidebar"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Navigation Items (Scrollable if viewport is short) */}
          <nav className="mt-4 space-y-1 overflow-y-auto flex-1 pr-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? currentPath === item.to
                : currentPath.startsWith(item.to);
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  data-tour={item.tourId}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-3 rounded-xl py-2 transition-all ${
                    collapsed ? "justify-center px-2" : "px-3"
                  } text-xs font-medium ${
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : item.highlight
                        ? "bg-primary/10 text-primary font-semibold hover:bg-primary/20"
                        : "text-foreground/80 hover:bg-surface-2 hover:text-foreground"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? "" : item.highlight ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Feedback Button, User Account, Theme, Collapse */}
        <div className="border-t border-border pt-3 space-y-2 shrink-0">
          {/* Quick Action: Feedback & Tour buttons */}
          {!collapsed ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                data-tour="feedback-btn"
                onClick={() => setFeedbackOpen(true)}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-border py-1.5 text-[11px] font-medium text-foreground bg-surface-2 hover:bg-muted transition-colors"
              >
                <MessageSquare className="h-3 w-3 text-primary" /> Feedback
              </button>
              <button
                type="button"
                onClick={restartProductTour}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-border py-1.5 text-[11px] font-medium text-foreground bg-surface-2 hover:bg-muted transition-colors"
              >
                <Compass className="h-3 w-3 text-amber-500" /> Tour
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1 items-center">
              <button
                type="button"
                data-tour="feedback-btn"
                title="Send Feedback"
                onClick={() => setFeedbackOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-2 text-foreground hover:bg-muted transition-colors"
              >
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
              </button>
              <button
                type="button"
                title="Interactive Tour"
                onClick={restartProductTour}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-2 text-foreground hover:bg-muted transition-colors"
              >
                <Compass className="h-3.5 w-3.5 text-amber-500" />
              </button>
            </div>
          )}

          {/* User Account State */}
          {user ? (
            <div className="space-y-1.5">
              <Link
                to="/account"
                title={collapsed ? user.displayName || user.email || "Account" : undefined}
                className={`flex items-center gap-2.5 rounded-xl border border-border bg-surface-2 p-1.5 transition-colors hover:bg-muted ${
                  collapsed ? "justify-center" : ""
                }`}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-xs text-primary">
                  {user.displayName?.slice(0, 2).toUpperCase() ||
                    user.email?.slice(0, 2).toUpperCase() ||
                    "DM"}
                </div>
                {!collapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {user.displayName || "Account"}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">{user.email}</p>
                  </div>
                )}
              </Link>
            </div>
          ) : (
            <div className="space-y-1.5">
              {collapsed ? (
                <button
                  onClick={() => {
                    setAuthMode("signin");
                    setAuthOpen(true);
                  }}
                  title="Sign In"
                  className="flex h-8 w-full items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <UserIcon className="h-3.5 w-3.5" />
                </button>
              ) : (
                <Button
                  variant="hero"
                  size="sm"
                  className="w-full text-xs h-8"
                  onClick={() => {
                    setAuthMode("signin");
                    setAuthOpen(true);
                  }}
                >
                  Sign In / Register
                </Button>
              )}
            </div>
          )}

          {/* Theme Toggle Button */}
          <div
            data-tour="theme-toggle"
            className={`flex items-center ${
              collapsed ? "justify-center" : "justify-between"
            } pt-0.5`}
          >
            {!collapsed && <span className="text-xs text-muted-foreground">Mode</span>}
            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
              className={`flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1 text-xs text-foreground hover:bg-muted transition-colors ${
                collapsed ? "h-8 w-8 justify-center p-0" : ""
              }`}
            >
              {theme === "dark" ? (
                <Sun className="h-3.5 w-3.5 text-amber-500" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-primary" />
              )}
              {!collapsed && <span>{theme === "dark" ? "Dark" : "Light"}</span>}
            </button>
          </div>
        </div>
      </aside>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} defaultMode={authMode} />
      <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  );
}
