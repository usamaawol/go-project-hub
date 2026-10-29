import {
  RefreshCw,
  Shield,
  Lock,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import type { AdminTab } from "./types";

interface AdminTopBarProps {
  activeTab: AdminTab;
  loading: boolean;
  onRefresh: () => void;
  onLockConsole: () => void;
  adminUserEmail?: string;
  databaseConnected: boolean;
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
}: AdminTopBarProps) {
  const meta = TAB_TITLES[activeTab] || {
    title: "Admin Console",
    subtitle: "System Governance",
  };

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
