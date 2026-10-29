import React, { useState } from "react";
import {
  HeartPulse,
  Server,
  Database,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Clock,
  Layers,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { checkBackendHealth, purgeAdminTempFiles } from "@/lib/api-client";
import type { AdminMetrics } from "../types";

interface AdminHealthTabProps {
  metrics: AdminMetrics;
  onRefresh: () => void;
  adminKey?: string;
}

export function AdminHealthTab({
  metrics,
  onRefresh,
  adminKey = "documind-admin-secret",
}: AdminHealthTabProps) {
  const [purging, setPurging] = useState(false);
  const [probing, setProbing] = useState(false);
  const [healthInfo, setHealthInfo] = useState<any>(null);

  const handlePurge = async () => {
    if (!window.confirm("Purge all expired presentation sessions and temporary disk assets?")) {
      return;
    }
    setPurging(true);
    try {
      const res = await purgeAdminTempFiles(adminKey);
      if (res && res.success) {
        toast.success(res.message || "Cleaned expired temporary files.");
        onRefresh();
      } else {
        toast.error("Failed to purge temporary files.");
      }
    } catch {
      toast.error("Error purging files");
    } finally {
      setPurging(false);
    }
  };

  const handleProbe = async () => {
    setProbing(true);
    try {
      const res = await checkBackendHealth();
      if (res) {
        setHealthInfo(res);
        toast.success(`Health probe online! Uptime: ${res.uptimeSeconds}s`);
      } else {
        toast.error("Health probe returned no response.");
      }
    } catch {
      toast.error("Health probe failed");
    } finally {
      setProbing(false);
    }
  };

  const uptimeHours = Math.floor(metrics.uptimeSeconds / 3600);
  const uptimeMinutes = Math.floor((metrics.uptimeSeconds % 3600) / 60);
  const uptimeSeconds = metrics.uptimeSeconds % 60;

  return (
    <div className="space-y-6">
      {/* Infrastructure Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Service Status */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider block">
              Service Status
            </span>
            <div className="text-2xl font-serif font-bold text-foreground mt-1 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
              <span>Operational</span>
            </div>
            <span className="text-xs text-muted-foreground mt-0.5 block">
              Node.js + TanStack Router Core
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <HeartPulse className="h-5 w-5" />
          </div>
        </div>

        {/* Database Status */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider block">
              Cloud Database
            </span>
            <div className="text-2xl font-serif font-bold text-foreground mt-1 flex items-center gap-2">
              {metrics.databaseConnected ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span>Firestore</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <span>In-Memory</span>
                </>
              )}
            </div>
            <span className="text-xs text-muted-foreground mt-0.5 block">
              {metrics.databaseConnected ? "Connected & Synchronized" : "Local Fallback Active"}
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <Database className="h-5 w-5" />
          </div>
        </div>

        {/* Node Memory */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider block">
              Memory Footprint
            </span>
            <div className="text-2xl font-serif font-bold text-foreground mt-1">
              {metrics.memoryUsageMb} MB
            </div>
            <span className="text-xs text-muted-foreground mt-0.5 block">
              V8 Engine Heap Utilization
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
            <Cpu className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Health Actions & Telemetry Box */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-3">
          <div>
            <h3 className="font-serif text-base font-bold text-foreground">
              Server Infrastructure & Maintenance Actions
            </h3>
            <p className="text-xs text-muted-foreground">
              Monitor process longevity, inspect latency endpoints, and clean temporary disk assets
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={probing}
              onClick={handleProbe}
              className="text-xs font-mono gap-1"
            >
              {probing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              <span>Run Live Probe</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              disabled={purging}
              onClick={handlePurge}
              className="text-xs font-mono gap-1 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Purge Expired Files</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              Process Uptime Telemetry
            </span>
            <div className="text-lg font-bold text-foreground">
              {uptimeHours} hours, {uptimeMinutes} minutes, {uptimeSeconds} seconds
            </div>
            <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">
              Continuous process lifespan. Automatic background cleaner runs every 30 seconds to reclaim disk space.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              Ephemeral Storage Directory
            </span>
            <div className="text-lg font-bold text-foreground truncate">
              /tmp/documind-temp-sessions
            </div>
            <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">
              Zero-Retention privacy boundary. Files expire automatically after 15 minutes of inactivity.
            </p>
          </div>
        </div>

        {healthInfo && (
          <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-2 text-xs font-mono">
            <span className="text-[10px] uppercase font-bold text-emerald-600 block">
              Latest Live Health Probe Output
            </span>
            <pre className="p-3 rounded-lg bg-background border border-border overflow-x-auto text-[11px] text-foreground">
              {JSON.stringify(healthInfo, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
