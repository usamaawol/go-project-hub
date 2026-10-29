import React, { useState, useEffect, useMemo } from "react";
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
  ShieldCheck,
  Loader2,
  Wand2,
  Settings,
  PlusCircle,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { type ProviderItem, DEFAULT_PROVIDER_ITEMS } from "../types";
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

// Client-side presentation storage helpers for resilient Vercel / serverless operation
function getLocalPresentationKeys(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("documind_presentation_ai_keys");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setLocalPresentationKey(providerId: string, key: string) {
  if (typeof window === "undefined") return;
  try {
    const current = getLocalPresentationKeys();
    current[providerId] = key.trim();
    localStorage.setItem("documind_presentation_ai_keys", JSON.stringify(current));
  } catch (err) {
    console.warn("Failed to write to localStorage:", err);
  }
}

function setAllLocalPresentationKeys(keys: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    const current = getLocalPresentationKeys();
    for (const [id, key] of Object.entries(keys)) {
      if (key && key.trim() && !key.includes("••••")) {
        current[id] = key.trim();
      }
    }
    localStorage.setItem("documind_presentation_ai_keys", JSON.stringify(current));
  } catch (err) {
    console.warn("Failed to write to localStorage:", err);
  }
}

/**
 * Intelligent detector that inspects the pattern and prefixes of any pasted API key
 */
export function detectProviderFromKey(key: string): {
  id: "gemini" | "huggingface" | "cloudflare" | "fal" | "replicate" | null;
  name: string;
  confidence: "high" | "medium" | "low";
  reason: string;
  recommendedModel: string;
} {
  const trimmed = key.trim();
  if (!trimmed) {
    return {
      id: null,
      name: "No key provided",
      confidence: "low",
      reason: "Paste an AI API key to detect its provider",
      recommendedModel: "",
    };
  }

  // Google Gemini API keys from Google AI Studio (studio.ai) or Cloud Vertex
  // Formats include:
  // 1. "AQ." or "AQ_..." (Newer paid / studio.ai keys, e.g. AQ.Ab8RN6IPKS...)
  // 2. "AIza..." (Standard 39-character key)
  if (
    trimmed.startsWith("AQ.") ||
    trimmed.startsWith("AQ_") ||
    trimmed.startsWith("AQ") ||
    trimmed.startsWith("AIza")
  ) {
    return {
      id: "gemini",
      name: "Google Gemini / Imagen 3",
      confidence: "high",
      reason: 'Detected Google AI Studio API key (starts with "AQ." or "AIza")',
      recommendedModel: "imagen-3.0-generate-002",
    };
  }

  // Hugging Face access tokens start with "hf_"
  if (trimmed.startsWith("hf_")) {
    return {
      id: "huggingface",
      name: "Hugging Face Inference",
      confidence: "high",
      reason: 'Detected Hugging Face user access token (starts with "hf_")',
      recommendedModel: "black-forest-labs/FLUX.1-schnell",
    };
  }

  // Replicate API tokens start with "r8_"
  if (trimmed.startsWith("r8_")) {
    return {
      id: "replicate",
      name: "Replicate (FLUX & SDXL)",
      confidence: "high",
      reason: 'Detected Replicate API token signature (starts with "r8_")',
      recommendedModel: "black-forest-labs/flux-schnell",
    };
  }

  // fal.ai keys start with "key_" or contain a colon "UUID:SECRET"
  if (trimmed.startsWith("key_") || (trimmed.includes(":") && trimmed.length >= 24)) {
    return {
      id: "fal",
      name: "fal.ai (FLUX / SDXL)",
      confidence: "high",
      reason: 'Detected fal.ai key format (contains ":" or "key_")',
      recommendedModel: "fal-ai/flux/schnell",
    };
  }

  // Cloudflare API tokens are usually 40 alphanumeric characters or start with "cf_"
  if (trimmed.startsWith("cf_") || /^[a-zA-Z0-9_-]{40}$/.test(trimmed)) {
    return {
      id: "cloudflare",
      name: "Cloudflare Workers AI",
      confidence: "medium",
      reason: "Detected 40-character Cloudflare Workers AI token pattern",
      recommendedModel: "@cf/bytedance/stable-diffusion-xl-lightning",
    };
  }

  return {
    id: null,
    name: "Unrecognized Provider",
    confidence: "low",
    reason: "No signature matched. Please select the provider manually below.",
    recommendedModel: "",
  };
}

