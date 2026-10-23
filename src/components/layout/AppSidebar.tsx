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
  MoreHorizontal,
  FileText,
  Shield,
  Layers,
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
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Get current pathname for active route highlighting
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  // Close mobile more sheet on route change
  useEffect(() => {
    setMobileMoreOpen(false);
  }, [currentPath]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Signed out successfully.");
    } catch {
      toast.error("Sign out failed.");
    }
  };

  // Primary destinations for desktop sidebar & mobile bottom bar
  const primaryNavItems = [
    {
      label: "Home",
      to: "/",
      icon: Home,
      exact: true,
      tourId: "nav-home",
    },
    {
      label: "Presentation Maker",
      mobileLabel: "Presentations",
      to: "/presentation-maker",
      icon: Sparkles,
      highlight: true,
      tourId: "nav-presentation-maker",
    },
    {
      label: "Document Studio",
      mobileLabel: "Documents",
      to: "/document-studio",
      icon: FileEdit,
      tourId: "nav-document-studio",
    },
    {
      label: "Templates Catalog",
      mobileLabel: "Templates",
      to: "/templates",
      icon: LayoutTemplate,
      tourId: "nav-templates",
    },
  ];

  // Secondary tools (in sidebar on desktop, inside "More" sheet on mobile)
  const secondaryNavItems = [
    {
      label: "File Converter",
      to: "/converter",
      icon: ArrowRightLeft,
      tourId: "nav-converter",
      desc: "Convert PDF, Word & Text",
    },
    {
      label: "PDF Compressor",
      to: "/pdf-compressor",
      icon: Minimize2,
      tourId: "nav-compressor",
      desc: "Lossless byte reduction",
    },
    {
      label: "Text Extractor",
      to: "/text-extractor",
      icon: ScanText,
      tourId: "nav-extractor",
      desc: "Instant content telemetry",
    },
    {
      label: "How It Works",
      to: "/how-it-works",
      icon: HelpCircle,
      tourId: "nav-how-it-works",
      desc: "Guides & platform architecture",
    },
    {
      label: "About DocuMind",
      to: "/about",
      icon: Info,
      tourId: "nav-about",
      desc: "Our mission & free ethos",
    },
    {
      label: "Contact Us",
      to: "/contact",
      icon: Mail,
      tourId: "nav-contact",
      desc: "Get in touch or report an issue",
    },
  ];

  return (
    <>
      {/* ============================================================== */}
      {/* Mobile Top App Bar (visible on sm/md screens)                   */}
      {/* ============================================================== */}
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-md lg:hidden">
        <Link to="/" className="flex items-center gap-2.5">
          <LogoMark className="h-7 w-7" />
          <span className="font-sans text-lg font-bold text-foreground">
            Docu<span className="text-primary font-serif italic">Mind</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFeedbackOpen(true)}
            aria-label="Send Feedback"
            title="Send Feedback"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px]"
          >
            <MessageSquare className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle color theme"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px]"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-500" />
            ) : (
              <Moon className="h-4 w-4 text-primary" />
            )}
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* Mobile Bottom Navigation Bar (Smartphones: < lg)              */}
      {/* ============================================================== */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 flex h-16 w-full items-center justify-around border-t border-border bg-card/95 backdrop-blur-md px-2 lg:hidden shadow-lift"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact ? currentPath === item.to : currentPath.startsWith(item.to);

          return (
            <Link
              key={item.label}
              to={item.to}
              data-tour={item.tourId}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-medium transition-all min-h-[48px] ${
                isActive ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                  isActive ? "bg-primary/10 text-primary" : ""
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span className="truncate mt-0.5 leading-none">{item.mobileLabel || item.label}</span>
            </Link>
          );
        })}

        {/* 5th Bottom Item: "More" Menu Toggle */}
        <button
          type="button"
          onClick={() => setMobileMoreOpen(true)}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-medium transition-all min-h-[48px] ${
            mobileMoreOpen
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
              mobileMoreOpen ? "bg-primary/10 text-primary" : ""
            }`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </div>
          <span className="truncate mt-0.5 leading-none">More</span>
        </button>
      </nav>

      {/* ============================================================== */}
      {/* Mobile "More" Slide-Up Bottom Sheet                            */}
      {/* ============================================================== */}
      {mobileMoreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            onClick={() => setMobileMoreOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          />

          {/* Bottom Sheet Modal */}
          <div className="fixed bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-border bg-card p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Sheet Handle */}
            <div className="mx-auto h-1.5 w-12 rounded-full bg-border mb-4" />

            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <LogoMark className="h-6 w-6" />
                <span className="font-serif font-bold text-lg text-foreground">
                  DocuMind Tools & Settings
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMoreOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Utility Tools Grid */}
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPath.startsWith(item.to);
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    onClick={() => setMobileMoreOpen(false)}
                    className={`flex items-start gap-2.5 rounded-2xl border p-3 transition-colors min-h-[60px] ${
                      isActive
                        ? "border-primary bg-primary/10 text-primary font-bold"
                        : "border-border bg-surface-2 hover:bg-muted text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                    <div>
                      <p className="text-xs font-semibold leading-tight">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                        {item.desc}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Quick Actions in Sheet: Tour & Feedback */}
            <div className="mt-4 grid grid-cols-2 gap-2.5 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setMobileMoreOpen(false);
                  restartProductTour();
                }}
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 py-2.5 text-xs font-semibold text-foreground hover:bg-muted min-h-[44px]"
              >
                <Compass className="h-4 w-4 text-amber-500" /> Interactive Tour
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileMoreOpen(false);
                  setFeedbackOpen(true);
                }}
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 py-2.5 text-xs font-semibold text-foreground hover:bg-muted min-h-[44px]"
              >
                <MessageSquare className="h-4 w-4 text-primary" /> Give Feedback
              </button>
            </div>

            {/* User Account / Auth Row in Sheet */}
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
              {user ? (
                <div className="flex items-center justify-between w-full">
                  <Link
                    to="/account"
                    onClick={() => setMobileMoreOpen(false)}
                    className="flex items-center gap-2.5 text-xs font-semibold text-foreground hover:text-primary"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                      {user.displayName?.slice(0, 2).toUpperCase() || "DM"}
                    </div>
                    <div>
                      <p>{user.displayName || "Account"}</p>
                      <p className="text-[10px] text-muted-foreground">{user.email}</p>
                    </div>
                  </Link>
                  <Button
                    variant="glass"
                    size="sm"
                    className="text-xs min-h-[40px]"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-3.5 w-3.5 mr-1" /> Sign Out
                  </Button>
                </div>
              ) : (
                <Button
                  variant="hero"
                  size="sm"
                  className="w-full min-h-[44px] text-xs font-semibold"
                  onClick={() => {
                    setMobileMoreOpen(false);
                    setAuthMode("signin");
                    setAuthOpen(true);
                  }}
                >
                  Sign In to DocuMind
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* Desktop Left Sidebar (Visible on >= lg screens)                */}
      {/* ============================================================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden lg:flex flex-col justify-between border-r border-border bg-card/95 backdrop-blur-md p-4 transition-all duration-300 shadow-xs ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Top Brand Header */}
          <div className="flex items-center justify-between border-b border-border pb-4 shrink-0">
            <Link to="/" className="flex items-center gap-3">
              <LogoMark className="h-8 w-8 shrink-0" />
              {!collapsed && (
                <span className="font-sans text-xl font-bold text-foreground">
                  Docu<span className="text-primary font-serif italic">Mind</span>
                </span>
              )}
            </Link>

            {!collapsed && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors min-h-[32px] min-w-[32px]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </div>

          {collapsed && (
            <div className="mt-2 flex justify-center shrink-0">
              <button
                type="button"
                onClick={onToggleCollapse}
                title="Expand sidebar"
                aria-label="Expand sidebar"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors min-h-[32px] min-w-[32px]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Navigation Links — Spacious & Comfortable Desktop Targets */}
          <nav className="mt-4 space-y-1.5 overflow-y-auto flex-1 pr-0.5">
            {/* Primary Destinations */}
            {primaryNavItems.map((item) => {
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
                  className={`flex items-center gap-3 rounded-xl py-2.5 transition-all min-h-[44px] ${
                    collapsed ? "justify-center px-2" : "px-3.5"
                  } text-[13px] font-medium ${
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs ring-1 ring-primary/20"
                      : item.highlight
                        ? "bg-primary/10 text-primary font-semibold hover:bg-primary/20"
                        : "text-foreground/80 hover:bg-surface-2 hover:text-foreground"
                  }`}
                >
                  <Icon
                    className={`h-4.5 w-4.5 shrink-0 ${
                      isActive ? "" : item.highlight ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}

            {/* Section Divider */}
            {!collapsed && (
              <div className="pt-2 pb-1">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 px-3">
                  Document Tools
                </span>
              </div>
            )}

            {/* Secondary Utility Tools */}
            {secondaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath.startsWith(item.to);

              return (
                <Link
                  key={item.label}
                  to={item.to}
                  data-tour={item.tourId}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-3 rounded-xl py-2 transition-all min-h-[40px] ${
                    collapsed ? "justify-center px-2" : "px-3.5"
                  } text-xs font-medium ${
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-foreground/80 hover:bg-surface-2 hover:text-foreground"
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? "" : "text-muted-foreground"}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Desktop Bottom Section: Feedback, Tour, User & Theme */}
        <div className="border-t border-border pt-3 space-y-2 shrink-0">
          {/* Quick Buttons: Feedback & Tour */}
          {!collapsed ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                data-tour="feedback-btn"
                onClick={() => setFeedbackOpen(true)}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs font-medium text-foreground bg-surface-2 hover:bg-muted transition-colors min-h-[40px]"
              >
                <MessageSquare className="h-3.5 w-3.5 text-primary" /> Feedback
              </button>
              <button
                type="button"
                onClick={restartProductTour}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs font-medium text-foreground bg-surface-2 hover:bg-muted transition-colors min-h-[40px]"
              >
                <Compass className="h-3.5 w-3.5 text-amber-500" /> Tour
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1 items-center">
              <button
                type="button"
                data-tour="feedback-btn"
                title="Send Feedback"
                onClick={() => setFeedbackOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-2 text-foreground hover:bg-muted transition-colors"
              >
                <MessageSquare className="h-4 w-4 text-primary" />
              </button>
              <button
                type="button"
                title="Interactive Tour"
                onClick={restartProductTour}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-2 text-foreground hover:bg-muted transition-colors"
              >
                <Compass className="h-4 w-4 text-amber-500" />
              </button>
            </div>
          )}

          {/* User Account State */}
          {user ? (
            <div className="space-y-1.5">
              <Link
                to="/account"
                title={collapsed ? user.displayName || user.email || "Account" : undefined}
                className={`flex items-center gap-2.5 rounded-xl border border-border bg-surface-2 p-2 transition-colors hover:bg-muted min-h-[44px] ${
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
                  type="button"
                  onClick={() => {
                    setAuthMode("signin");
                    setAuthOpen(true);
                  }}
                  title="Sign In"
                  className="flex h-9 w-full items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <UserIcon className="h-4 w-4" />
                </button>
              ) : (
                <Button
                  variant="hero"
                  size="sm"
                  className="w-full text-xs min-h-[42px] font-semibold"
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
            {!collapsed && <span className="text-xs text-muted-foreground">Appearance</span>}
            <button
              type="button"
              onClick={toggleTheme}
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
              className={`flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors min-h-[38px] ${
                collapsed ? "h-9 w-9 justify-center p-0" : ""
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
