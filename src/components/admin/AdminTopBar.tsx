import { useState, useRef, useEffect } from "react";
import {
  RefreshCw,
  Shield,
  Lock,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Bell,
  AlertTriangle,
  RotateCcw,
  X,
  Sparkles,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import type { AdminTab, ProviderAlertItem } from "./types";

interface AdminTopBarProps {
  activeTab: AdminTab;
  loading: boolean;
  onRefresh: () => void;
  onLockConsole: () => void;
  adminUserEmail?: string;
  databaseConnected: boolean;
  alerts?: ProviderAlertItem[];
  onResetQuota?: (providerId: string) => void;
  onDismissAlert?: (alertId: string) => void;
  onClearAlerts?: () => void;
  onNavigateTab?: (tab: AdminTab) => void;
}

const TAB_TITLES: Record<AdminTab, { title: string; subtitle: string }> = {
  overview: {
    title: "Mission Control Overview",
    subtitle: "Real-time metrics, provider telemetry, and operational intelligence",
  },
  providers: {
    title: "Multi-Provider AI Management",
    subtitle: "Configure credentials, select models, test connections, and manage priority",
  },
  "image-gen": {
    title: "Image Generation Controls",
    subtitle: "Global toggles, per-presentation limits, benchmark playground, and event logs",
  },
  users: {
    title: "User Governance & Plans",
    subtitle: "Manage registered user accounts, toggle Pro subscriptions, and assign roles",
  },
  presentations: {
    title: "Active Presentation Sessions",
    subtitle: "Inspect slide counts, visual status, and temporary session assets",
  },
  limits: {
    title: "Application Usage & Fair-Use Limits",
    subtitle: "Configure maximum slides, timeout thresholds, and execution modes",
  },
  "activity-logs": {
    title: "Activity & Operational Audit Trail",
    subtitle: "Immutable administrative logs and image generation history with CSV export",
  },
  settings: {
    title: "Platform Feature Settings",
    subtitle: "Maintenance mode switches, announcement banners, and template governance",
  },
  security: {
    title: "Security & Access Controls",
    subtitle: "Verified administrator tokens, master key bootstrap, and vulnerability guards",
  },
  health: {
    title: "System Health & Infrastructure",
    subtitle: "Node.js telemetry, Firestore latency, and temporary file purge",
  },
};

export function AdminTopBar({
  activeTab,
  loading,
  onRefresh,
  onLockConsole,
  adminUserEmail = "admin@documind.app",
  databaseConnected,
  alerts = [],
  onResetQuota,
  onDismissAlert,
  onClearAlerts,
  onNavigateTab,
}: AdminTopBarProps) {
  const [alertsOpen, setAlertsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const meta = TAB_TITLES[activeTab] || {
    title: "Admin Console",
    subtitle: "System Governance",
  };

  const activeAlerts = alerts.filter((a) => !a.dismissed);
  const hasCritical = activeAlerts.some((a) => a.severity === "critical");

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setAlertsOpen(false);
      }
    }
    if (alertsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [alertsOpen]);

  return (
    <header className="h-16 border-b border-border bg-card/60 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-10">
      {/* Title & Breadcrumbs */}
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
          <span>Console</span>
          <span>/</span>
          <span className="text-foreground capitalize font-semibold">
            {activeTab.replace("-", " ")}
          </span>
        </div>
        <h1 className="font-serif text-lg font-bold text-foreground truncate leading-tight">
          {meta.title}
        </h1>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Health status pill */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-muted/50 text-[11px] font-mono">
          {databaseConnected ? (
            <>
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">Firestore Connected</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-3 w-3 text-amber-500" />
              <span className="text-amber-700 dark:text-amber-400 font-medium">In-Memory Active</span>
            </>
          )}
        </div>

        {/* Quota Alerts Notification Bell */}
        <div className="relative" ref={popoverRef}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAlertsOpen((prev) => !prev)}
            className={`h-8 px-2.5 relative text-xs font-mono gap-1.5 ${
              activeAlerts.length > 0
                ? hasCritical
                  ? "border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20"
                  : "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title={activeAlerts.length > 0 ? `${activeAlerts.length} provider alerts` : "No active alerts"}
          >
            <Bell className={`h-3.5 w-3.5 ${activeAlerts.length > 0 ? "animate-bounce" : ""}`} />
            <span className="hidden sm:inline">Alerts</span>
            {activeAlerts.length > 0 && (
              <span
                className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold leading-tight ${
                  hasCritical ? "bg-red-600 text-white" : "bg-amber-500 text-white"
                }`}
              >
                {activeAlerts.length}
              </span>
            )}
          </Button>

          {/* Alerts Popover Dropdown */}
          {alertsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-border bg-card shadow-2xl p-0 z-50 overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3 border-b border-border bg-muted/40 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Bell className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-foreground">AI Quota & Cascade Alerts</span>
                  {activeAlerts.length > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-primary/20 text-primary font-mono font-medium">
                      {activeAlerts.length}
                    </span>
                  )}
                </div>
                {activeAlerts.length > 0 && onClearAlerts && (
                  <button
                    onClick={() => {
                      onClearAlerts();
                      setAlertsOpen(false);
                    }}
                    className="text-[11px] text-muted-foreground hover:text-foreground underline decoration-dotted"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
                {activeAlerts.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    <p className="font-medium text-foreground">All Providers Operating Normally</p>
                    <p className="text-[11px] mt-1 text-muted-foreground">
                      Gemini and Hugging Face quotas are active. Presentation Maker image cascading is ready.
                    </p>
                  </div>
                ) : (
                  activeAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 transition-colors ${
                        alert.severity === "critical"
                          ? "bg-red-500/5 hover:bg-red-500/10"
                          : "bg-amber-500/5 hover:bg-amber-500/10"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 font-semibold text-foreground">
                          <AlertTriangle
                            className={`h-3.5 w-3.5 shrink-0 ${
                              alert.severity === "critical" ? "text-red-500" : "text-amber-500"
                            }`}
                          />
                          <span className="truncate">{alert.title}</span>
                        </div>
                        {onDismissAlert && (
                          <button
                            onClick={() => onDismissAlert(alert.id)}
                            className="text-muted-foreground hover:text-foreground p-0.5 rounded"
                            title="Dismiss alert"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                        {alert.message}
                      </p>

                      {alert.cascadedTo && (
                        <div className="mt-2 flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded bg-muted/60 text-foreground w-fit">
                          <span className="text-muted-foreground">Active Failover:</span>
                          <span className="text-primary font-medium">{alert.cascadedTo}</span>
                        </div>
                      )}

                      <div className="mt-2.5 flex items-center justify-between gap-2 pt-1 border-t border-border/40">
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {new Date(alert.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {onResetQuota && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              onResetQuota(alert.providerId);
                            }}
                            className="h-6 px-2 text-[10px] font-mono gap-1 text-primary hover:text-primary"
                          >
                            <RotateCcw className="h-2.5 w-2.5" />
                            <span>Reset Quota</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {onNavigateTab && (
                <div className="p-2 border-t border-border bg-muted/30 text-center">
                  <button
                    onClick={() => {
                      onNavigateTab("providers");
                      setAlertsOpen(false);
                    }}
                    className="text-[11px] font-mono text-primary hover:underline font-medium"
                  >
                    Manage AI Providers & Priority Order →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Refresh button */}
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={onRefresh}
          className="h-8 px-2.5 text-xs font-mono gap-1.5"
          title="Refresh dashboard data"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>

        {/* View Main Site */}
        <Button
          size="sm"
          variant="ghost"
          asChild
          className="h-8 px-2.5 text-xs font-mono gap-1 text-muted-foreground hidden lg:flex"
        >
          <Link to="/" target="_blank">
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Open Studio</span>
          </Link>
        </Button>

        {/* Admin profile pill */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg border border-primary/20 bg-primary/5 text-xs">
          <Shield className="h-3.5 w-3.5 text-primary" />
          <span className="font-mono text-[11px] text-foreground font-medium max-w-[140px] truncate">
            {adminUserEmail}
          </span>
        </div>

        {/* Lock Console */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onLockConsole}
          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1"
          title="Lock and exit console"
        >
          <Lock className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Lock</span>
        </Button>
      </div>
    </header>
  );
}
