import fs from "fs";
import path from "path";
import type {
  ImageProviderId,
  ImageProviderConfig,
  IImageProviderAdapter,
  GenerateImageOptions,
  GenerateImageResult,
  ProviderConnectionTestResult,
  ImageGenerationSettings,
  ImageGenerationLogEntry,
  ProviderAlert,
} from "./types";
import { GeminiImageAdapter, isGeminiPaidImageModel } from "./adapters/geminiAdapter";
import { HuggingFaceImageAdapter } from "./adapters/huggingfaceAdapter";
import { CloudflareWorkersAiAdapter } from "./adapters/cloudflareAdapter";
import { FalAiImageAdapter } from "./adapters/falAdapter";
import { ReplicateImageAdapter } from "./adapters/replicateAdapter";
import { synthesizeContextualVisual } from "../geminiVisual.service";
import {
  DEFAULT_GEMINI_TEXT_MODEL,
  DEPRECATED_GEMINI_MODELS,
  resolveSupportedGeminiModel,
} from "../presentationAiClient";
import {
  getServerSecret,
  getMaskedSecretInfo,
  hydrateServerSecrets,
  isPlaceholderTestSecret,
  maskSecretValue,
  redactSecrets,
  setServerSecretSync,
  type SecretSlot,
} from "../serverSecretStore";

const PROVIDERS_CONFIG_FILE = path.join(
  process.cwd(),
  "server",
  "config",
  "runtime-image-providers.json",
);

const LEGACY_GEMINI_IMAGE_DEFAULT = "imagen-3.0-generate-002";

// Initial honest Free-First configuration for all 5 providers
const DEFAULT_PROVIDERS: ImageProviderConfig[] = [
  {
    id: "gemini",
    name: "Google Gemini / AI Studio",
    enabled: true,
    priority: 1,
    fallbackEligible: true,
    selectedModel: DEFAULT_GEMINI_TEXT_MODEL,
    supportedModels: [
      DEFAULT_GEMINI_TEXT_MODEL,
      "gemini-3.5-flash-lite",
      "imagen-3.0-generate-002",
      "imagen-3.0-fast-generate-001",
    ],
    paidModels: ["imagen-3.0-generate-002", "imagen-3.0-fast-generate-001"],
    apiKey: "",
    status: "needs_key",
    freeTierInfo:
      "Gemini 3.8 Flash uses Gemini API Free Tier quotas for text & vector diagrams. Imagen 3 image models require Google Cloud Billing (disabled by default).",
    billingTier: "free",
    billingStatus: "free_tier",
    quotaInfo: {
      isEstimate: true,
      unit: "App Tracked Calls",
      total: 50,
      appLimit: 50,
      used: 0,
      remaining: 50,
      officialLimit: null,
      officialRemaining: null,
      officialSource: "unavailable",
      officialLimitText:
        "Per-project dynamic RPM/TPM/RPD managed by Google AI Studio (official remaining quota is not returned via API).",
    },
  },
  {
    id: "huggingface",
    name: "Hugging Face Inference",
    enabled: true,
    priority: 2,
    fallbackEligible: true,
    selectedModel: "black-forest-labs/FLUX.1-schnell",
    supportedModels: [
      "black-forest-labs/FLUX.1-schnell",
      "stabilityai/stable-diffusion-xl-base-1.0",
      "black-forest-labs/FLUX.1-dev",
    ],
    apiKey: "",
    status: "needs_key",
    freeTierInfo:
      "Free HF accounts receive ~$0.10/mo in Inference Providers credits (~few FLUX runs); halts at HTTP 402 with no auto-billing.",
    billingTier: "free",
    billingStatus: "free_credits_then_paid",
    quotaInfo: {
      isEstimate: true,
      unit: "App Tracked Calls",
      total: 25,
      appLimit: 25,
      used: 0,
      remaining: 25,
      officialLimit: null,
      officialRemaining: null,
      officialSource: "unavailable",
      officialLimitText:
        "~$0.10/month free Inference Providers credits (official dollar balance is not returned unless in headers; halts cleanly at HTTP 402).",
    },
  },
  {
    id: "cloudflare",
    name: "Cloudflare Workers AI",
    enabled: false,
    priority: 3,
    fallbackEligible: true,
    selectedModel: "@cf/black-forest-labs/flux-1-schnell",
    supportedModels: [
      "@cf/black-forest-labs/flux-1-schnell",
      "@cf/bytedance/stable-diffusion-xl-lightning",
      "@cf/stabilityai/stable-diffusion-xl-base-1.0",
    ],
    apiKey: "",
    endpointUrl: "",
    status: "needs_key",
    freeTierInfo:
      "Free tier grants 10,000 Neurons/day resetting at 00:00 UTC without requiring a paid Workers plan.",
    billingTier: "free",
    billingStatus: "free_tier",
    quotaInfo: {
      isEstimate: true,
      unit: "App Tracked Calls",
      total: 40,
      appLimit: 40,
      used: 0,
      remaining: 40,
      officialLimit: 10000,
      officialRemaining: null,
      officialSource: "unavailable",
      officialLimitText:
        "10,000 Neurons/day free tier (exact remaining Neurons shown in Cloudflare Workers AI dashboard).",
    },
  },
  {
    id: "fal",
    name: "fal.ai (FLUX / SDXL)",
    enabled: false,
    priority: 4,
    fallbackEligible: false,
    selectedModel: "fal-ai/flux/schnell",
    supportedModels: ["fal-ai/flux/schnell", "fal-ai/fast-sdxl"],
    apiKey: "",
    status: "paid_disabled",
    freeTierInfo:
      "Initial sign-up credits only; requires pay-as-you-go billing thereafter. Disabled unless Paid Providers are explicitly approved.",
    billingTier: "paid",
    billingStatus: "paid_required",
    quotaInfo: {
      isEstimate: true,
      unit: "App Tracked Calls",
      total: 10,
      appLimit: 10,
      used: 0,
      remaining: 10,
      officialLimit: null,
      officialRemaining: null,
      officialSource: "unavailable",
      officialLimitText: "Pay-as-you-go billing required (managed in fal.ai dashboard).",
    },
  },
  {
    id: "replicate",
    name: "Replicate (FLUX & SDXL)",
    enabled: false,
    priority: 5,
    fallbackEligible: false,
    selectedModel: "black-forest-labs/flux-schnell",
    supportedModels: ["black-forest-labs/flux-schnell", "stability-ai/sdxl"],
    apiKey: "",
    status: "paid_disabled",
    freeTierInfo:
      "Pay-per-second cloud GPU billing after brief trial. Disabled unless Paid Providers are explicitly approved.",
    billingTier: "paid",
    billingStatus: "paid_required",
    quotaInfo: {
      isEstimate: true,
      unit: "App Tracked Calls",
      total: 10,
      appLimit: 10,
      used: 0,
      remaining: 10,
      officialLimit: null,
      officialRemaining: null,
      officialSource: "unavailable",
      officialLimitText: "Pay-per-second billing required (managed in Replicate dashboard).",
    },
  },
];

