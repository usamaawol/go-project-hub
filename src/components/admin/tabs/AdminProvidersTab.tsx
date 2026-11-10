import React, { useState, useEffect, useMemo } from "react";
import {
  Cpu,
  Key,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Save,
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Wand2,
  Lock,
  RotateCcw,
  X,
  FileText,
  Server,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  type ProviderItem,
  type ProviderAlertItem,
  type AdminSystemSettingsState,
  DEFAULT_PROVIDER_ITEMS,
} from "../types";
import {
  updateAdminImageProvider,
  testAdminImageProviderConnection,
  testAdminGenerateImage,
  resetAdminProviderQuota,
  resetAllAdminProviderQuotas,
  updateAdminSettings,
  testAdminGeminiConnection,
  testAdminFallbackTextConnection,
  purgeLegacyBrowserProviderSecrets,
} from "@/lib/api-client";

interface AdminProvidersTabProps {
  providers: ProviderItem[];
  systemSettings?: AdminSystemSettingsState;
  onRefresh: () => void;
  adminKey?: string;
  backendReachable?: boolean | null;
  alerts?: ProviderAlertItem[];
  onResetQuota?: (providerId: string) => Promise<void> | void;
  onResetAllQuotas?: () => Promise<void> | void;
  onDismissAlert?: (alertId: string) => Promise<void> | void;
  onClearAlerts?: () => Promise<void> | void;
}

