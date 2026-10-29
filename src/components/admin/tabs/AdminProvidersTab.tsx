import React, { useState } from "react";
import {
  Cpu,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Save,
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ProviderItem } from "../types";
import {
  updateAdminImageProvider,
  testAdminImageProviderConnection,
  testAdminGenerateImage,
} from "@/lib/api-client";

interface AdminProvidersTabProps {
  providers: ProviderItem[];
  onRefresh: () => void;
  adminKey?: string;
}

export function AdminProvidersTab({
  providers,
  onRefresh,
  adminKey = "documind-admin-secret",
}: AdminProvidersTabProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKey, setEditKey] = useState("");
  const [editEndpoint, setEditEndpoint] = useState("");
  const [editModel, setEditModel] = useState("");
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    Record<string, { success: boolean; latencyMs: number; message: string }>
  >({});

  // Benchmarking modal state
  const [testGenModalOpen, setTestGenModalOpen] = useState(false);
  const [testGenPrompt, setTestGenPrompt] = useState(
    "A clean architectural diagram of a microservices distributed messaging system, 16:9 illustration",
  );
  const [isTestGenerating, setIsTestGenerating] = useState(false);
  const [testGenResult, setTestGenResult] = useState<{
    imageUrl?: string;
    durationMs?: number;
    provider?: string;
    model?: string;
  } | null>(null);

  const toggleShowKey = (id: string) => {
    setShowKey((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStartEdit = (p: ProviderItem) => {
    setEditingId(p.id);
    setEditKey(p.maskedKey || "");
    setEditEndpoint(p.endpointUrl || "");
    setEditModel(p.selectedModel);
  };

  const handleSaveProvider = async (id: string) => {
    setSavingId(id);
    try {
      const updates: Record<string, any> = {
        selectedModel: editModel,
        endpointUrl: editEndpoint.trim(),
      };
      if (editKey && !editKey.includes("••••")) {
        updates.apiKey = editKey.trim();
      }

      const res = await updateAdminImageProvider(id, updates, adminKey);
      if (res && res.success) {
        toast.success(`Provider "${id}" updated successfully!`);
        setEditingId(null);
        onRefresh();
      } else {
        toast.error(res?.error?.message || "Failed to update provider.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Error saving provider settings");
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleEnabled = async (p: ProviderItem) => {
    try {
      const newEnabled = !p.enabled;
      const res = await updateAdminImageProvider(p.id, { enabled: newEnabled }, adminKey);
      if (res && res.success) {
        toast.success(
          `Provider "${p.name}" ${newEnabled ? "enabled" : "disabled"} for presentation synthesis.`,
        );
        onRefresh();
      }
    } catch (err: any) {
      toast.error("Failed to toggle provider status");
    }
  };

  const handleToggleFallback = async (p: ProviderItem) => {
    try {
      const newFallback = !p.fallbackEligible;
      const res = await updateAdminImageProvider(
        p.id,
        { fallbackEligible: newFallback },
        adminKey,
      );
      if (res && res.success) {
        toast.success(
          `Provider "${p.name}" fallback eligibility set to ${newFallback ? "Active" : "Disabled"}.`,
        );
        onRefresh();
      }
    } catch (err: any) {
      toast.error("Failed to update fallback eligibility");
    }
  };

  const handleMovePriority = async (p: ProviderItem, direction: "up" | "down") => {
    const sorted = [...providers].sort((a, b) => a.priority - b.priority);
    const currIdx = sorted.findIndex((item) => item.id === p.id);
    if (currIdx < 0) return;

    const targetIdx = direction === "up" ? currIdx - 1 : currIdx + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;

    const targetItem = sorted[targetIdx]!;
    try {
      await updateAdminImageProvider(p.id, { priority: targetItem.priority }, adminKey);
      await updateAdminImageProvider(targetItem.id, { priority: p.priority }, adminKey);
      toast.success(`Priority updated: ${p.name} is now #${targetIdx + 1}`);
      onRefresh();
    } catch {
      toast.error("Failed to reorder priority");
    }
  };

  const handleTestConnection = async (id: string, apiKeyOverride?: string) => {
    setTestingId(id);
    try {
      const res = await testAdminImageProviderConnection(id, apiKeyOverride, adminKey);
      if (res && res.data) {
        setTestResults((prev) => ({
          ...prev,
          [id]: {
            success: res.data.success,
            latencyMs: res.data.latencyMs,
            message: res.data.message,
          },
        }));
        if (res.data.success) {
          toast.success(`Test succeeded: ${res.data.message} (${res.data.latencyMs}ms)`);
        } else {
          toast.error(`Connection failed: ${res.data.message}`);
        }
        onRefresh();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to execute connection test");
    } finally {
      setTestingId(null);
    }
  };

  const handleRunTestGeneration = async () => {
    setIsTestGenerating(true);
    setTestGenResult(null);
    try {
      const res = await testAdminGenerateImage(testGenPrompt, "16:9", adminKey);
      if (res && res.success && res.data) {
        setTestGenResult(res.data);
        toast.success(
          `Image generated via ${res.data.provider} (${res.data.durationMs}ms)!`,
        );
      } else {
        toast.error(res?.error?.message || "Test generation failed.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Benchmark failed");
    } finally {
      setIsTestGenerating(false);
    }
  };

  const sortedProviders = [...providers].sort((a, b) => a.priority - b.priority);

  return (
    <div className="space-y-6">
      {/* Informational Guidance Alert */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-serif text-sm font-bold text-foreground">
              Intelligent Multi-Provider Presentation Visual Engine
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5 max-w-2xl">
              DocuMind supports 5 verified AI image-generation providers with priority ordering and automatic failover. When primary providers encounter rate limits or missing credentials, the system automatically cascades to subsequent providers and finishes with zero-failure contextual vector diagrams.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="hero"
          onClick={() => setTestGenModalOpen(true)}
          className="text-xs font-mono gap-1.5 shrink-0"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Run Prompt Test</span>
        </Button>
      </div>

      {/* 5 Provider Cards */}
      <div className="grid grid-cols-1 gap-5">
        {sortedProviders.map((p, idx) => {
          const isEditing = editingId === p.id;
          const isTesting = testingId === p.id;
          const isSaving = savingId === p.id;
          const testRes = testResults[p.id];
          const isKeyRevealed = Boolean(showKey[p.id]);

          return (
            <div
              key={p.id}
              className={`rounded-2xl border bg-card p-5 sm:p-6 shadow-xs transition-all ${
                p.enabled ? "border-border" : "border-border/60 opacity-80"
              }`}
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                <div className="flex items-center gap-3.5">
                  <div className="h-11 w-11 rounded-2xl bg-muted/80 border border-border flex items-center justify-center text-foreground font-bold shadow-xs">
                    <span className="font-mono text-sm font-bold text-primary">
                      #{p.priority}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif text-base font-bold text-foreground">
                        {p.name}
                      </h3>
                      {p.status === "ready" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          <CheckCircle2 className="h-3 w-3" /> Ready
                        </span>
                      )}
                      {p.status === "needs_key" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          <Key className="h-3 w-3" /> Needs Key
                        </span>
                      )}
                      {p.status === "error" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                          <AlertTriangle className="h-3 w-3" /> Error
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Selected Model: <code className="font-mono text-primary font-medium">{p.selectedModel}</code>
                    </p>
                  </div>
                </div>

                {/* Priority & Status Controls */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border">
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={idx === 0}
                      onClick={() => handleMovePriority(p, "up")}
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      title="Increase priority order"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={idx === sortedProviders.length - 1}
                      onClick={() => handleMovePriority(p, "down")}
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      title="Decrease priority order"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <Button
                    size="sm"
                    variant={p.enabled ? "hero" : "outline"}
                    onClick={() => handleToggleEnabled(p)}
                    className="h-8 px-3 text-xs font-mono font-semibold"
                  >
                    {p.enabled ? "Enabled" : "Disabled"}
                  </Button>
                </div>
              </div>

              {/* Card Body */}
              <div className="py-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Left Column: Free Tier & Quota info */}
                  <div className="space-y-2 p-3.5 rounded-xl border border-border/70 bg-muted/20">
                    <span className="font-mono text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">
                      Free Tier & Rate Limit Info
                    </span>
                    <p className="text-muted-foreground leading-relaxed text-xs">
                      {p.freeTierInfo}
                    </p>
                    {p.quotaInfo && (
                      <div className="pt-2 flex items-center justify-between border-t border-border/50 text-[11px] font-mono">
                        <span className="text-muted-foreground">Estimated Quota:</span>
                        <span className="font-semibold text-foreground">
                          {p.quotaInfo.remaining} / {p.quotaInfo.total} {p.quotaInfo.unit}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Credentials & Masking */}
                  <div className="space-y-2 p-3.5 rounded-xl border border-border/70 bg-muted/20">
                    <span className="font-mono text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">
                      Stored Credentials (Server Encrypted)
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-mono text-xs text-foreground bg-background px-2.5 py-1.5 rounded-lg border border-border flex-1 truncate">
                        {p.isConfigured ? (
                          isKeyRevealed ? p.apiKey : p.maskedKey || "••••••••••••••••"
                        ) : (
                          <span className="text-muted-foreground italic">No API key configured</span>
                        )}
                      </div>
                      {p.isConfigured && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => toggleShowKey(p.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title={isKeyRevealed ? "Hide key" : "Show masked key"}
                        >
                          {isKeyRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[11px] font-mono">
                      <span className="text-muted-foreground">Auto-Failover Eligible:</span>
                      <button
                        onClick={() => handleToggleFallback(p)}
                        className={`font-semibold underline ${p.fallbackEligible ? "text-emerald-600" : "text-amber-600"}`}
                      >
                        {p.fallbackEligible ? "Yes (Cascade Active)" : "No (Disabled)"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inline Edit Form when Opened */}
                {isEditing && (
                  <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-4 text-xs animate-in fade-in duration-200">
                    <div className="font-serif font-bold text-sm text-foreground">
                      Configure Settings for {p.name}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Model Selector */}
                      <div className="space-y-1.5">
                        <label className="font-mono text-[11px] text-muted-foreground font-semibold">
                          Image Generation Model
                        </label>
                        <select
                          value={editModel}
                          onChange={(e) => setEditModel(e.target.value)}
                          className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:ring-1 focus:ring-primary"
                        >
                          {p.supportedModels.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* API Key Input */}
                      <div className="space-y-1.5">
                        <label className="font-mono text-[11px] text-muted-foreground font-semibold">
                          API Secret / Token Key
                        </label>
                        <input
                          type="password"
                          value={editKey}
                          onChange={(e) => setEditKey(e.target.value)}
                          placeholder="Paste new API key..."
                          className="w-full h-9 rounded-lg border border-border bg-background px-3 font-mono text-xs text-foreground focus:ring-1 focus:ring-primary"
                        />
                      </div>

                      {/* Optional Endpoint / Account ID */}
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="font-mono text-[11px] text-muted-foreground font-semibold">
                          Endpoint URL or Account ID (Required for Cloudflare Workers AI)
                        </label>
                        <input
                          type="text"
                          value={editEndpoint}
                          onChange={(e) => setEditEndpoint(e.target.value)}
                          placeholder="e.g. Cloudflare Account ID or custom gateway URL..."
                          className="w-full h-9 rounded-lg border border-border bg-background px-3 font-mono text-xs text-foreground focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-primary/10">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="hero"
                        disabled={isSaving}
                        onClick={() => handleSaveProvider(p.id)}
                        className="text-xs font-mono gap-1"
                      >
                        {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        <span>Save Configuration</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Test Results Banner */}
                {testRes && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                      testRes.success
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                        : "border-rose-500/20 bg-rose-500/10 text-rose-800 dark:text-rose-300"
                    }`}
                  >
                    {testRes.success ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <span className="font-bold">
                        {testRes.success ? "Connection Verified" : "Verification Failed"} ({testRes.latencyMs}ms):
                      </span>{" "}
                      <span>{testRes.message}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
                <div className="text-[11px] font-mono text-muted-foreground">
                  Last Tested: {p.lastTestedAt ? new Date(p.lastTestedAt).toLocaleTimeString() : "Never"}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isTesting}
                    onClick={() => handleTestConnection(p.id)}
                    className="text-xs font-mono gap-1.5"
                  >
                    {isTesting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    <span>Test Connection</span>
                  </Button>

                  <Button
                    size="sm"
                    variant={isEditing ? "secondary" : "outline"}
                    onClick={() => (isEditing ? setEditingId(null) : handleStartEdit(p))}
                    className="text-xs font-mono gap-1.5"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    <span>{isEditing ? "Close" : "Configure"}</span>
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Prompt Testing Dialog */}
      {testGenModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-serif text-base font-bold text-foreground">
                  Presentation Visual Generation Playground
                </h3>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setTestGenModalOpen(false)}
                className="h-7 w-7 p-0"
              >
                ✕
              </Button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Test how DocuMind's multi-provider engine evaluates prompts, attempts primary providers, and cascades gracefully.
            </p>

            <div className="space-y-1.5">
              <label className="font-mono text-[11px] text-muted-foreground font-semibold">
                Test Prompt
              </label>
              <textarea
                rows={3}
                value={testGenPrompt}
                onChange={(e) => setTestGenPrompt(e.target.value)}
                className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground focus:ring-1 focus:ring-primary font-mono leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-muted-foreground">
                Aspect Ratio: <strong>16:9 Landscape</strong>
              </span>
              <Button
                size="sm"
                variant="hero"
                disabled={isTestGenerating || !testGenPrompt.trim()}
                onClick={handleRunTestGeneration}
                className="text-xs font-mono gap-1.5"
              >
                {isTestGenerating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                <span>Generate Test Visual</span>
              </Button>
            </div>

            {testGenResult && (
              <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3 pt-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-emerald-600 font-bold">
                    Provider: {testGenResult.provider} ({testGenResult.model})
                  </span>
                  <span className="text-muted-foreground">
                    Duration: {testGenResult.durationMs}ms
                  </span>
                </div>

                {testGenResult.imageUrl && (
                  <div className="rounded-lg overflow-hidden border border-border flex items-center justify-center bg-black/40 max-h-[220px]">
                    <img
                      src={testGenResult.imageUrl}
                      alt="Generated visual"
                      className="max-h-[210px] w-auto object-contain"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