const DEFAULT_SETTINGS: ImageGenerationSettings = {
  globallyEnabled: true,
  newUserAccess: true,
  maxGenerationsPerPresentation: 3,
  maxDailyGenerationsPerUser: 10,
  maxConcurrentRequests: 3,
  timeoutSeconds: 30,
  autoFallbackEnabled: true,
  preferredAspectRatio: "16:9",
  allowPaidProviders: false,
};

function sanitizeModelsList(id: ImageProviderId, list?: string[]): string[] {
  const def = DEFAULT_PROVIDERS.find((d) => d.id === id);
  const base = Array.isArray(list) && list.length > 0 ? list : def?.supportedModels || [];
  if (id === "gemini") {
    const filtered = base.filter((m) => !DEPRECATED_GEMINI_MODELS.has(m));
    if (!filtered.includes(DEFAULT_GEMINI_TEXT_MODEL)) {
      filtered.unshift(DEFAULT_GEMINI_TEXT_MODEL);
    }
    return Array.from(new Set(filtered));
  }
  return Array.from(new Set([...(def?.supportedModels || []), ...base]));
}

export class ImageProviderManager {
  private static instance: ImageProviderManager;
  private providers: Map<ImageProviderId, ImageProviderConfig> = new Map();
  private adapters: Map<ImageProviderId, IImageProviderAdapter> = new Map();
  private settings: ImageGenerationSettings = { ...DEFAULT_SETTINGS };
  private logs: ImageGenerationLogEntry[] = [];
  private alerts: ProviderAlert[] = [];
  private cooldowns: Map<ImageProviderId, number> = new Map();

  private constructor() {
    this.registerAdapter(new GeminiImageAdapter());
    this.registerAdapter(new HuggingFaceImageAdapter());
    this.registerAdapter(new CloudflareWorkersAiAdapter());
    this.registerAdapter(new FalAiImageAdapter());
    this.registerAdapter(new ReplicateImageAdapter());

    this.loadFromDisk();
    void hydrateServerSecrets();
  }