/**
 * Intelligent detector that inspects the pattern and prefixes of any pasted API key.
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

  if (
    trimmed.startsWith("AQ.") ||
    trimmed.startsWith("AQ_") ||
    trimmed.startsWith("AQ") ||
    trimmed.startsWith("AIza")
  ) {
    return {
      id: "gemini",
      name: "Google Gemini / AI Studio",
      confidence: "high",
      reason: 'Detected Google AI Studio API key (starts with "AQ." or "AIza")',
      recommendedModel: "gemini-3.8-flash",
    };
  }

  if (trimmed.startsWith("hf_")) {
    return {
      id: "huggingface",
      name: "Hugging Face Inference",
      confidence: "high",
      reason: 'Detected Hugging Face user access token (starts with "hf_")',
      recommendedModel: "black-forest-labs/FLUX.1-schnell",
    };
  }

  if (trimmed.startsWith("r8_")) {
    return {
      id: "replicate",
      name: "Replicate (FLUX & SDXL)",
      confidence: "high",
      reason: 'Detected Replicate API token signature (starts with "r8_")',
      recommendedModel: "black-forest-labs/flux-schnell",
    };
  }

  if (trimmed.startsWith("key_") || (trimmed.includes(":") && trimmed.length >= 24)) {
    return {
      id: "fal",
      name: "fal.ai (FLUX / SDXL)",
      confidence: "high",
      reason: 'Detected fal.ai key format (contains ":" or "key_")',
      recommendedModel: "fal-ai/flux/schnell",
    };
  }

  if (trimmed.startsWith("cf_") || /^[a-zA-Z0-9_-]{40}$/.test(trimmed)) {
    return {
      id: "cloudflare",
      name: "Cloudflare Workers AI",
      confidence: "medium",
      reason: "Detected 40-character Cloudflare Workers AI token pattern",
      recommendedModel: "@cf/black-forest-labs/flux-1-schnell",
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

function billingBadgeLabel(p: ProviderItem): { text: string; tone: string } {
  if (p.billingTier === "paid" || p.billingStatus === "paid_required") {
    return {
      text: "Paid Tier Required (Disabled Default)",
      tone: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
    };
  }
  if (p.billingStatus === "free_credits_then_paid") {
    return {
      text: "Free Credits (~$0.10/mo), Paid Thereafter",
      tone: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20",
    };
  }
  return {
    text: "Free Tier (No Billing)",
    tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  };
}

function keySourceLabel(source?: string): string {
  switch (source) {
    case "env":
      return "Server Env Variable";
    case "firestore":
      return "Encrypted Firestore Vault";
    case "server_vault":
      return "Encrypted Server Vault";
    default:
      return "Not Configured";
  }
}

export function AdminProvidersTab({
  providers,
  systemSettings,
  onRefresh,
  adminKey = "documind-admin-secret",
  backendReachable = null,
  alerts = [],
  onResetQuota,
  onResetAllQuotas,
  onDismissAlert,
  onClearAlerts,
}: AdminProvidersTabProps) {
  const effectiveProviders = useMemo(() => {
    if (!providers || providers.length === 0) return DEFAULT_PROVIDER_ITEMS;
    const existingIds = new Set(providers.map((p) => p.id));
    const missing = DEFAULT_PROVIDER_ITEMS.filter((dp) => !existingIds.has(dp.id));
    return [...providers, ...missing];
  }, [providers]);

  // Security cleanup: detect and purge any legacy browser-stored keys
  const [exposedBrowserProviders, setExposedBrowserProviders] = useState<string[]>([]);
  useEffect(() => {
    const purged = purgeLegacyBrowserProviderSecrets();
    if (purged.length > 0) {
      setExposedBrowserProviders(purged);
    }
  }, []);

  // Text & Free Fallback Configuration State
  const [primaryTextModel, setPrimaryTextModel] = useState(
    systemSettings?.geminiModel || "gemini-3.8-flash",
  );
  const [fallbackProvider, setFallbackProvider] = useState<
    "none" | "groq" | "openrouter" | "ollama" | "offline"
  >(systemSettings?.fallbackTextProvider || "none");
  const [fallbackModel, setFallbackModel] = useState(
    systemSettings?.fallbackTextModel || "llama-3.3-70b-versatile",
  );
  const [fallbackKeyInput, setFallbackKeyInput] = useState("");
  const [ollamaUrl, setOllamaUrl] = useState(
    systemSettings?.ollamaBaseUrl || "http://localhost:11434",
  );
  const [savingTextConfig, setSavingTextConfig] = useState(false);
  const [testingGeminiFull, setTestingGeminiFull] = useState(false);
  const [geminiFullResult, setGeminiFullResult] = useState<{
    success: boolean;
    latencyMs: number;
    model?: string;
    message: string;
    capabilities?: { text: boolean; json: boolean; pdf?: boolean };
  } | null>(null);
  const [testingFallback, setTestingFallback] = useState(false);
  const [fallbackTestResult, setFallbackTestResult] = useState<{
    success: boolean;
    latencyMs: number;
    model?: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (systemSettings?.geminiModel) setPrimaryTextModel(systemSettings.geminiModel);
    if (systemSettings?.fallbackTextProvider) setFallbackProvider(systemSettings.fallbackTextProvider);
    if (systemSettings?.fallbackTextModel) setFallbackModel(systemSettings.fallbackTextModel);
    if (systemSettings?.ollamaBaseUrl) setOllamaUrl(systemSettings.ollamaBaseUrl);
  }, [
    systemSettings?.geminiModel,
    systemSettings?.fallbackTextProvider,
    systemSettings?.fallbackTextModel,
    systemSettings?.ollamaBaseUrl,
  ]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKey, setEditKey] = useState("");
  const [editEndpoint, setEditEndpoint] = useState("");
  const [editModel, setEditModel] = useState("");
  const [testingId, setTestingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [resettingQuotaId, setResettingQuotaId] = useState<string | null>(null);
  const [resettingAllQuotas, setResettingAllQuotas] = useState(false);
  const [testResults, setTestResults] = useState<
    Record<string, { success: boolean; latencyMs: number; message: string; testedModel?: string }>
  >({});

  // 1. Auto-Detect / Key Configuration Modal State
  const [detectModalOpen, setDetectModalOpen] = useState(false);
  const [detectInputKey, setDetectInputKey] = useState("");
  const [detectSelectedProvider, setDetectSelectedProvider] = useState<string>("gemini");
  const [detectSelectedModel, setDetectSelectedModel] = useState<string>("gemini-3.8-flash");
  const [detectEndpoint, setDetectEndpoint] = useState<string>("");
  const [detectTesting, setDetectTesting] = useState(false);
  const [detectSaving, setDetectSaving] = useState(false);
  const [detectTestResult, setDetectTestResult] = useState<{
    success: boolean;
    latencyMs: number;
    message: string;
    testedModel?: string;
  } | null>(null);

  // 2. Manage All Keys Modal State (input-only: never loads existing secrets back to browser)
  const [manageAllModalOpen, setManageAllModalOpen] = useState(false);
  const [allKeysForm, setAllKeysForm] = useState<Record<string, string>>({});
  const [manageAllSaving, setManageAllSaving] = useState(false);

  // 3. Benchmarking Playground Modal State (supports testing a single provider independently)
  const [testGenModalOpen, setTestGenModalOpen] = useState(false);
  const [testGenProviderId, setTestGenProviderId] = useState<string>("huggingface");
  const [testGenPrompt, setTestGenPrompt] = useState(
    "A clean architectural diagram of a distributed database system, 16:9 presentation visual",
  );
  const [isTestGenerating, setIsTestGenerating] = useState(false);
  const [testGenResult, setTestGenResult] = useState<{
    imageUrl?: string;
    durationMs?: number;
    provider?: string;
    model?: string;
    error?: string;
  } | null>(null);

  const detection = useMemo(() => detectProviderFromKey(detectInputKey), [detectInputKey]);

  useEffect(() => {
    if (detection.id) {
      setDetectSelectedProvider(detection.id);
      setDetectTestResult(null);
      if (detection.recommendedModel) {
        setDetectSelectedModel(detection.recommendedModel);
      }
    }
  }, [detection]);

  const handleSaveTextConfig = async () => {
    setSavingTextConfig(true);
    try {
      const payload: Record<string, any> = {
        activeProvider: "gemini",
        geminiModel: primaryTextModel,
        fallbackTextProvider: fallbackProvider,
        fallbackTextModel: fallbackModel,
        ollamaBaseUrl: ollamaUrl,
      };
      if (fallbackKeyInput.trim() && !fallbackKeyInput.includes("••••")) {
        if (fallbackProvider === "groq") payload.groqApiKey = fallbackKeyInput.trim();
        if (fallbackProvider === "openrouter") payload.openrouterApiKey = fallbackKeyInput.trim();
      }
      const res = await updateAdminSettings(payload, adminKey);
      if (res?.success) {
        setFallbackKeyInput("");
        toast.success("Presentation Maker text & free fallback configuration saved server-side.");
        onRefresh();
      } else {
        toast.error(res?.error?.message || "Failed to save text configuration.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed saving configuration");
    } finally {
      setSavingTextConfig(false);
    }
  };

  const handleVerifyGeminiFull = async (testPdf: boolean) => {
    setTestingGeminiFull(true);
    setGeminiFullResult(null);
    try {
      const res = await testAdminGeminiConnection(undefined, adminKey, primaryTextModel, testPdf);
      if (res?.data) {
        setGeminiFullResult(res.data);
        if (res.data.success) {
          toast.success(res.data.message);
        } else {
          toast.error(res.data.message);
        }
        onRefresh();
      }
    } catch (err: any) {
      toast.error(err?.message || "Gemini verification failed");
    } finally {
      setTestingGeminiFull(false);
    }
  };

  const handleTestFallbackText = async () => {
    setTestingFallback(true);
    setFallbackTestResult(null);
    try {
      const res = await testAdminFallbackTextConnection(
        {
          provider: fallbackProvider,
          apiKey: fallbackKeyInput.trim() || undefined,
          model: fallbackModel,
          baseUrl: ollamaUrl,
        },
        adminKey,
      );
      if (res?.data) {
        setFallbackTestResult(res.data);
        if (res.data.success) {
          toast.success(res.data.message);
        } else {
          toast.error(res.data.message);
        }
        onRefresh();
      }
    } catch (err: any) {
      toast.error(err?.message || "Fallback test failed");
    } finally {
      setTestingFallback(false);
    }
  };

  const handleStartEdit = (p: ProviderItem) => {
    setEditingId(p.id);
    // Security: Never prefill or return secret keys in browser inputs
    setEditKey("");
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
      if (editKey.trim() && !editKey.includes("••••")) {
        updates.apiKey = editKey.trim();
      }

      const res = await updateAdminImageProvider(id, updates, adminKey);
      if (res && res.success) {
        setTestResults((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        toast.success(
          `Saved "${id}" configuration securely on the server. Click "Test Connection" to verify "${editModel}".`,
        );
        setEditingId(null);
        setEditKey("");
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

  const handleClearStoredKey = async (p: ProviderItem) => {
    if (!window.confirm(`Clear the server-stored API key for ${p.name}?`)) return;
    try {
      const res = await updateAdminImageProvider(p.id, { apiKey: "" }, adminKey);
      if (res?.success) {
        toast.success(`Cleared stored key for ${p.name}.`);
        onRefresh();
      } else {
        toast.error(res?.error?.message || `Failed to clear key for ${p.name}`);
      }
    } catch {
      toast.error(`Failed to clear key for ${p.name}`);
    }
  };

  const handleToggleEnabled = async (p: ProviderItem) => {
    if (p.billingTier === "paid" && !p.enabled && !systemSettings?.allowPaidProviders) {
      toast.error(
        `"${p.name}" requires paid billing and is locked under the Free-First policy. Approve Paid Providers in Visual Controls first if desired.`,
      );
      return;
    }
    try {
      const newEnabled = !p.enabled;
      const res = await updateAdminImageProvider(p.id, { enabled: newEnabled }, adminKey);
      if (res && res.success) {
        toast.success(
          `Provider "${p.name}" ${newEnabled ? "enabled" : "disabled"} for Presentation Maker.`,
        );
        onRefresh();
      } else {
        toast.error(res?.error?.message || "Failed to toggle provider status");
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
      } else {
        toast.error(res?.error?.message || "Failed to update fallback eligibility");
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
      const res1 = await updateAdminImageProvider(p.id, { priority: targetItem.priority }, adminKey);
      const res2 = await updateAdminImageProvider(targetItem.id, { priority: p.priority }, adminKey);
      if (!res1?.success || !res2?.success) {
        toast.error(res1?.error?.message || res2?.error?.message || "Failed to reorder priority");
        return;
      }
      toast.success(`Priority updated: ${p.name} is now #${targetIdx + 1}`);
      onRefresh();
    } catch {
      toast.error("Failed to reorder priority");
    }
  };

  const handleTestConnection = async (p: ProviderItem) => {
    const modelToTest = editingId === p.id ? editModel : p.selectedModel;
    const endpointToTest = editingId === p.id ? editEndpoint : p.endpointUrl;
    const keyOverride =
      editingId === p.id && editKey.trim() && !editKey.includes("••••")
        ? editKey.trim()
        : undefined;

    setTestingId(p.id);
    try {
      const res = await testAdminImageProviderConnection(p.id, keyOverride, adminKey, {
        selectedModel: modelToTest,
        endpointUrl: endpointToTest,
      });
      if (res && res.data) {
        setTestResults((prev) => ({
          ...prev,
          [p.id]: {
            success: res.data.success,
            latencyMs: res.data.latencyMs,
            message: res.data.message,
            testedModel: res.data.testedModel || modelToTest,
          },
        }));
        if (res.data.success) {
          toast.success(`${p.name} (${modelToTest}) verified (${res.data.latencyMs}ms)`);
        } else {
          toast.error(`${p.name} test failed: ${res.data.message}`);
        }
        onRefresh();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to execute connection test");
    } finally {
      setTestingId(null);
    }
  };

  const handleResetQuota = async (id: string, name: string) => {
    setResettingQuotaId(id);
    try {
      if (onResetQuota) {
        await onResetQuota(id);
      } else {
        await resetAdminProviderQuota(id, adminKey);
      }
      toast.success(`Application usage counter for "${name}" reset to 0.`);
      onRefresh();
    } catch {
      toast.error(`Failed to reset app usage counter for ${name}`);
    } finally {
      setResettingQuotaId(null);
    }
  };

  const handleResetAllQuotas = async () => {
    setResettingAllQuotas(true);
    try {
      if (onResetAllQuotas) {
        await onResetAllQuotas();
      } else {
        await resetAllAdminProviderQuotas(adminKey);
      }
      toast.success("All application tracking counters reset to 0.");
      onRefresh();
    } catch {
      toast.error("Failed to reset application counters");
    } finally {
      setResettingAllQuotas(false);
    }
  };

  const handleSaveDetectedKey = async () => {
    if (!detectInputKey.trim()) {
      toast.error("Please paste an API key first.");
      return;
    }
    setDetectSaving(true);
    try {
      const pid = detectSelectedProvider;
      const updates: Record<string, any> = {
        apiKey: detectInputKey.trim(),
        selectedModel: detectSelectedModel,
        enabled: true,
      };
      if (detectEndpoint.trim()) {
        updates.endpointUrl = detectEndpoint.trim();
      }

      const res = await updateAdminImageProvider(pid, updates, adminKey);
      if (!res?.success) {
        toast.error(res?.error?.message || "Failed to save key server-side.");
        return;
      }

      const targetProviderName =
        effectiveProviders.find((x) => x.id === pid)?.name || detection.name || pid;
      toast.success(
        `Key saved server-side for ${targetProviderName}. Run "Test Connection" to confirm model access.`,
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
        {
          selectedModel: detectSelectedModel,
          endpointUrl: detectEndpoint.trim() || undefined,
        },
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

  const handleOpenManageAllModal = () => {
    setAllKeysForm({});
    setManageAllModalOpen(true);
  };

  const handleSaveAllKeys = async () => {
    setManageAllSaving(true);
    try {
      let savedCount = 0;
      for (const [id, key] of Object.entries(allKeysForm)) {
        if (key && key.trim() && !key.includes("••••")) {
          const target = effectiveProviders.find((p) => p.id === id);
          const enableOnSave = target?.billingTier !== "paid" || Boolean(systemSettings?.allowPaidProviders);
          const res = await updateAdminImageProvider(
            id,
            { apiKey: key.trim(), enabled: enableOnSave },
            adminKey,
          );
          if (!res?.success) {
            toast.error(res?.error?.message || `Failed to save key for ${id} on server.`);
            return;
          }
          savedCount++;
        }
      }

      if (savedCount === 0) {
        toast.info("No new non-masked keys were entered.");
        return;
      }

      toast.success(
        `Saved ${savedCount} key(s) securely on the server & encrypted Firestore vault. Click "Test Connection" on each provider to verify.`,
      );
      setManageAllModalOpen(false);
      setAllKeysForm({});
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
      const selectedTarget = testGenProviderId === "auto" ? undefined : testGenProviderId;
      const res = await testAdminGenerateImage(testGenPrompt, "16:9", adminKey, selectedTarget);
      if (res && res.success && res.data) {
        setTestGenResult(res.data);
        toast.success(`Visual generated via ${res.data.provider} (${res.data.model})`);
        onRefresh();
      } else {
        const msg = res?.data?.error || res?.error?.message || "Provider generation test failed.";
        setTestGenResult(res?.data || { error: msg });
        toast.error(msg);
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
      {/* Backend API Offline Warning */}
      {backendReachable === false && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-1.5 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <h4 className="font-serif font-bold text-amber-900 dark:text-amber-300">
                Backend API Server (`/api`) Offline — Keys Cannot Be Loaded or Saved to Firestore
              </h4>
              <p className="text-amber-800 dark:text-amber-200/90 leading-relaxed">
                The Admin Dashboard could not reach the Express API server. Because API keys are encrypted and stored strictly server-side (`serverSecrets`), changes made while `/api` is offline are <strong>not persisted</strong>. Start the backend (`npm run server` on port 5000 alongside `npm run dev`) and click Refresh.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Critical Security Notice if Legacy Browser-Stored Keys were Purged */}
      {exposedBrowserProviders.length > 0 && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 space-y-2 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <h4 className="font-serif font-bold text-rose-800 dark:text-rose-300">
                  Security Action Recommended: Legacy Browser-Stored API Keys Purged
                </h4>
                <p className="text-rose-700 dark:text-rose-300/90 leading-relaxed">
                  Earlier keys for{" "}
                  <strong>{exposedBrowserProviders.join(", ")}</strong> were detected in browser{" "}
                  <code>localStorage</code> and automatically deleted for security. Any key previously stored in browser storage should be{" "}
                  <strong>rotated in your provider dashboard</strong> (Google AI Studio / Hugging Face) and re-entered below so it is stored strictly server-side.
                </p>
              </div>
            </div>
            <button
              onClick={() => setExposedBrowserProviders([])}
              className="text-rose-600 hover:text-rose-800"
              title="Dismiss security notice"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Informational Header & Server-Side Vault Guarantee */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-serif text-sm font-bold text-foreground">
                Presentation Maker AI Providers (Free-First & Server-Only Secrets)
              </h4>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="h-3 w-3" /> Presentation Maker Only
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                <Lock className="h-3 w-3" />{" "}
                {systemSettings?.allowPaidProviders ? "Paid Override Enabled" : "Free-First Locked"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1 max-w-2xl">
              API keys are stored encrypted on the backend server (or server env) and are never written to browser storage or exposed to client state. Paid services (Imagen 3, OpenAI, fal.ai, Replicate) remain disabled unless explicitly approved.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto">
          <Button
            size="sm"
            variant="hero"
            onClick={() => {
              setDetectInputKey("");
              setDetectTestResult(null);
              setDetectSelectedProvider("gemini");
              setDetectSelectedModel("gemini-3.8-flash");
              setDetectModalOpen(true);
            }}
            className="text-xs font-mono gap-1.5 shadow-sm"
          >
            <Wand2 className="h-3.5 w-3.5" />
            <span>+ Add / Rotate Key</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleOpenManageAllModal}
            className="text-xs font-mono gap-1.5 bg-background hover:bg-muted"
          >
            <Key className="h-3.5 w-3.5 text-primary" />
            <span>Set Server Keys</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setTestGenResult(null);
              setTestGenModalOpen(true);
            }}
            className="text-xs font-mono gap-1.5"
            title="Test image generation independently per provider"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Independent Image Test</span>
          </Button>
        </div>
      </div>

      {/* Primary Text Engine (Gemini 3.8 Flash) & Explicit Free Fallback Configuration */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
          <div>
            <h4 className="font-serif text-sm font-bold text-foreground flex items-center gap-2">
              <Server className="h-4 w-4 text-primary" />
              <span>Presentation Maker Primary Text & Structured JSON Engine</span>
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Primary: Google Gemini 3.8 Flash (v1beta API, Text + Structured JSON + PDF understanding). Falls back only to an explicitly configured free provider.
            </p>
          </div>
          <Button
            size="sm"
            variant="hero"
            disabled={savingTextConfig}
            onClick={handleSaveTextConfig}
            className="text-xs font-mono gap-1.5 shrink-0"
          >
            {savingTextConfig ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span>Save Text Engine</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Primary Gemini Text Config */}
          <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold uppercase text-muted-foreground">
                Primary Free Text Model (Google Gemini)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                Free Tier Default
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[11px] text-muted-foreground font-semibold">
                Gemini Text / Multimodal Model
              </label>
              <select
                value={primaryTextModel}
                onChange={(e) => setPrimaryTextModel(e.target.value)}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 font-mono text-xs text-foreground focus:ring-1 focus:ring-primary"
              >
                <option value="gemini-3.8-flash">gemini-3.8-flash (Recommended Free Tier)</option>
                <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (Fast / Lightweight)</option>
                <option value="gemini-3-flash-preview">gemini-3-flash-preview</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                disabled={testingGeminiFull}
                onClick={() => handleVerifyGeminiFull(false)}
                className="text-xs font-mono gap-1.5"
              >
                {testingGeminiFull ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                <span>Test Text + JSON</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={testingGeminiFull}
                onClick={() => handleVerifyGeminiFull(true)}
                className="text-xs font-mono gap-1.5"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Test Text + JSON + PDF</span>
              </Button>
            </div>

            {(geminiFullResult || systemSettings?.geminiLastTest) && (
              <div
                className={`p-2.5 rounded-lg border text-[11px] font-mono ${
                  (geminiFullResult || systemSettings?.geminiLastTest)!.success
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                    : "border-rose-500/20 bg-rose-500/10 text-rose-800 dark:text-rose-300"
                }`}
              >
                {(geminiFullResult || systemSettings?.geminiLastTest)!.message}
              </div>
            )}
          </div>

          {/* Explicit Free Fallback Text Provider */}
          <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold uppercase text-muted-foreground">
                Explicit Free Fallback Text Provider
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                Used only if Gemini free quota/API fails
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="font-mono text-[11px] text-muted-foreground font-semibold">
                  Fallback Provider
                </label>
                <select
                  value={fallbackProvider}
                  onChange={(e) => {
                    const next = e.target.value as any;
                    setFallbackProvider(next);
                    setFallbackTestResult(null);
                    if (next === "groq") setFallbackModel("llama-3.3-70b-versatile");
                    if (next === "openrouter") setFallbackModel("meta-llama/llama-3.3-70b-instruct:free");
                    if (next === "ollama") setFallbackModel("llama3.2");
                  }}
                  className="w-full h-9 rounded-lg border border-border bg-background px-2.5 font-mono text-xs text-foreground focus:ring-1 focus:ring-primary"
                >
                  <option value="none">None (Stop / Use Deterministic Engine)</option>
                  <option value="groq">Groq Free Tier</option>
                  <option value="openrouter">OpenRouter (:free models only)</option>
                  <option value="ollama">Ollama Local (100% Free Offline)</option>
                  <option value="offline">Local Deterministic Parser</option>
                </select>
              </div>

              {fallbackProvider !== "none" && fallbackProvider !== "offline" && (
                <div className="space-y-1">
                  <label className="font-mono text-[11px] text-muted-foreground font-semibold">
                    Model ID
                  </label>
                  <input
                    type="text"
                    value={fallbackModel}
                    onChange={(e) => setFallbackModel(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border bg-background px-2.5 font-mono text-xs text-foreground"
                  />
                </div>
              )}
            </div>

            {(fallbackProvider === "groq" || fallbackProvider === "openrouter") && (
              <div className="space-y-1">
                <label className="font-mono text-[11px] text-muted-foreground font-semibold">
                  {fallbackProvider === "groq" ? "Groq API Key (Server-Side Only)" : "OpenRouter API Key (Server-Side Only)"}
                </label>
                <input
                  type="password"
                  value={fallbackKeyInput}
                  onChange={(e) => setFallbackKeyInput(e.target.value)}
                  placeholder={
                    (fallbackProvider === "groq" && systemSettings?.hasGroqKeyConfigured) ||
                    (fallbackProvider === "openrouter" && systemSettings?.hasOpenRouterKeyConfigured)
                      ? "Configured securely on server — enter new key to rotate"
                      : "Enter key..."
                  }
                  className="w-full h-9 rounded-lg border border-border bg-background px-2.5 font-mono text-xs text-foreground"
                />
              </div>
            )}

            {fallbackProvider === "ollama" && (
              <div className="space-y-1">
                <label className="font-mono text-[11px] text-muted-foreground font-semibold">
                  Local Ollama Base URL
                </label>
                <input
                  type="text"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border bg-background px-2.5 font-mono text-xs text-foreground"
                />
              </div>
            )}

            {fallbackProvider !== "none" && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={testingFallback}
                  onClick={handleTestFallbackText}
                  className="text-xs font-mono gap-1.5"
                >
                  {testingFallback ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  <span>Test Fallback Provider</span>
                </Button>
              </div>
            )}

            {(fallbackTestResult || systemSettings?.fallbackLastTest) && (
              <div
                className={`p-2.5 rounded-lg border text-[11px] font-mono ${
                  (fallbackTestResult || systemSettings?.fallbackLastTest)!.success
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                    : "border-rose-500/20 bg-rose-500/10 text-rose-800 dark:text-rose-300"
                }`}
              >
                {(fallbackTestResult || systemSettings?.fallbackLastTest)!.message}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Priority Cascade Chain Visualizer */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="font-serif text-sm font-bold text-foreground flex items-center gap-2">
              <span>Visual Provider Priority & Failover Order</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Free Providers Only Unless Unlocked
              </span>
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Each provider is tested independently with its own endpoint and selected model. When external free image quotas finish, Presentation Maker uses its zero-cost programmatic SVG/diagram engine.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleResetAllQuotas}
            disabled={resettingAllQuotas}
            className="text-xs font-mono gap-1.5 shrink-0"
            title="Reset DocuMind local request counters (does not change provider-side limits)"
          >
            <RotateCcw className={`h-3 w-3 ${resettingAllQuotas ? "animate-spin text-primary" : ""}`} />
            <span>Reset App Counters</span>
          </Button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto py-2 px-1">
          {sortedProviders.map((prov, index) => {
            const isVerified = prov.status === "ready";
            const isPaidBlocked = prov.status === "paid_disabled";
            const isDepleted = prov.status === "rate_limited" || prov.quotaInfo?.remaining === 0;
            return (
              <React.Fragment key={prov.id}>
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-mono shrink-0 shadow-xs transition-all ${
                    isPaidBlocked
                      ? "border-border bg-muted/30 text-muted-foreground opacity-60"
                      : isDepleted
                      ? "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                      : isVerified && prov.enabled
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                      : prov.isConfigured
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                      : "border-border bg-muted/40 text-muted-foreground opacity-75"
                  }`}
                >
                  <span className="font-bold text-[10px] px-1.5 py-0.5 rounded bg-background/80 border border-border/60">
                    #{prov.priority}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-semibold truncate max-w-[140px]">{prov.name.split("/")[0]}</span>
                    <span className="text-[10px] opacity-85">
                      {isPaidBlocked
                        ? "Paid (Locked)"
                        : prov.status === "error"
                        ? "Test Failed"
                        : isDepleted
                        ? "Rate Limited"
                        : isVerified
                        ? "Verified Ready"
                        : prov.isConfigured
                        ? "Untested"
                        : "Needs Key"}
                    </span>
                  </div>
                </div>
                {index < sortedProviders.length - 1 && (
                  <span className="text-muted-foreground font-mono text-xs shrink-0 select-none">
                    ──►
                  </span>
                )}
              </React.Fragment>
            );
          })}
          <span className="text-muted-foreground font-mono text-xs shrink-0 select-none">
            ──►
          </span>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs font-mono shrink-0 shadow-xs">
            <span className="font-bold text-[10px] px-1.5 py-0.5 rounded bg-background/80 border border-border/60">
              $0
            </span>
            <div className="flex flex-col">
              <span className="font-semibold">Programmatic Engine</span>
              <span className="text-[10px] opacity-80">Editable Diagrams & SVG</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Alerts Banner */}
      {alerts && alerts.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Active Provider Alerts & Quota Notifications</span>
            </div>
            {onClearAlerts && (
              <button
                onClick={onClearAlerts}
                className="text-[11px] font-mono text-amber-800 dark:text-amber-400 hover:underline"
              >
                Dismiss All
              </button>
            )}
          </div>
          <div className="space-y-2 pt-1">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-background/80 border border-amber-500/20 text-xs"
              >
                <div>
                  <span className="font-bold text-foreground">{alert.title}: </span>
                  <span className="text-muted-foreground">{alert.message}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleResetQuota(alert.providerId, alert.providerName)}
                    className="h-7 px-2 text-[11px] font-mono gap-1 text-primary hover:text-primary"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reset App Counter</span>
                  </Button>
                  {onDismissAlert && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDismissAlert(alert.id)}
                      className="h-7 px-1.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5 Provider Cards */}
      <div className="grid grid-cols-1 gap-5">
        {sortedProviders.map((p, idx) => {
          const isEditing = editingId === p.id;
          const isTesting = testingId === p.id;
          const isSaving = savingId === p.id;
          const testRes = testResults[p.id];
          const billingBadge = billingBadgeLabel(p);
          const q = p.quotaInfo;
          const appCap = q?.appLimit ?? q?.total;
          const appUsed = q?.used ?? 0;
          const appRemaining = typeof appCap === "number" ? Math.max(0, appCap - appUsed) : q?.remaining;

          return (
            <div
              key={p.id}
              className={`rounded-2xl border bg-card p-5 sm:p-6 shadow-xs transition-all ${
                p.enabled ? "border-border" : "border-border/60 opacity-85"
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
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-serif text-base font-bold text-foreground">
                        {p.name}
                      </h3>

                      {p.status === "ready" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          <CheckCircle2 className="h-3 w-3" /> Ready (Verified)
                        </span>
                      )}
                      {p.status === "untested" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                          <RefreshCw className="h-3 w-3" /> Untested — Click Test Connection
                        </span>
                      )}
                      {p.status === "needs_key" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          <Key className="h-3 w-3" /> Needs Server Key
                        </span>
                      )}
                      {p.status === "paid_disabled" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-muted text-muted-foreground border border-border">
                          <Lock className="h-3 w-3" /> Paid Disabled
                        </span>
                      )}
                      {(p.status === "error" || p.status === "rate_limited") && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                          <AlertTriangle className="h-3 w-3" />{" "}
                          {p.status === "rate_limited" ? "Rate Limited" : "Verification Error"}
                        </span>
                      )}

                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${billingBadge.tone}`}
                      >
                        {billingBadge.text}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Selected Model:{" "}
                      <code className="font-mono text-primary font-medium">{p.selectedModel}</code>
                      {p.paidModels?.includes(p.selectedModel) && (
                        <span className="ml-2 text-[10px] font-mono text-rose-600 font-semibold">
                          (Paid Tier Required — Blocked Unless Approved)
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Priority & Enable Controls */}
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

              {/* Card Body: Quota Accuracy + Server-Side Credentials */}
              <div className="py-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Left: Separated Official Limits vs App Tracking */}
                  <div className="space-y-2 p-3.5 rounded-xl border border-border/70 bg-muted/20">
                    <span className="font-mono text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">
                      Official Limits vs Application Usage Tracking
                    </span>
                    <p className="text-muted-foreground leading-relaxed text-[11px]">
                      {p.freeTierInfo}
                    </p>

                    <div className="pt-2 space-y-1.5 border-t border-border/50 text-[11px] font-mono">
                      <div>
                        <span className="text-muted-foreground">Official Provider Limit: </span>
                        <span className="text-foreground">
                          {q?.officialRemaining !== null && q?.officialRemaining !== undefined && typeof q?.officialLimit === "number"
                            ? `${q.officialRemaining} / ${q.officialLimit} (via ${q.officialSource})`
                            : q?.officialLimitText || "Not exposed by provider API"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">App Usage Counter (Estimate):</span>
                        <span className="font-semibold text-foreground">
                          {appUsed} consumed
                          {typeof appCap === "number"
                            ? ` • ${appRemaining} / ${appCap} ${q?.unit || "calls"} app limit remaining`
                            : ""}
                        </span>
                      </div>

                      {typeof appRemaining === "number" && typeof appCap === "number" && (
                        <div className="w-full bg-muted/80 rounded-full h-1.5 overflow-hidden border border-border/40">
                          <div
                            className={`h-full transition-all duration-300 ${
                              appRemaining === 0
                                ? "bg-rose-500"
                                : appRemaining <= Math.ceil(appCap * 0.2)
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(0, Math.round((appRemaining / (appCap || 1)) * 100)),
                              )}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Server-Side Secret Vault & Last Verified Test */}
                  <div className="space-y-2 p-3.5 rounded-xl border border-border/70 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                        Server-Side Credentials
                      </span>
                      <span className="text-[10px] font-mono text-primary font-semibold">
                        {keySourceLabel(p.keySource)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="font-mono text-xs text-foreground bg-background px-2.5 py-1.5 rounded-lg border border-border flex-1 truncate">
                        {p.isConfigured ? (
                          <span>Configured Server-Side ({p.maskedKey || "••••••••"})</span>
                        ) : (
                          <span className="text-muted-foreground italic">No API key stored</span>
                        )}
                      </div>
                      {p.isConfigured && p.keySource !== "env" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleClearStoredKey(p)}
                          className="h-8 px-2 text-[11px] font-mono text-destructive hover:text-destructive shrink-0"
                        >
                          Clear
                        </Button>
                      )}
                    </div>

                    <div className="pt-1 space-y-1 text-[11px] font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Last Successful Test:</span>
                        <span className="text-foreground">
                          {p.lastSuccessfulTestAt
                            ? `${new Date(p.lastSuccessfulTestAt).toLocaleString()} (${p.lastTestedModel || p.selectedModel})`
                            : "Never verified"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Auto-Failover Eligible:</span>
                        <button
                          onClick={() => handleToggleFallback(p)}
                          className={`font-semibold underline ${p.fallbackEligible ? "text-emerald-600" : "text-amber-600"}`}
                        >
                          {p.fallbackEligible ? "Yes (Free Fallback)" : "No (Disabled)"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Inline Configuration Panel */}
                {isEditing && (
                  <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-4 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="font-serif font-bold text-sm text-foreground">
                        Configure {p.name}
                      </div>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        Keys saved encrypted on server only
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="font-mono text-[11px] text-muted-foreground font-semibold">
                          Selected Model
                        </label>
                        <select
                          value={editModel}
                          onChange={(e) => setEditModel(e.target.value)}
                          className="w-full h-9 rounded-lg border border-border bg-background px-3 font-mono text-xs text-foreground focus:ring-1 focus:ring-primary"
                        >
                          {p.supportedModels.map((m) => (
                            <option key={m} value={m}>
                              {m}
                              {p.paidModels?.includes(m) ? " (Paid Tier Only)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-mono text-[11px] text-muted-foreground font-semibold">
                          Rotate / Enter New API Key (Leave blank to keep existing)
                        </label>
                        <input
                          type="password"
                          value={editKey}
                          onChange={(e) => setEditKey(e.target.value)}
                          placeholder={p.isConfigured ? "Enter new key to replace stored server key..." : "Paste API key..."}
                          className="w-full h-9 rounded-lg border border-border bg-background px-3 font-mono text-xs text-foreground focus:ring-1 focus:ring-primary"
                        />
                      </div>

                      {p.id === "cloudflare" && (
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="font-mono text-[11px] text-muted-foreground font-semibold">
                            Cloudflare Account ID (Required for Workers AI)
                          </label>
                          <input
                            type="text"
                            value={editEndpoint}
                            onChange={(e) => setEditEndpoint(e.target.value)}
                            placeholder="Paste Cloudflare Account ID..."
                            className="w-full h-9 rounded-lg border border-border bg-background px-3 font-mono text-xs text-foreground focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-primary/10">
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="text-xs">
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
                        <span>Save Server Config</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Provider-Specific Test Result / Persisted Last Error */}
                {(testRes || (p.status === "error" && p.lastError) || p.status === "paid_disabled") && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                      testRes?.success
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                        : p.status === "paid_disabled" && !testRes
                        ? "border-border bg-muted/40 text-muted-foreground"
                        : "border-rose-500/20 bg-rose-500/10 text-rose-800 dark:text-rose-300"
                    }`}
                  >
                    {testRes?.success ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                    ) : p.status === "paid_disabled" && !testRes ? (
                      <Lock className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      {testRes ? (
                        <>
                          <span className="font-bold">
                            {testRes.success ? "Verified" : "Failed"} [{testRes.testedModel || p.selectedModel}] ({testRes.latencyMs}ms):
                          </span>{" "}
                          <span>{testRes.message}</span>
                        </>
                      ) : p.status === "paid_disabled" ? (
                        <span>
                          Disabled under Free-First policy. Paid billing is required before enabling {p.name}.
                        </span>
                      ) : (
                        <span>
                          <strong>Last Error [{p.lastTestedModel || p.selectedModel}]:</strong> {p.lastError}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
                <div className="text-[11px] font-mono text-muted-foreground">
                  Last Attempted: {p.lastTestedAt ? new Date(p.lastTestedAt).toLocaleString() : "Never"}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isTesting}
                    onClick={() => handleTestConnection(p)}
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
                    disabled={resettingQuotaId === p.id}
                    onClick={() => handleResetQuota(p.id, p.name)}
                    className="text-xs font-mono gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset App Counter</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDetectSelectedProvider(p.id);
                      setDetectSelectedModel(p.selectedModel);
                      setDetectEndpoint(p.endpointUrl || "");
                      setDetectInputKey("");
                      setDetectTestResult(null);
                      setDetectModalOpen(true);
                    }}
                    className="text-xs font-mono gap-1.5 text-primary hover:text-primary"
                  >
                    <Key className="h-3.5 w-3.5" />
                    <span>Set / Rotate Key</span>
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

      {/* 1. Add / Rotate Single Key Modal */}
      {detectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Wand2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-foreground">
                    Save & Verify Provider Key (Server-Side)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Tested and saved strictly on the backend server — never stored in browser storage
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDetectModalOpen(false);
                  setDetectTestResult(null);
                }}
                className="h-7 w-7 p-0 rounded-full"
              >
                ✕
              </Button>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[11px] text-muted-foreground font-semibold flex items-center justify-between">
                <span>Paste API Key</span>
                <span className="text-[10px] text-primary">Stored Encrypted on Server Only</span>
              </label>
              <input
                type="password"
                value={detectInputKey}
                onChange={(e) => {
                  setDetectInputKey(e.target.value);
                  setDetectTestResult(null);
                }}
                placeholder="Paste key here (e.g. AIza..., hf_...)..."
                className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:ring-1 focus:ring-primary font-mono"
              />
            </div>

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
                    setDetectTestResult(null);
                    const found = effectiveProviders.find((x) => x.id === chosen);
                    if (found && found.supportedModels[0]) {
                      setDetectSelectedModel(found.supportedModels[0]);
                    }
                  }}
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground"
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
                  onChange={(e) => {
                    setDetectSelectedModel(e.target.value);
                    setDetectTestResult(null);
                  }}
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground font-mono"
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
                  Cloudflare Account ID
                </label>
                <input
                  type="text"
                  value={detectEndpoint}
                  onChange={(e) => setDetectEndpoint(e.target.value)}
                  placeholder="Enter Cloudflare Account ID..."
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 font-mono text-xs text-foreground"
                />
              </div>
            )}

            {detectTestResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
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
                    {detectTestResult.success ? "Verified" : "Failed"} [{detectTestResult.testedModel || detectSelectedModel}] ({detectTestResult.latencyMs}ms):
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
                <span>Test Selected Model</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setDetectModalOpen(false);
                    setDetectTestResult(null);
                  }}
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
                  {detectSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span>Save Server-Side</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Set Server Keys Bulk Modal (Write-Only) */}
      {manageAllModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Key className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-foreground">
                    Update Server-Side Provider Keys
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Existing keys remain masked and server-only. Leave blank to retain current key.
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
              {effectiveProviders.map((p) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">#{p.priority}</span>
                      <span className="font-serif text-xs font-bold text-foreground">{p.name}</span>
                      {p.isConfigured && (
                        <span className="text-[10px] font-mono text-emerald-600 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10">
                          Configured ({p.maskedKey})
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {p.selectedModel}
                    </span>
                  </div>

                  <input
                    type="password"
                    value={allKeysForm[p.id] || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAllKeysForm((prev) => ({ ...prev, [p.id]: val }));
                    }}
                    placeholder={
                      p.isConfigured
                        ? "Configured securely on server (leave blank to keep)"
                        : `Enter API key for ${p.name}...`
                    }
                    className="w-full h-9 rounded-lg border border-border bg-background px-3 font-mono text-xs text-foreground"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-[11px] font-mono text-muted-foreground">
                Encrypted server storage only — zero browser localStorage persistence.
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => setManageAllModalOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="hero"
                  disabled={manageAllSaving}
                  onClick={handleSaveAllKeys}
                  className="text-xs font-mono gap-1.5"
                >
                  {manageAllSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span>Save Keys Server-Side</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Independent Provider Image Test Modal */}
      {testGenModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-serif text-base font-bold text-foreground">
                  Independent Provider Visual Test
                </h3>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setTestGenModalOpen(false)} className="h-7 w-7 p-0">
                ✕
              </Button>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[11px] text-muted-foreground font-semibold">
                Target Provider (No Cross-Provider Confusion)
              </label>
              <select
                value={testGenProviderId}
                onChange={(e) => {
                  setTestGenProviderId(e.target.value);
                  setTestGenResult(null);
                }}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs font-mono text-foreground"
              >
                <option value="huggingface">Hugging Face Inference (black-forest-labs/FLUX.1-schnell)</option>
                <option value="cloudflare">Cloudflare Workers AI</option>
                <option value="gemini">Google Gemini</option>
                <option value="auto">Automatic Free Cascade</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[11px] text-muted-foreground font-semibold">
                Test Prompt
              </label>
              <textarea
                rows={3}
                value={testGenPrompt}
                onChange={(e) => setTestGenPrompt(e.target.value)}
                className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground font-mono leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-muted-foreground">
                Respects Free-First Paid Lock
              </span>
              <Button
                size="sm"
                variant="hero"
                disabled={isTestGenerating || !testGenPrompt.trim()}
                onClick={handleRunTestGeneration}
                className="text-xs font-mono gap-1.5"
              >
                {isTestGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                <span>Run Selected Provider Test</span>
              </Button>
            </div>

            {testGenResult && (
              <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3 pt-3">
                {testGenResult.error && !testGenResult.imageUrl ? (
                  <div className="text-xs font-mono text-rose-600">{testGenResult.error}</div>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-emerald-600 font-bold">
                        Provider: {testGenResult.provider} ({testGenResult.model})
                      </span>
                      <span className="text-muted-foreground">
                        {testGenResult.durationMs}ms
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
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
