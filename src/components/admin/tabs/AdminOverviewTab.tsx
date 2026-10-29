import { useState } from "react";
import {
  Users,
  Cpu,
  Image as ImageIcon,
  Presentation,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
  Trash2,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import { Button } from "@/components/ui/button";
import type { AdminMetrics, ProviderItem, ImageLogItem } from "../types";

interface AdminOverviewTabProps {
  metrics: AdminMetrics;
  providers: ProviderItem[];
  imageLogs: ImageLogItem[];
  onTestAllProviders: () => void;
  onPurgeTempFiles: () => void;
  onExportAuditReport: () => void;
  onNavigateTab: (tab: any) => void;
  testingAll: boolean;
  purging: boolean;
}

export function AdminOverviewTab({
  metrics,
  providers,
  imageLogs,
  onTestAllProviders,
  onPurgeTempFiles,
  onExportAuditReport,
  onNavigateTab,
  testingAll,
  purging,
}: AdminOverviewTabProps) {
  const [timeRange, setTimeRange] = useState<"today" | "7d" | "30d" | "all">("7d");

  const readyProviders = providers.filter((p) => p.status === "ready" || p.isConfigured);
  const totalGenerations = imageLogs.length;
  const successfulGenerations = imageLogs.filter((l) => l.status === "success").length;
  const fallbackGenerations = imageLogs.filter((l) => l.status === "fallback").length;
  const successRate = totalGenerations > 0
    ? `${Math.round((successfulGenerations / totalGenerations) * 100)}%`
    : "100%";

  return (
    <div className="space-y-6">
      {/* 4 Primary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Users */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">
              Registered Accounts
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-serif font-bold text-foreground">
              {metrics.totalUsers}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="text-emerald-600 font-semibold font-mono">
                {metrics.proPlanUsers} Pro
              </span>
              <span>•</span>
              <span>{metrics.freePlanUsers} Free ({metrics.proConversionRate} conv.)</span>
            </div>
          </div>
        </div>

        {/* Card 2: Multi-Provider AI */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">
              AI Image Providers
            </span>
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <Cpu className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-serif font-bold text-foreground">
              {readyProviders.length} / {providers.length}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{providers.filter((p) => p.enabled).length} Enabled with Auto-Failover</span>
            </div>
          </div>
        </div>

        {/* Card 3: Image Generation */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">
              Image Generations
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <ImageIcon className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-serif font-bold text-foreground">
              {totalGenerations > 0 ? totalGenerations : metrics.totalJobs}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="text-emerald-600 font-semibold font-mono">
                {successRate} Success
              </span>
              <span>•</span>
              <span>{fallbackGenerations} Fallbacks Active</span>
            </div>
          </div>
        </div>

        {/* Card 4: System Uptime */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">
              System Uptime
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-serif font-bold text-foreground">
              {Math.floor(metrics.uptimeSeconds / 3600)}h {Math.floor((metrics.uptimeSeconds % 3600) / 60)}m
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-mono text-[11px] text-muted-foreground">
                RAM: {metrics.memoryUsageMb} MB • Node.js Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Control Bar */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-serif text-sm font-bold text-foreground">
              DocuMind Operational Actions
            </h4>
            <p className="text-xs text-muted-foreground">
              Run provider health probes, purge expired ephemeral presentations, or export reports.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={testingAll}
            onClick={onTestAllProviders}
            className="text-xs font-mono gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${testingAll ? "animate-spin text-primary" : ""}`} />
            <span>Test All 5 Providers</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={purging}
            onClick={onPurgeTempFiles}
            className="text-xs font-mono gap-1.5 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Purge Expired Sessions</span>
          </Button>

          <Button
            size="sm"
            variant="hero"
            onClick={onExportAuditReport}
            className="text-xs font-mono gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Audit CSV</span>
          </Button>
        </div>
      </div>

      {/* Analytics Charts & Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Trend (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-base font-bold text-foreground">
                Document Studio & Presentation Activity
              </h3>
              <p className="text-xs text-muted-foreground">
                7-day operational workload and document generation trends
              </p>
            </div>
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border">
              {(["today", "7d", "30d", "all"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-md transition-all ${
                    timeRange === r
                      ? "bg-card text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.dailyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1E293B",
                    borderColor: "#334155",
                    borderRadius: "12px",
                    color: "#F8FAFC",
                    fontSize: "12px",
                  }}
                />
                <Area type="monotone" dataKey="jobs" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#colorJobs)" name="Document Jobs" />
                <Area type="monotone" dataKey="newUsers" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" name="New Users" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tool Breakdown & Policy (1 col) */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
          <div>
            <h3 className="font-serif text-base font-bold text-foreground">
              Tool Usage Breakdown
            </h3>
            <p className="text-xs text-muted-foreground">
              Real telemetry across DocuMind tool suite
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {metrics.toolUsageBreakdown.map((t) => (
              <div key={t.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{t.name}</span>
                  <span className="font-mono text-muted-foreground font-semibold">{t.percentage}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${t.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-border mt-4">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-emerald-800 dark:text-emerald-300 block">
                  100% Free Policy Active
                </span>
                <span className="text-emerald-700 dark:text-emerald-400 text-[11px] leading-relaxed block mt-0.5">
                  All 110 templates, exports, and features are completely free with zero paywalls.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