  public static getInstance(): ImageProviderManager {
    if (!ImageProviderManager.instance) {
      ImageProviderManager.instance = new ImageProviderManager();
    }
    return ImageProviderManager.instance;
  }

  private registerAdapter(adapter: IImageProviderAdapter) {
    this.adapters.set(adapter.id, adapter);
  }

  private isPlaceholderTestKey(key?: string): boolean {
    return isPlaceholderTestSecret(key);
  }

  private resolveKey(id: ImageProviderId, inlineKey?: string): string {
    if (inlineKey && inlineKey.trim() && !inlineKey.includes("••••")) {
      return inlineKey.trim();
    }
    return getServerSecret(id as SecretSlot);
  }

  private computeInitialStatus(
    id: ImageProviderId,
    config: ImageProviderConfig,
    hasKey: boolean,
  ): ImageProviderConfig["status"] {
    if (
      (config.billingTier === "paid" || (id === "gemini" && isGeminiPaidImageModel(config.selectedModel))) &&
      !this.settings.allowPaidProviders
    ) {
      return "paid_disabled";
    }
    if (!hasKey) return "needs_key";
    if (config.lastTestSuccess === true && config.lastSuccessfulTestAt) return "ready";
    if (config.status === "error" || config.status === "rate_limited") return config.status;
    return "untested";
  }

  private loadFromDisk() {
    DEFAULT_PROVIDERS.forEach((p) => {
      const envKey = this.resolveKey(p.id);
      this.providers.set(p.id, {
        ...p,
        apiKey: envKey,
        endpointUrl: p.id === "cloudflare" ? getServerSecret("cloudflare_account_id") : p.endpointUrl,
        quotaInfo: p.quotaInfo ? { ...p.quotaInfo } : undefined,
        status: this.computeInitialStatus(p.id, p, envKey.length > 6),
      });
    });

    if (process.env.NODE_ENV === "test" || process.env.VITEST) {
      return;
    }

    try {
      if (fs.existsSync(PROVIDERS_CONFIG_FILE)) {
        const raw = fs.readFileSync(PROVIDERS_CONFIG_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed.settings) {
          this.settings = { ...DEFAULT_SETTINGS, ...parsed.settings };
        }
        if (Array.isArray(parsed.providers)) {
          parsed.providers.forEach((saved: ImageProviderConfig) => {
            const current = this.providers.get(saved.id);
            if (!current) return;

            // Migrate legacy keys out of tracked config JSON into encrypted server vault if present
            const legacyDiskKey =
              saved.apiKey && !this.isPlaceholderTestKey(saved.apiKey) && !saved.apiKey.includes("••••")
                ? saved.apiKey.trim()
                : "";
            if (legacyDiskKey) {
              setServerSecretSync(saved.id as SecretSlot, legacyDiskKey);
            }

            let resolvedModel = saved.selectedModel || current.selectedModel;
            if (saved.id === "gemini") {
              if (resolvedModel === LEGACY_GEMINI_IMAGE_DEFAULT && !this.settings.allowPaidProviders) {
                resolvedModel = DEFAULT_GEMINI_TEXT_MODEL;
              } else if (DEPRECATED_GEMINI_MODELS.has(resolvedModel)) {
                resolvedModel = resolveSupportedGeminiModel(resolvedModel);
              }
            }

            const effectiveKey = this.resolveKey(saved.id);
            const mergedQuota = {
              ...current.quotaInfo,
              ...(saved.quotaInfo || {}),
              // Never carry forward inflated fake provider limits (e.g. 15 RPM or 1000 Monthly) as official
              officialLimitText: current.quotaInfo?.officialLimitText,
              officialLimit: current.quotaInfo?.officialLimit ?? null,
              officialSource: saved.quotaInfo?.officialSource || current.quotaInfo?.officialSource || "unavailable",
              appLimit: saved.quotaInfo?.appLimit ?? current.quotaInfo?.appLimit ?? 25,
              isEstimate: true,
            };
            if (saved.id === "huggingface" && mergedQuota.total === 1000) {
              mergedQuota.total = current.quotaInfo?.total || 25;
              mergedQuota.appLimit = current.quotaInfo?.appLimit || 25;
              mergedQuota.remaining = Math.max(0, (mergedQuota.appLimit || 25) - (mergedQuota.used || 0));
              mergedQuota.unit = current.quotaInfo?.unit;
            }
            if (saved.id === "gemini" && mergedQuota.total === 15 && mergedQuota.unit === "Requests / Min") {
              mergedQuota.total = current.quotaInfo?.total || 50;
              mergedQuota.appLimit = current.quotaInfo?.appLimit || 50;
              mergedQuota.remaining = Math.max(0, (mergedQuota.appLimit || 50) - (mergedQuota.used || 0));
              mergedQuota.unit = current.quotaInfo?.unit;
            }

            const merged: ImageProviderConfig = {
              ...current,
              ...saved,
              selectedModel: resolvedModel,
              supportedModels: sanitizeModelsList(saved.id, saved.supportedModels),
              paidModels: current.paidModels,
              billingTier: current.billingTier,
              billingStatus: current.billingStatus,
              freeTierInfo: current.freeTierInfo,
              apiKey: "",
              quotaInfo: mergedQuota,
              status: "untested",
            };
            merged.status = this.computeInitialStatus(saved.id, merged, effectiveKey.length > 6);
            this.providers.set(saved.id, merged);
          });
        }
        if (Array.isArray(parsed.logs)) {
          this.logs = parsed.logs.slice(0, 100);
        }
        if (Array.isArray(parsed.alerts)) {
          this.alerts = parsed.alerts.slice(0, 50);
        }
      }
    } catch (e) {
      console.warn("Could not load runtime image provider settings from disk:", redactSecrets(String(e)));
    }
  }

