import React, { useState } from "react";
import {
  Image as ImageIcon,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Search,
  Filter,
  Save,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ImageSettingsItem, ImageLogItem } from "../types";
import {
  updateAdminImageSettings,
  clearAdminImageLogs,
  testAdminGenerateImage,
} from "@/lib/api-client";

interface AdminImageGenTabProps {
  settings: ImageSettingsItem;
  logs: ImageLogItem[];
  onRefresh: () => void;
  adminKey?: string;
}

export function AdminImageGenTab({
  settings,
  logs,
  onRefresh,
  adminKey = "documind-admin-secret",
}: AdminImageGenTabProps) {
  const [form, setForm] = useState<ImageSettingsItem>({ ...settings });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isClearing, setIsClearing] = useState(false);

  // Playground
  const [targetProviderId, setTargetProviderId] = useState<string>("auto");
  const [prompt, setPrompt] = useState(
    "Cross-section of a computer central processing unit architecture, labeled data buses, 16:9 modern illustration",
  );
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<{
    imageUrl?: string;
    durationMs?: number;
    provider?: string;
    model?: string;
    error?: string;
  } | null>(null);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await updateAdminImageSettings(form, adminKey);
      if (res && res.success) {
        toast.success("Image generation limits and quotas saved successfully!");
        onRefresh();
      } else {
        toast.error(res?.error?.message || "Failed to update settings.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update image settings");
    } finally {
      setSaving(false);
    }
  };

  const handleClearLogs = async () => {
    if (!window.confirm("Are you sure you want to clear all image generation activity logs?")) {
      return;
    }
    setIsClearing(true);
    try {
      const res = await clearAdminImageLogs(adminKey);
      if (res && res.success) {
        toast.success("Image generation logs cleared.");
        onRefresh();
      }
    } catch {
      toast.error("Failed to clear logs");
    } finally {
      setIsClearing(false);
    }
  };

  const handleBenchmark = async () => {
    setIsBenchmarking(true);
    setBenchmarkResult(null);
    try {
      const pid = targetProviderId === "auto" ? undefined : targetProviderId;
      const res = await testAdminGenerateImage(prompt, form.preferredAspectRatio, adminKey, pid);
      if (res && res.success && res.data) {
        setBenchmarkResult(res.data);
        toast.success(`Image generated via ${res.data.provider} (${res.data.model}, ${res.data.durationMs}ms)!`);
        onRefresh();
      } else {
        const msg = res?.data?.error || res?.error?.message || "Generation benchmark failed";
        if (res?.data) setBenchmarkResult(res.data);
        toast.error(msg);
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to test generate");
    } finally {
      setIsBenchmarking(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.prompt.toLowerCase().includes(search.toLowerCase()) ||
      (log.concept && log.concept.toLowerCase().includes(search.toLowerCase())) ||
      log.provider.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Global Toggles & Quotas (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h3 className="font-serif text-base font-bold text-foreground">
                Presentation Maker Visual Controls
              </h3>
              <p className="text-xs text-muted-foreground">
                Configure global switches, request quotas, and fallback policies
              </p>
            </div>

            <Button
              size="sm"
              variant="hero"
              disabled={saving}
              onClick={handleSaveSettings}
              className="text-xs font-mono gap-1.5"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span>Save Settings</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Global Switch */}
            <div className="p-3.5 rounded-xl border border-border bg-muted/20 flex items-center justify-between">
              <div>
                <span className="font-serif text-sm font-bold text-foreground block">
                  Globally Enabled
                </span>
                <span className="text-[11px] text-muted-foreground block mt-0.5">
                  Master server switch for Presentation Maker
                </span>
              </div>
              <input
                type="checkbox"
                checked={form.globallyEnabled}
                onChange={(e) => setForm({ ...form, globallyEnabled: e.target.checked })}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
            </div>

            {/* Auto-Fallback */}
            <div className="p-3.5 rounded-xl border border-border bg-muted/20 flex items-center justify-between">
              <div>
                <span className="font-serif text-sm font-bold text-foreground block">
                  Automatic Failover
                </span>
                <span className="text-[11px] text-muted-foreground block mt-0.5">
                  Cascade to next provider if primary fails
                </span>
              </div>
              <input
                type="checkbox"
                checked={form.autoFallbackEnabled}
                onChange={(e) => setForm({ ...form, autoFallbackEnabled: e.target.checked })}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
            </div>

            {/* Free-First Paid Provider Lock */}
            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-center justify-between sm:col-span-2">
              <div>
                <span className="font-serif text-sm font-bold text-foreground block">
                  Allow Paid Image / AI Providers (Disabled by Default)
                </span>
                <span className="text-[11px] text-muted-foreground block mt-0.5">
                  Keep OFF for Free-First policy. Enabling allows Imagen 3 (paid per-image), fal.ai, Replicate, and paid LLM fallbacks if keys have billing.
                </span>
              </div>
              <input
                type="checkbox"
                checked={Boolean(form.allowPaidProviders)}
                onChange={(e) => setForm({ ...form, allowPaidProviders: e.target.checked })}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
            </div>

            {/* Max Per Presentation */}
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] font-semibold text-muted-foreground">
                Max Visuals Per Presentation
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={form.maxGenerationsPerPresentation}
                onChange={(e) =>
                  setForm({
                    ...form,
                    maxGenerationsPerPresentation: parseInt(e.target.value) || 1,
                  })
                }
                className="w-full h-9 rounded-lg border border-border bg-background px-3 font-mono text-xs text-foreground focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Max Daily Generations */}
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] font-semibold text-muted-foreground">
                Max Daily Generations Per User
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={form.maxDailyGenerationsPerUser}
                onChange={(e) =>
                  setForm({
                    ...form,
                    maxDailyGenerationsPerUser: parseInt(e.target.value) || 1,
                  })
                }
                className="w-full h-9 rounded-lg border border-border bg-background px-3 font-mono text-xs text-foreground focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Max Concurrent Requests */}
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] font-semibold text-muted-foreground">
                Max Concurrent Requests
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={form.maxConcurrentRequests}
                onChange={(e) =>
                  setForm({
                    ...form,
                    maxConcurrentRequests: parseInt(e.target.value) || 1,
                  })
                }
                className="w-full h-9 rounded-lg border border-border bg-background px-3 font-mono text-xs text-foreground focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Request Timeout Seconds */}
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] font-semibold text-muted-foreground">
                Request Timeout (Seconds)
              </label>
              <input
                type="number"
                min={5}
                max={60}
                value={form.timeoutSeconds}
                onChange={(e) =>
                  setForm({
                    ...form,
                    timeoutSeconds: parseInt(e.target.value) || 30,
                  })
                }
                className="w-full h-9 rounded-lg border border-border bg-background px-3 font-mono text-xs text-foreground focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Right: Sandbox / Benchmark Playground (1 col) */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-serif text-base font-bold text-foreground">
                Sandbox Benchmark
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Test multi-provider image synthesis directly from admin console
            </p>

            <div className="mt-3 space-y-2">
              <select
                value={targetProviderId}
                onChange={(e) => {
                  setTargetProviderId(e.target.value);
                  setBenchmarkResult(null);
                }}
                className="w-full h-8 rounded-lg border border-border bg-background px-2.5 font-mono text-xs text-foreground"
              >
                <option value="auto">Auto (Free Cascade -&gt; SVG)</option>
                <option value="huggingface">Hugging Face ONLY (FLUX.1-schnell)</option>
                <option value="cloudflare">Cloudflare Workers AI ONLY</option>
                <option value="gemini">Google Gemini ONLY</option>
              </select>
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter prompt for presentation slide..."
                className="w-full rounded-xl border border-border bg-background p-2.5 font-mono text-xs text-foreground focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <Button
              size="sm"
              variant="outline"
              disabled={isBenchmarking || !prompt.trim()}
              onClick={handleBenchmark}
              className="w-full text-xs font-mono gap-1.5"
            >
              {isBenchmarking ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span>Run Generation Benchmark</span>
            </Button>

            {benchmarkResult && (
              <div className="mt-3 p-3 rounded-xl border border-border bg-muted/40 text-xs font-mono space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-emerald-600 font-bold">
                    {benchmarkResult.provider} ({benchmarkResult.model})
                  </span>
                  <span className="text-muted-foreground">
                    {benchmarkResult.durationMs}ms
                  </span>
                </div>
                {benchmarkResult.imageUrl && (
                  <div className="rounded-lg overflow-hidden border border-border max-h-[140px] flex items-center justify-center bg-black/40">
                    <img
                      src={benchmarkResult.imageUrl}
                      alt="Benchmark visual"
                      className="max-h-[135px] w-auto object-contain"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Operational Generation Logs */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        {/* Header with Search and Clear */}
        <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/10">
          <div>
            <h3 className="font-serif text-base font-bold text-foreground">
              Recent Image Generation Activity ({filteredLogs.length})
            </h3>
            <p className="text-xs text-muted-foreground">
              Real-time audit log of presentation visuals, latency, and fallback events
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search prompt or concept..."
                className="h-8 pl-8 pr-3 rounded-lg border border-border bg-background text-xs font-mono text-foreground focus:ring-1 focus:ring-primary w-48 sm:w-56"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-border bg-background text-xs font-mono text-foreground focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Statuses</option>
              <option value="success">Success</option>
              <option value="fallback">Fallback</option>
              <option value="failed">Failed</option>
            </select>

            <Button
              size="sm"
              variant="outline"
              disabled={isClearing || logs.length === 0}
              onClick={handleClearLogs}
              className="h-8 px-2.5 text-xs text-destructive hover:text-destructive gap-1"
            >
              <Trash2 className="h-3 w-3" />
              <span>Clear</span>
            </Button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          {filteredLogs.length === 0 ? (
            <div className="p-10 text-center text-xs text-muted-foreground">
              No image generation logs matching criteria.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-[11px] font-mono uppercase text-muted-foreground">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Concept / Prompt</th>
                  <th className="py-3 px-4">Provider & Model</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-foreground truncate">
                        {log.concept || "Presentation Slide"}
                      </div>
                      <div className="text-[11px] text-muted-foreground line-clamp-1 font-mono">
                        {log.prompt}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      <span className="font-semibold text-foreground block">
                        {log.provider}
                      </span>
                      <span className="text-muted-foreground text-[10px] block">
                        {log.model}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                      {log.durationMs}ms
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {log.status === "success" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          Success
                        </span>
                      )}
                      {log.status === "fallback" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20" title={log.errorMessage}>
                          Fallback SVG
                        </span>
                      )}
                      {log.status === "failed" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20" title={log.errorMessage}>
                          Failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