export function AdminProvidersTab({
  providers,
  onRefresh,
  adminKey = "documind-admin-secret",
}: AdminProvidersTabProps) {
  // Guarantee all 5 providers are always present
  const effectiveProviders = useMemo(() => {
    if (!providers || providers.length === 0) return DEFAULT_PROVIDER_ITEMS;
    const existingIds = new Set(providers.map((p) => p.id));
    const missing = DEFAULT_PROVIDER_ITEMS.filter((dp) => !existingIds.has(dp.id));
    return [...providers, ...missing];
  }, [providers]);

  const [localKeys, setLocalKeys] = useState<Record<string, string>>({});
  useEffect(() => {
    setLocalKeys(getLocalPresentationKeys());
  }, []);

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

  // 1. Auto-Detect Single Key Modal State
  const [detectModalOpen, setDetectModalOpen] = useState(false);
  const [detectInputKey, setDetectInputKey] = useState("");
  const [detectSelectedProvider, setDetectSelectedProvider] = useState<string>("gemini");
  const [detectSelectedModel, setDetectSelectedModel] = useState<string>("imagen-3.0-generate-002");
  const [detectEndpoint, setDetectEndpoint] = useState<string>("");
  const [detectTesting, setDetectTesting] = useState(false);
  const [detectSaving, setDetectSaving] = useState(false);
  const [detectTestResult, setDetectTestResult] = useState<{
    success: boolean;
    latencyMs: number;
    message: string;
  } | null>(null);

  // 2. Manage All 5 Keys Modal State
  const [manageAllModalOpen, setManageAllModalOpen] = useState(false);
  const [allKeysForm, setAllKeysForm] = useState<Record<string, string>>({});
  const [manageAllSaving, setManageAllSaving] = useState(false);

  // 3. Benchmarking Playground Modal State
  const [testGenModalOpen, setTestGenModalOpen] = useState(false);
  const [testGenPrompt, setTestGenPrompt] = useState(
    "A clean architectural diagram of a microservices distributed messaging system, 16:9 presentation slide visual",
  );
  const [isTestGenerating, setIsTestGenerating] = useState(false);
  const [testGenResult, setTestGenResult] = useState<{
    imageUrl?: string;
    durationMs?: number;
    provider?: string;
    model?: string;
  } | null>(null);

  // Run real-time detection as user types in the detect modal
  const detection = useMemo(() => {
    return detectProviderFromKey(detectInputKey);
  }, [detectInputKey]);

  // Sync selected provider when detection confidence is high
  useEffect(() => {
    if (detection.id) {
      setDetectSelectedProvider(detection.id);
      if (detection.recommendedModel) {
        setDetectSelectedModel(detection.recommendedModel);
      }
    }
  }, [detection]);

  const toggleShowKey = (id: string) => {
    setShowKey((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStartEdit = (p: ProviderItem) => {
    setEditingId(p.id);
    const existingStored = localKeys[p.id] || p.maskedKey || "";
    setEditKey(existingStored);
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
        setLocalPresentationKey(id, editKey.trim());
        setLocalKeys((prev) => ({ ...prev, [id]: editKey.trim() }));
      }

      const res = await updateAdminImageProvider(id, updates, adminKey);
      if (res && res.success) {
        toast.success(`Provider "${id}" saved successfully! Ready for Presentation Maker.`);
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
    } catch {
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
    } catch {
      toast.error("Failed to update fallback eligibility");
    }
  };

  const handleMovePriority = async (p: ProviderItem, direction: "up" | "down") => {
    const sorted = [...effectiveProviders].sort((a, b) => a.priority - b.priority);
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
      const activeKey = apiKeyOverride || localKeys[id];
      const res = await testAdminImageProviderConnection(id, activeKey, adminKey);
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

  // Save detected key from Auto-Detect Modal
  const handleSaveDetectedKey = async () => {
    if (!detectInputKey.trim()) {
      toast.error("Please paste an API key first.");
      return;
    }
    setDetectSaving(true);
    try {
      const pid = detectSelectedProvider;
      setLocalPresentationKey(pid, detectInputKey.trim());
      setLocalKeys((prev) => ({ ...prev, [pid]: detectInputKey.trim() }));

      const updates: Record<string, any> = {
        apiKey: detectInputKey.trim(),
        selectedModel: detectSelectedModel,
        enabled: true,
      };
      if (detectEndpoint.trim()) {
        updates.endpointUrl = detectEndpoint.trim();
      }

      await updateAdminImageProvider(pid, updates, adminKey);

      const targetProviderName =
        effectiveProviders.find((x) => x.id === pid)?.name || detection.name || pid;
      toast.success(
        `Key configured for ${targetProviderName}! Presentation Maker is now ready to generate slide visuals.`,
      );
      setDetectModalOpen(false);
      setDetectInputKey("");
      setDetectTestResult(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Error saving key");
    } finally {
      setDetectSaving(false);
    }
  };

  // Test detected key from Auto-Detect Modal
  const handleTestDetectedKey = async () => {
    if (!detectInputKey.trim()) {
      toast.error("Please paste an API key to test.");
      return;
    }
    setDetectTestResult(null);
    setDetectTesting(true);
    try {
      const res = await testAdminImageProviderConnection(
        detectSelectedProvider,
        detectInputKey.trim(),
        adminKey,
      );
      if (res && res.data) {
        setDetectTestResult(res.data);
        if (res.data.success) {
          toast.success(`Verification Passed (${res.data.latencyMs}ms): ${res.data.message}`);
        } else {
          toast.error(`Verification Failed: ${res.data.message}`);
        }
      }
    } catch (err: any) {
      const msg = err?.message || "Failed to test connection";
      setDetectTestResult({ success: false, latencyMs: 0, message: msg });
      toast.error(msg);
    } finally {
      setDetectTesting(false);
    }
  };

  // Open "Manage All 5 Keys" modal
  const handleOpenManageAllModal = () => {
    const initial: Record<string, string> = {};
    for (const p of effectiveProviders) {
      initial[p.id] = localKeys[p.id] || "";
    }
    setAllKeysForm(initial);
    setManageAllModalOpen(true);
  };

  // Save all keys in bulk
  const handleSaveAllKeys = async () => {
    setManageAllSaving(true);
    try {
      setAllLocalPresentationKeys(allKeysForm);
      setLocalKeys((prev) => ({ ...prev, ...allKeysForm }));

      let savedCount = 0;
      for (const [id, key] of Object.entries(allKeysForm)) {
        if (key && key.trim() && !key.includes("••••")) {
          await updateAdminImageProvider(id, { apiKey: key.trim(), enabled: true }, adminKey);
          savedCount++;
        }
      }

      toast.success(
        `AI Keys saved successfully (${savedCount} updated)! Presentation Maker is ready to generate slides with images.`,
      );
      setManageAllModalOpen(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Error saving keys in bulk");
    } finally {
      setManageAllSaving(false);
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

  const sortedProviders = [...effectiveProviders].sort((a, b) => a.priority - b.priority);

  return (
    <div className="space-y-6">
      {/* Informational Guidance Banner with Prominent Key Management Buttons */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-serif text-sm font-bold text-foreground">
                Multi-Provider AI Presentation Visual Engine
              </h4>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="h-3 w-3" /> Presentation Maker Only
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1 max-w-2xl">
              Paste your AI API keys below. The intelligent auto-detector automatically identifies Gemini, Hugging Face, Replicate, fal.ai, or Cloudflare, and enables automatic failover. These keys are <strong>exclusively used for Presentation Maker slide visual generation</strong> and are never exposed to other tools.
            </p>
          </div>
        </div>

        {/* Top Action Control Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto">
          <Button
            size="sm"
            variant="hero"
            onClick={() => {
              setDetectInputKey("");
              setDetectModalOpen(true);
            }}
            className="text-xs font-mono gap-1.5 shadow-sm"
          >
            <Wand2 className="h-3.5 w-3.5" />
            <span>+ Add / Detect AI Key</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleOpenManageAllModal}
            className="text-xs font-mono gap-1.5 bg-background hover:bg-muted"
          >
            <Key className="h-3.5 w-3.5 text-primary" />
            <span>Manage All 5 Keys</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setTestGenModalOpen(true)}
            className="text-xs font-mono gap-1.5"
            title="Benchmark prompt generation"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Prompt Test</span>
          </Button>
        </div>
      </div>

      {/* 5 Provider Cards */}
      <div className="grid grid-cols-1 gap-5">
        {sortedProviders.map((p, idx) => {
          const isEditing = editingId === p.id;
          const isTesting = testingId === p.id;
          const isSaving = savingId === p.id;
          const testRes = testResults[p.id];
          const isKeyRevealed = Boolean(showKey[p.id]);
          const hasLocalKey = Boolean(localKeys[p.id]);
          const isConfigured = p.isConfigured || hasLocalKey;

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
                      {isConfigured && p.status !== "error" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          <CheckCircle2 className="h-3 w-3" /> Ready
                        </span>
                      )}
                      {!isConfigured && (
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
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                        Stored Key (Presentation Store)
                      </span>
                      {hasLocalKey && (
                        <span className="text-[10px] font-mono text-emerald-600 font-semibold">
                          Active in Browser
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-mono text-xs text-foreground bg-background px-2.5 py-1.5 rounded-lg border border-border flex-1 truncate">
                        {isConfigured ? (
                          isKeyRevealed
                            ? localKeys[p.id] || p.apiKey || "Key Configured"
                            : p.maskedKey || "••••••••••••••••"
                        ) : (
                          <span className="text-muted-foreground italic">No API key configured</span>
                        )}
                      </div>
                      {isConfigured && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => toggleShowKey(p.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                          title={isKeyRevealed ? "Hide key" : "Show key"}
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
                    <div className="flex items-center justify-between">
                      <div className="font-serif font-bold text-sm text-foreground">
                        Configure Settings for {p.name}
                      </div>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        Exclusively for Presentation Maker
                      </span>
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
                    variant="outline"
                    onClick={() => {
                      setDetectSelectedProvider(p.id);
                      setDetectSelectedModel(p.selectedModel);
                      setDetectInputKey(localKeys[p.id] || "");
                      setDetectModalOpen(true);
                    }}
                    className="text-xs font-mono gap-1.5 text-primary hover:text-primary"
                  >
                    <Key className="h-3.5 w-3.5" />
                    <span>Enter API Key</span>
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

      {/* ---------------------------------------------------------------------- */}
      {/* 1. Intelligent Single-Key Auto-Detector Modal                           */}
      {/* ---------------------------------------------------------------------- */}
      {detectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Wand2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-foreground">
                    Auto-Detect & Configure AI Provider Key
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Exclusively active for Presentation Maker slide visuals
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDetectModalOpen(false)}
                className="h-7 w-7 p-0 rounded-full"
              >
                ✕
              </Button>
            </div>

            {/* Paste Key Input */}
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] text-muted-foreground font-semibold flex items-center justify-between">
                <span>Paste Your AI API Key</span>
                <span className="text-[10px] text-primary">Gemini, HuggingFace, Replicate, fal.ai, Cloudflare</span>
              </label>
              <textarea
                rows={3}
                value={detectInputKey}
                onChange={(e) => setDetectInputKey(e.target.value)}
                placeholder="Paste key here (e.g. AIzaSy..., hf_..., r8_..., key_...)..."
                className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground focus:ring-1 focus:ring-primary font-mono leading-relaxed"
              />
            </div>

            {/* Live Auto-Detection Badge */}
            {detectInputKey.trim().length > 0 && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                  detection.id
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                    : "border-primary/20 bg-primary/5 text-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold">
                      {detection.id
                        ? `Detected: ${detection.name}`
                        : `Selected Provider: ${
                            effectiveProviders.find((x) => x.id === detectSelectedProvider)?.name ||
                            "Google Gemini"
                          }`}
                    </span>
                    <p className="text-[11px] opacity-90 mt-0.5">{detection.reason}</p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold shrink-0 ${
                    detection.id
                      ? "bg-emerald-600/20 text-emerald-700 dark:text-emerald-300"
                      : "bg-primary/20 text-primary"
                  }`}
                >
                  {detection.id ? "High Confidence" : "Assigned Provider"}
                </span>
              </div>
            )}

            {/* Provider and Model Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="font-mono text-[11px] text-muted-foreground font-semibold">
                  Target Provider
                </label>
                <select
                  value={detectSelectedProvider}
                  onChange={(e) => {
                    const chosen = e.target.value;
                    setDetectSelectedProvider(chosen);
                    const found = effectiveProviders.find((x) => x.id === chosen);
                    if (found && found.supportedModels[0]) {
                      setDetectSelectedModel(found.supportedModels[0]);
                    }
                  }}
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:ring-1 focus:ring-primary font-sans"
                >
                  {effectiveProviders.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-mono text-[11px] text-muted-foreground font-semibold">
                  Selected Model
                </label>
                <select
                  value={detectSelectedModel}
                  onChange={(e) => setDetectSelectedModel(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:ring-1 focus:ring-primary font-mono"
                >
                  {effectiveProviders
                    .find((x) => x.id === detectSelectedProvider)
                    ?.supportedModels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {detectSelectedProvider === "cloudflare" && (
              <div className="space-y-1">
                <label className="font-mono text-[11px] text-muted-foreground font-semibold">
                  Cloudflare Account ID (Required for Workers AI)
                </label>
                <input
                  type="text"
                  value={detectEndpoint}
                  onChange={(e) => setDetectEndpoint(e.target.value)}
                  placeholder="e.g. 8f6b1e... (Cloudflare Account ID)"
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 font-mono text-xs text-foreground focus:ring-1 focus:ring-primary"
                />
              </div>
            )}

            {/* Direct Verification Result Banner */}
            {detectTestResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in duration-150 ${
                  detectTestResult.success
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300"
                }`}
              >
                {detectTestResult.success ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <span className="font-bold">
                    {detectTestResult.success ? "Key Verified & Ready" : "Verification Failed"} (
                    {detectTestResult.latencyMs}ms):
                  </span>{" "}
                  <span>{detectTestResult.message}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <Button
                size="sm"
                variant="outline"
                disabled={detectTesting || !detectInputKey.trim()}
                onClick={handleTestDetectedKey}
                className="text-xs font-mono gap-1.5"
              >
                {detectTesting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                <span>Test Key</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDetectModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="hero"
                  disabled={detectSaving || !detectInputKey.trim()}
                  onClick={handleSaveDetectedKey}
                  className="text-xs font-mono gap-1.5"
                >
                  {detectSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  <span>Save for Presentation Maker</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 2. Manage All 5 Keys Modal                                             */}
      {/* ---------------------------------------------------------------------- */}
      {manageAllModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Key className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-foreground">
                    Manage All 5 AI Provider Keys
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Enter keys for each provider to enable multi-tiered fallback in Presentation Maker
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setManageAllModalOpen(false)}
                className="h-7 w-7 p-0 rounded-full"
              >
                ✕
              </Button>
            </div>

            <div className="space-y-3.5">
              {effectiveProviders.map((p) => {
                const currentVal = allKeysForm[p.id] || "";
                const isConfigured = p.isConfigured || Boolean(localKeys[p.id]);

                return (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">#{p.priority}</span>
                        <span className="font-serif text-xs font-bold text-foreground">{p.name}</span>
                        {isConfigured && (
                          <span className="text-[10px] font-mono text-emerald-600 font-semibold px-2 py-0.2 rounded-full bg-emerald-500/10">
                            Configured
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {p.selectedModel}
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        type="password"
                        value={currentVal}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAllKeysForm((prev) => ({ ...prev, [p.id]: val }));
                        }}
                        placeholder={
                          isConfigured
                            ? "•••••••••••••••• (Leave blank to keep current key)"
                            : `Enter API key for ${p.name}...`
                        }
                        className="w-full h-9 rounded-lg border border-border bg-background px-3 font-mono text-xs text-foreground focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-[11px] font-mono text-muted-foreground">
                Keys persist securely and apply exclusively to Presentation Maker.
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setManageAllModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="hero"
                  disabled={manageAllSaving}
                  onClick={handleSaveAllKeys}
                  className="text-xs font-mono gap-1.5"
                >
                  {manageAllSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  <span>Save All 5 Keys</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 3. Prompt Testing Dialog                                               */}
      {/* ---------------------------------------------------------------------- */}
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