  private persistToDisk() {
    if (process.env.NODE_ENV === "test" || process.env.VITEST) {
      return;
    }
    try {
      const dir = path.dirname(PROVIDERS_CONFIG_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // Strictly strip all secret keys before writing non-secret provider metadata to disk
      const sanitizedProviders = Array.from(this.providers.values()).map((p) => ({
        ...p,
        apiKey: "",
      }));
      fs.writeFileSync(
        PROVIDERS_CONFIG_FILE,
        JSON.stringify(
          {
            providers: sanitizedProviders,
            settings: this.settings,
            logs: this.logs.slice(0, 100),
            alerts: this.alerts.slice(0, 50),
          },
          null,
          2,
        ),
        "utf-8",
      );
    } catch (e) {
      console.warn("Failed to persist image provider config to disk:", redactSecrets(String(e)));
    }
  }

  public maskKey(key: string): string {
    return maskSecretValue(key);
  }

  public addAlert(alert: Omit<ProviderAlert, "timestamp"> & { timestamp?: string }) {
    const newAlert: ProviderAlert = {
      ...alert,
      message: redactSecrets(alert.message),
      timestamp: alert.timestamp || new Date().toISOString(),
      dismissed: false,
    };
    const existingIndex = this.alerts.findIndex(
      (a) => !a.dismissed && a.providerId === newAlert.providerId && a.title === newAlert.title,
    );
    if (existingIndex >= 0) {
      this.alerts[existingIndex] = newAlert;
    } else {
      this.alerts.unshift(newAlert);
    }
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(0, 50);
    }
    this.persistToDisk();
  }

  public getAlerts(): ProviderAlert[] {
    return this.alerts.filter((a) => !a.dismissed);
  }

  public dismissAlert(alertId: string): void {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.dismissed = true;
      this.persistToDisk();
    }
  }

  public clearAlerts(): void {
    this.alerts = [];
    this.persistToDisk();
  }

  /**
   * Resets ONLY DocuMind's application-side usage counter (never invents an official upstream quota reset).
   */
  public resetProviderQuota(id: ImageProviderId): ImageProviderConfig {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`Provider "${id}" not found.`);
    }

    if (provider.quotaInfo) {
      provider.quotaInfo.used = 0;
      const cap = provider.quotaInfo.appLimit ?? provider.quotaInfo.total;
      provider.quotaInfo.remaining = typeof cap === "number" ? cap : null;
    }

    this.cooldowns.delete(id);
    const hasKey = this.resolveKey(id, provider.apiKey).length > 6;
    if (provider.status === "rate_limited") {
      provider.status = provider.lastTestSuccess ? "ready" : hasKey ? "untested" : "needs_key";
      provider.lastError = undefined;
    }

    this.alerts = this.alerts.filter((a) => a.providerId !== id);
    this.providers.set(id, provider);
    this.persistToDisk();
    return this.getProviderForClient(id)!;
  }

  public resetAllQuotas(): Array<
    ImageProviderConfig & { isConfigured: boolean; maskedKey: string; keySource: string }
  > {
    for (const id of this.providers.keys()) {
      this.resetProviderQuota(id);
    }
    return this.getProvidersForClient();
  }

  private getProviderForClient(
    id: ImageProviderId,
  ): (ImageProviderConfig & { isConfigured: boolean; maskedKey: string; keySource: string }) | undefined {
    const p = this.providers.get(id);
    if (!p) return undefined;
    const runtimeKey = this.resolveKey(id, p.apiKey);
    const secretInfo = getMaskedSecretInfo(id as SecretSlot);
    const hasKey = Boolean(runtimeKey.length > 6 || secretInfo.isConfigured);
    const masked = runtimeKey ? this.maskKey(runtimeKey) : secretInfo.maskedKey;
    const computedStatus = this.computeInitialStatus(id, p, hasKey);

    return {
      ...p,
      apiKey: masked,
      isConfigured: hasKey,
      maskedKey: masked,
      keySource: runtimeKey && secretInfo.source !== "none" ? secretInfo.keySource : hasKey ? "server_vault" : "none",
      status: computedStatus,
    };
  }

  /**
   * Returns list of configured providers with strictly masked key suffixes (never plaintext secrets).
   */
  public getProvidersForClient(): Array<
    ImageProviderConfig & { isConfigured: boolean; maskedKey: string; keySource: string }
  > {
    return Array.from(this.providers.keys())
      .map((id) => this.getProviderForClient(id)!)
      .sort((a, b) => a.priority - b.priority);
  }

  public getProvider(id: ImageProviderId): ImageProviderConfig | undefined {
    const p = this.providers.get(id);
    if (!p) return undefined;
    return {
      ...p,
      apiKey: this.resolveKey(id, p.apiKey),
      endpointUrl:
        p.id === "cloudflare"
          ? p.endpointUrl || getServerSecret("cloudflare_account_id")
          : p.endpointUrl,
    };
  }

  public updateProvider(
    id: ImageProviderId,
    updates: Partial<ImageProviderConfig>,
  ): ImageProviderConfig & { isConfigured: boolean; maskedKey: string; keySource: string } {
    const current = this.providers.get(id);
    if (!current) {
      throw new Error(`Provider "${id}" not found.`);
    }

    let keyChanged = false;
    if (updates.apiKey !== undefined && !updates.apiKey.includes("••••")) {
      const cleaned = updates.apiKey.trim();
      setServerSecretSync(id as SecretSlot, cleaned);
      keyChanged = true;
      current.apiKey = process.env.NODE_ENV === "test" || process.env.VITEST ? cleaned : "";
    }

    if (id === "cloudflare" && updates.endpointUrl !== undefined) {
      setServerSecretSync("cloudflare_account_id", updates.endpointUrl.trim());
    }

    const modelChanged =
      updates.selectedModel !== undefined && updates.selectedModel.trim() !== current.selectedModel;

    const updated: ImageProviderConfig = {
      ...current,
      ...updates,
      billingTier: current.billingTier,
      billingStatus: current.billingStatus,
      paidModels: current.paidModels,
      apiKey: current.apiKey,
    };

    const effectiveKey = this.resolveKey(id, updated.apiKey);

    // Enforce Free-First rule: paid providers cannot be enabled unless allowPaidProviders is explicitly enabled
    if (updated.billingTier === "paid" && updated.enabled && !this.settings.allowPaidProviders) {
      updated.enabled = false;
      updated.status = "paid_disabled";
      updated.lastError = "Paid providers are locked under Free-First policy.";
    } else if (keyChanged || modelChanged) {
      // Never mark a provider Ready until an actual connection test succeeds for the updated key/model
      updated.lastTestSuccess = false;
      updated.lastError = undefined;
      updated.status = this.computeInitialStatus(id, updated, effectiveKey.length > 6);
      if (modelChanged && updated.quotaInfo) {
        const def = DEFAULT_PROVIDERS.find((d) => d.id === id);
        if (id === "gemini" && isGeminiPaidImageModel(updated.selectedModel) && !this.settings.allowPaidProviders) {
          updated.quotaInfo.officialLimitText = `${updated.selectedModel}: Paid Tier only (Free Tier quota = 0; disabled by default)`;
          updated.quotaInfo.officialLimit = 0;
          updated.quotaInfo.officialRemaining = 0;
        } else if (def?.quotaInfo) {
          updated.quotaInfo.officialLimitText = def.quotaInfo.officialLimitText;
          updated.quotaInfo.officialLimit = def.quotaInfo.officialLimit;
          updated.quotaInfo.officialRemaining = def.quotaInfo.officialRemaining;
        }
      }
    } else {
      updated.status = this.computeInitialStatus(id, updated, effectiveKey.length > 6);
    }

    this.providers.set(id, updated);
    this.persistToDisk();
    return this.getProviderForClient(id)!;
  }

  /**
   * Tests connection independently for a specific provider & its selected model.
   * Never marks Ready unless the real API test succeeds.
   */
  public async testProviderConnection(
    id: ImageProviderId,
    apiKeyOverride?: string,
    selectedModelOverride?: string,
    endpointOverride?: string,
  ): Promise<ProviderConnectionTestResult> {
    await hydrateServerSecrets();
    const provider = this.providers.get(id);
    const adapter = this.adapters.get(id);

    if (!provider || !adapter) {
      return {
        success: false,
        latencyMs: 0,
        provider: id,
        message: `Provider "${id}" does not have an active adapter.`,
      };
    }

    const effectiveKey =
      apiKeyOverride && !apiKeyOverride.includes("••••")
        ? apiKeyOverride.trim()
        : this.resolveKey(id, provider.apiKey);
    const effectiveModel = (selectedModelOverride || provider.selectedModel).trim();
    const effectiveEndpoint =
      endpointOverride !== undefined
        ? endpointOverride.trim()
        : id === "cloudflare"
        ? (provider.endpointUrl || getServerSecret("cloudflare_account_id")).trim()
        : provider.endpointUrl;

    const effectiveConfig: ImageProviderConfig = {
      ...provider,
      apiKey: effectiveKey,
      selectedModel: effectiveModel,
      endpointUrl: effectiveEndpoint,
      allowPaidModelExecution: Boolean(this.settings.allowPaidProviders),
    };

    const result = await adapter.testConnection(effectiveConfig);

    const current = this.providers.get(id)!;
    const nowIso = new Date().toISOString();
    current.lastTestedAt = nowIso;
    current.lastTestedModel = effectiveModel;
    current.lastTestSuccess = result.success;

    if (result.quota) {
      current.quotaInfo = {
        ...current.quotaInfo,
        ...result.quota,
        used: current.quotaInfo?.used ?? 0,
        refreshedAt: nowIso,
      };
    }

    if (result.success) {
      current.status = "ready";
      current.lastSuccessfulTestAt = nowIso;
      current.lastError = undefined;
      this.cooldowns.delete(id);
      this.alerts = this.alerts.filter((a) => a.providerId !== id || a.severity !== "critical");
      if (result.models && result.models.length > 0) {
        current.supportedModels = sanitizeModelsList(id, [...current.supportedModels, ...result.models]);
      }
    } else {
      current.status =
        (isGeminiPaidImageModel(effectiveModel) || current.billingTier === "paid") &&
        !this.settings.allowPaidProviders
          ? "paid_disabled"
          : "error";
      current.lastError = redactSecrets(result.message);
    }

    this.providers.set(id, current);
    this.persistToDisk();
    return {
      ...result,
      message: redactSecrets(result.message),
      provider: id,
      testedModel: effectiveModel,
    };
  }

  /**
   * Generates an image with Free-First protection and optional single-provider targeting.
   */
  public async generateImage(options: GenerateImageOptions): Promise<GenerateImageResult> {
    await hydrateServerSecrets();
    const startTime = Date.now();

    // 1. Strict Exclusivity Enforcement
    const allowedSources: string[] = ["presentation_maker", "admin_test"];
    if (!options.source || !allowedSources.includes(options.source)) {
      throw new Error(
        `AI image generation is exclusively reserved for Presentation Maker. Requests from "${options.source || "unknown"}" are strictly forbidden.`,
      );
    }

    // 2. Global Enablement Check
    if (!this.settings.globallyEnabled) {
      return this.executeZeroFailureFallback(
        options,
        "AI Image Generation is currently disabled by system administrator.",
        startTime,
      );
    }

    // 3. Free-First Lock (NEVER bypass paid check even in admin_test unless allowPaidProviders is explicitly enabled!)
    const allowPaid =
      options.allowPaidProviders === true || this.settings.allowPaidProviders === true;
    const now = Date.now();
    const isTestEnv = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);

    // If caller targeted a specific provider (e.g. Admin independent provider benchmark), do NOT silently switch to Gemini!
    const candidates = options.providerId
      ? [this.providers.get(options.providerId)].filter((p): p is ImageProviderConfig => Boolean(p))
      : Array.from(this.providers.values()).sort((a, b) => a.priority - b.priority);

    const eligibleProviders = candidates.filter((p) => {
      if (!options.providerId && !p.enabled) return false;
      if (p.billingTier === "paid" && !allowPaid) return false;
      if (p.id === "gemini" && isGeminiPaidImageModel(p.selectedModel) && !allowPaid) return false;
      const runtimeKey = this.resolveKey(p.id, p.apiKey);
      if (!runtimeKey || runtimeKey.trim().length < 6) return false;
      if (!isTestEnv && this.isPlaceholderTestKey(runtimeKey)) return false;
      if (!options.providerId) {
        const cooldownUntil = this.cooldowns.get(p.id);
        if (cooldownUntil && cooldownUntil > now) return false;
      }
      return true;
    });

    if (eligibleProviders.length === 0) {
      const targetModel = options.providerId
        ? this.providers.get(options.providerId)?.selectedModel || ""
        : "";
      const isPaidLock =
        options.providerId &&
        candidates[0] &&
        ((candidates[0].billingTier === "paid" && !allowPaid) ||
          (candidates[0].id === "gemini" && isGeminiPaidImageModel(targetModel) && !allowPaid));
      const reason = isPaidLock
        ? `Provider "${options.providerId}" (${targetModel}) requires paid billing and is disabled under Free-First policy.`
        : options.providerId
        ? `Provider "${options.providerId}" is not configured with a valid free-tier key or model.`
        : "No free AI raster image providers are currently configured or active. Using programmatic vector diagram/SVG engine.";

      if (options.providerId && options.source === "admin_test") {
        return {
          success: false,
          imageUrl: "",
          provider: options.providerId,
          model: targetModel,
          durationMs: Date.now() - startTime,
          format: "png",
          error: reason,
        };
      }
      return this.executeZeroFailureFallback(options, reason, startTime);
    }

    let lastError = "No provider attempted";
    for (let i = 0; i < eligibleProviders.length; i++) {
      const provider = eligibleProviders[i]!;
      const nextProvider = !options.providerId
        ? eligibleProviders.slice(i + 1).find((p) => {
            return (
              !p.quotaInfo ||
              typeof p.quotaInfo.remaining !== "number" ||
              p.quotaInfo.remaining > 0
            );
          })
        : undefined;
      const cascadeTarget = nextProvider
        ? nextProvider.name
        : "Programmatic Vector Diagram / SVG Engine";

      if (
        provider.quotaInfo &&
        typeof provider.quotaInfo.remaining === "number" &&
        provider.quotaInfo.remaining <= 0
      ) {
        this.addAlert({
          id: `alert_${provider.id}_depleted`,
          providerId: provider.id,
          providerName: provider.name,
          severity: "critical",
          title: `${provider.name} App Limit / Quota Reached`,
          message: `${provider.name} reached its configured tracking limit. ${options.providerId ? "Stopped (no auto-fallback for targeted provider test)." : `Cascading Presentation Maker visuals cleanly to ${cascadeTarget}.`}`,
          remainingQuota: 0,
          totalQuota: provider.quotaInfo.appLimit || provider.quotaInfo.total || 0,
          unit: provider.quotaInfo.unit || "calls",
          cascadedTo: options.providerId ? undefined : cascadeTarget,
        });
        if (options.providerId) break;
        continue;
      }

      const adapter = this.adapters.get(provider.id);
      if (!adapter) continue;

      const attemptStart = Date.now();
      try {
        const effectiveConfig: ImageProviderConfig = {
          ...provider,
          apiKey: this.resolveKey(provider.id, provider.apiKey),
          endpointUrl:
            provider.id === "cloudflare"
              ? provider.endpointUrl || getServerSecret("cloudflare_account_id")
              : provider.endpointUrl,
          allowPaidModelExecution: allowPaid,
        };
        if (this.isPlaceholderTestKey(effectiveConfig.apiKey)) {
          throw new Error("Placeholder test credentials skipped external network request.");
        }

        const res = await adapter.generateImage(effectiveConfig, {
          ...options,
          allowPaidProviders: allowPaid,
        });
        const durationMs = Date.now() - attemptStart;

        if (provider.quotaInfo) {
          provider.quotaInfo.used = (provider.quotaInfo.used || 0) + 1;
          const cap = provider.quotaInfo.appLimit ?? provider.quotaInfo.total;
          if (typeof cap === "number") {
            provider.quotaInfo.remaining = Math.max(0, cap - provider.quotaInfo.used);
          }
        }

        this.logEvent({
          id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date().toISOString(),
          source: options.source,
          prompt: options.prompt.slice(0, 150),
          concept: options.concept,
          provider: provider.id,
          model: provider.selectedModel,
          status: "success",
          durationMs,
        });

        return {
          success: true,
          imageUrl: res.imageUrl,
          provider: provider.id,
          model: provider.selectedModel,
          durationMs,
          format: res.format,
        };
      } catch (err: unknown) {
        const errorMsg = redactSecrets(err instanceof Error ? err.message : String(err));
        lastError = errorMsg;

        const isRateLimitOrQuota =
          errorMsg.includes("429") ||
          errorMsg.includes("402") ||
          errorMsg.toLowerCase().includes("quota") ||
          errorMsg.toLowerCase().includes("resource_exhausted") ||
          errorMsg.toLowerCase().includes("rate limit") ||
          errorMsg.toLowerCase().includes("credit") ||
          errorMsg.toLowerCase().includes("insufficient");

        if (isRateLimitOrQuota && provider.quotaInfo) {
          provider.quotaInfo.remaining = 0;
          provider.status = "rate_limited";
        } else {
          provider.status = "error";
        }

        if (!options.providerId) {
          this.cooldowns.set(provider.id, Date.now() + 120000);
        }
        provider.lastError = errorMsg;

        this.addAlert({
          id: `alert_${provider.id}_error_${Date.now()}`,
          providerId: provider.id,
          providerName: provider.name,
          severity: "critical",
          title: isRateLimitOrQuota
            ? `${provider.name} Free Quota / Credits Exhausted`
            : `${provider.name} Provider Error`,
          message: `${provider.name} (${provider.selectedModel}) failed: ${errorMsg.slice(0, 140)}`,
          remainingQuota: provider.quotaInfo?.remaining ?? 0,
          totalQuota: provider.quotaInfo?.appLimit ?? provider.quotaInfo?.total ?? 0,
          unit: provider.quotaInfo?.unit || "calls",
          cascadedTo: options.providerId ? undefined : cascadeTarget,
        });

        this.logEvent({
          id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date().toISOString(),
          source: options.source,
          prompt: options.prompt.slice(0, 150),
          concept: options.concept,
          provider: provider.id,
          model: provider.selectedModel,
          status: "failed",
          durationMs: Date.now() - attemptStart,
          errorCategory: isRateLimitOrQuota ? "Quota / Credit Exhausted" : "Provider Error",
          errorMessage: errorMsg,
        });

        if (options.providerId || !this.settings.autoFallbackEnabled || !provider.fallbackEligible) {
          break;
        }
      }
    }

    if (options.providerId) {
      return {
        success: false,
        imageUrl: "",
        provider: options.providerId,
        model: this.providers.get(options.providerId)?.selectedModel || "",
        durationMs: Date.now() - startTime,
        format: "png",
        error: lastError,
      };
    }

    return this.executeZeroFailureFallback(
      options,
      `External image providers unavailable (${lastError}). Used programmatic vector diagram engine.`,
      startTime,
    );
  }

  private executeZeroFailureFallback(
    options: GenerateImageOptions,
    reason: string,
    startTime: number,
  ): GenerateImageResult {
    const conceptName = options.concept || options.slideTitle || "Concept Visual";
    const synthesized = synthesizeContextualVisual({
      title: options.slideTitle || conceptName,
      subtitle: options.prompt.slice(0, 80),
      concept: conceptName,
      caption: `Topological illustration: ${conceptName}`,
      accentColor: "#2563EB",
      isDark: false,
    });

    const durationMs = Date.now() - startTime;
    this.logEvent({
      id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      source: options.source,
      prompt: options.prompt.slice(0, 150),
      concept: options.concept,
      provider: "local-svg",
      model: "contextual-svg-engine",
      status: "fallback",
      durationMs,
      errorMessage: redactSecrets(reason),
    });

    return {
      success: true,
      imageUrl: synthesized.imageUrl,
      provider: "local-svg",
      model: "contextual-svg-engine",
      durationMs,
      format: "svg+xml",
      error: redactSecrets(reason),
    };
  }

  private logEvent(entry: ImageGenerationLogEntry) {
    this.logs.unshift(entry);
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(0, 100);
    }
    this.persistToDisk();
  }

  public getSettings(): ImageGenerationSettings {
    return { ...this.settings };
  }

  public updateSettings(updates: Partial<ImageGenerationSettings>): ImageGenerationSettings {
    this.settings = { ...this.settings, ...updates };
    // Refresh paid_disabled statuses across providers whenever allowPaidProviders toggles
    for (const [id, p] of this.providers.entries()) {
      const hasKey = this.resolveKey(id, p.apiKey).length > 6;
      p.status = this.computeInitialStatus(id, p, hasKey);
      this.providers.set(id, p);
    }
    this.persistToDisk();
    return { ...this.settings };
  }

  public getLogs(limit = 50): ImageGenerationLogEntry[] {
    return this.logs.slice(0, limit);
  }

  public clearLogs(): void {
    this.logs = [];
    this.persistToDisk();
  }
}

export const imageProviderManager = ImageProviderManager.getInstance();
