import fs from "fs";
import path from "path";
import crypto from "crypto";
import { ENV } from "../../config/env";
import type {
  ImageProviderId,
  ImageProviderConfig,
  IImageProviderAdapter,
  GenerateImageOptions,
  GenerateImageResult,
  ProviderConnectionTestResult,
  ImageGenerationSettings,
  ImageGenerationLogEntry,
} from "./types";
import { GeminiImageAdapter } from "./adapters/geminiAdapter";
import { HuggingFaceImageAdapter } from "./adapters/huggingfaceAdapter";
import { CloudflareWorkersAiAdapter } from "./adapters/cloudflareAdapter";
import { FalAiImageAdapter } from "./adapters/falAdapter";
import { ReplicateImageAdapter } from "./adapters/replicateAdapter";
import { synthesizeContextualVisual } from "../geminiVisual.service";

const PROVIDERS_CONFIG_FILE = path.join(
  process.cwd(),
  "server",
  "config",
  "runtime-image-providers.json",
);

// Initial default configuration for all 5 providers
const DEFAULT_PROVIDERS: ImageProviderConfig[] = [
  {
    id: "gemini",
    name: "Google Gemini / Imagen 3",
    enabled: true,
    priority: 1,
    fallbackEligible: true,
    selectedModel: "imagen-3.0-generate-002",
    supportedModels: [
      "imagen-3.0-generate-002",
      "imagen-3.0-fast-generate-001",
      "gemini-2.5-flash",
    ],
    apiKey: ENV.GEMINI_API_KEY || "",
    status: (ENV.GEMINI_API_KEY && ENV.GEMINI_API_KEY.length > 8) ? "ready" : "needs_key",
    freeTierInfo: "Free tier available via Google AI Studio API with daily rate limits.",
    quotaInfo: {
      isEstimate: true,
      unit: "Requests / Min",
      total: 15,
      remaining: 15,
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
      "runwayml/stable-diffusion-v1-5",
    ],
    apiKey: process.env.HUGGINGFACE_API_KEY || "",
    status: "needs_key",
    freeTierInfo: "Free community inference API with Hugging Face user access token.",
    quotaInfo: {
      isEstimate: true,
      unit: "Monthly Requests",
      total: 1000,
      remaining: 1000,
    },
  },
  {
    id: "cloudflare",
    name: "Cloudflare Workers AI",
    enabled: false,
    priority: 3,
    fallbackEligible: true,
    selectedModel: "@cf/bytedance/stable-diffusion-xl-lightning",
    supportedModels: [
      "@cf/bytedance/stable-diffusion-xl-lightning",
      "@cf/stabilityai/stable-diffusion-xl-base-1.0",
    ],
    apiKey: process.env.CLOUDFLARE_API_TOKEN || "",
    endpointUrl: process.env.CLOUDFLARE_ACCOUNT_ID || "",
    status: "needs_key",
    freeTierInfo: "10,000 Neurons per day free on Cloudflare Workers AI plan.",
    quotaInfo: {
      isEstimate: true,
      unit: "Neurons / Day",
      total: 10000,
      remaining: 10000,
    },
  },
  {
    id: "fal",
    name: "fal.ai (FLUX / SDXL)",
    enabled: false,
    priority: 4,
    fallbackEligible: true,
    selectedModel: "fal-ai/flux/schnell",
    supportedModels: [
      "fal-ai/flux/schnell",
      "fal-ai/fast-sdxl",
    ],
    apiKey: process.env.FAL_KEY || "",
    status: "needs_key",
    freeTierInfo: "Initial free trial credits provided on sign-up; requires pay-as-you-go key after trial.",
    quotaInfo: {
      isEstimate: true,
      unit: "Credits ($)",
      total: 10,
      remaining: 10,
    },
  },
  {
    id: "replicate",
    name: "Replicate (FLUX & SDXL)",
    enabled: false,
    priority: 5,
    fallbackEligible: true,
    selectedModel: "black-forest-labs/flux-schnell",
    supportedModels: [
      "black-forest-labs/flux-schnell",
      "stability-ai/sdxl",
    ],
    apiKey: process.env.REPLICATE_API_TOKEN || "",
    status: "needs_key",
    freeTierInfo: "Trial runs offered for new accounts; pay-per-second thereafter.",
    quotaInfo: {
      isEstimate: true,
      unit: "Predictions",
      total: 50,
      remaining: 50,
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
};

export class ImageProviderManager {
  private static instance: ImageProviderManager;
  private providers: Map<ImageProviderId, ImageProviderConfig> = new Map();
  private adapters: Map<ImageProviderId, IImageProviderAdapter> = new Map();
  private settings: ImageGenerationSettings = { ...DEFAULT_SETTINGS };
  private logs: ImageGenerationLogEntry[] = [];
  private cooldowns: Map<ImageProviderId, number> = new Map();

  private constructor() {
    this.registerAdapter(new GeminiImageAdapter());
    this.registerAdapter(new HuggingFaceImageAdapter());
    this.registerAdapter(new CloudflareWorkersAiAdapter());
    this.registerAdapter(new FalAiImageAdapter());
    this.registerAdapter(new ReplicateImageAdapter());

    this.loadFromDisk();
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

  private loadFromDisk() {
    // 1. Initialize defaults
    DEFAULT_PROVIDERS.forEach((p) => {
      this.providers.set(p.id, { ...p });
    });

    // 2. Overlay disk configuration if present
    try {
      if (fs.existsSync(PROVIDERS_CONFIG_FILE)) {
        const raw = fs.readFileSync(PROVIDERS_CONFIG_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.providers)) {
          parsed.providers.forEach((saved: ImageProviderConfig) => {
            const current = this.providers.get(saved.id);
            if (current) {
              this.providers.set(saved.id, {
                ...current,
                ...saved,
                // If saved apiKey was empty but ENV exists, preserve ENV
                apiKey: saved.apiKey || current.apiKey || "",
              });
            }
          });
        }
        if (parsed.settings) {
          this.settings = { ...DEFAULT_SETTINGS, ...parsed.settings };
        }
        if (Array.isArray(parsed.logs)) {
          this.logs = parsed.logs.slice(0, 100);
        }
      }
    } catch (e) {
      console.warn("Could not load runtime image provider settings from disk:", e);
    }
  }

  private persistToDisk() {
    try {
      const dir = path.dirname(PROVIDERS_CONFIG_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(
        PROVIDERS_CONFIG_FILE,
        JSON.stringify(
          {
            providers: Array.from(this.providers.values()),
            settings: this.settings,
            logs: this.logs.slice(0, 100),
          },
          null,
          2,
        ),
        "utf-8",
      );
    } catch (e) {
      console.warn("Failed to persist image provider config to disk:", e);
    }
  }

  public maskKey(key: string): string {
    const trimmed = (key || "").trim();
    if (!trimmed) return "";
    if (trimmed.length <= 8) return "••••••••";
    return `${trimmed.slice(0, 4)}••••••••${trimmed.slice(-4)}`;
  }

  /**
   * Overlays provider API keys supplied directly by Presentation Maker sessions
   */
  public setTemporaryProviderKeys(keys: Record<string, string>) {
    if (!keys || typeof keys !== "object") return;
    for (const [id, key] of Object.entries(keys)) {
      if (key && typeof key === "string" && key.trim().length > 6 && !key.includes("••••")) {
        const p = this.providers.get(id as ImageProviderId);
        if (p) {
          p.apiKey = key.trim();
          p.enabled = true;
          p.status = "ready";
          this.providers.set(id as ImageProviderId, p);
        }
      }
    }
  }

  /**
   * Returns list of configured providers with masked API keys for secure UI display
   */
  public getProvidersForClient(): Array<
    ImageProviderConfig & { isConfigured: boolean; maskedKey: string }
  > {
    return Array.from(this.providers.values())
      .sort((a, b) => a.priority - b.priority)
      .map((p) => {
        const hasKey = Boolean(p.apiKey && p.apiKey.trim().length > 6);
        return {
          ...p,
          apiKey: this.maskKey(p.apiKey),
          isConfigured: hasKey,
          maskedKey: this.maskKey(p.apiKey),
        };
      });
  }

  public getProvider(id: ImageProviderId): ImageProviderConfig | undefined {
    return this.providers.get(id);
  }

  /**
   * Updates provider configuration (credentials, priority, selected model, enabled status)
   */
  public updateProvider(
    id: ImageProviderId,
    updates: Partial<ImageProviderConfig>,
  ): ImageProviderConfig {
    const current = this.providers.get(id);
    if (!current) {
      throw new Error(`Provider "${id}" not found.`);
    }

    const newKey = updates.apiKey !== undefined
      ? (updates.apiKey.includes("••••") ? current.apiKey : updates.apiKey.trim())
      : current.apiKey;

    const updated: ImageProviderConfig = {
      ...current,
      ...updates,
      apiKey: newKey,
      status: newKey && newKey.length > 6 ? (current.status === "needs_key" ? "ready" : current.status) : "needs_key",
    };

    this.providers.set(id, updated);
    this.persistToDisk();
    return updated;
  }

  /**
   * Tests connection for a specific provider
   */
  public async testProviderConnection(
    id: ImageProviderId,
    apiKeyOverride?: string,
  ): Promise<ProviderConnectionTestResult> {
    const provider = this.providers.get(id);
    const adapter = this.adapters.get(id);

    if (!provider || !adapter) {
      return {
        success: false,
        latencyMs: 0,
        message: `Provider "${id}" does not have an active adapter.`,
      };
    }

    const effectiveConfig = {
      ...provider,
      apiKey: (apiKeyOverride && !apiKeyOverride.includes("••••")) ? apiKeyOverride : provider.apiKey,
    };

    const result = await adapter.testConnection(effectiveConfig);

    // Update status based on test result
    const current = this.providers.get(id)!;
    current.lastTestedAt = new Date().toISOString();
    if (result.success) {
      current.status = "ready";
      current.lastError = undefined;
      if (result.quota) current.quotaInfo = result.quota;
      if (result.models && result.models.length > 0) {
        current.supportedModels = Array.from(new Set([...current.supportedModels, ...result.models]));
      }
    } else {
      current.status = "error";
      current.lastError = result.message;
    }

    this.providers.set(id, current);
    this.persistToDisk();
    return result;
  }

  /**
   * Generates an image with strict exclusivity enforcement and automatic fallback.
   * STRICT REQUIREMENT: Only Presentation Maker and Admin Test are permitted to invoke image generation.
   */
  public async generateImage(options: GenerateImageOptions): Promise<GenerateImageResult> {
    const startTime = Date.now();

    // 1. Strict Exclusivity Enforcement: Image generation is strictly restricted to Presentation Maker only
    const allowedSources: string[] = ["presentation_maker", "admin_test"];
    if (!options.source || !allowedSources.includes(options.source)) {
      throw new Error(
        `AI image generation is exclusively reserved for Presentation Maker. Requests from "${options.source || "unknown"}" (such as Document Studio, Cover Designer, or General Documents) are strictly forbidden.`,
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

    // 3. Collect eligible providers sorted by priority
    const now = Date.now();
    const eligibleProviders = Array.from(this.providers.values())
      .filter((p) => {
        if (!p.enabled) return false;
        if (!p.apiKey || p.apiKey.trim().length < 6) return false;
        const cooldownUntil = this.cooldowns.get(p.id);
        if (cooldownUntil && cooldownUntil > now) return false;
        return true;
      })
      .sort((a, b) => a.priority - b.priority);

    if (eligibleProviders.length === 0) {
      return this.executeZeroFailureFallback(
        options,
        "No AI image providers are currently configured or enabled.",
        startTime,
      );
    }

    // 4. Try providers in priority sequence with auto-fallback
    let lastError = "No provider attempted";
    for (const provider of eligibleProviders) {
      const adapter = this.adapters.get(provider.id);
      if (!adapter) continue;

      const attemptStart = Date.now();
      try {
        const res = await adapter.generateImage(provider, options);
        const durationMs = Date.now() - attemptStart;

        // Record successful event
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
        const errorMsg = err instanceof Error ? err.message : String(err);
        lastError = errorMsg;

        // Apply temporary cooldown (2 minutes)
        this.cooldowns.set(provider.id, Date.now() + 120000);
        provider.lastError = errorMsg;
        provider.status = "error";

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
          errorCategory: errorMsg.includes("429") ? "Rate Limit Exceeded" : "Provider Error",
          errorMessage: errorMsg,
        });

        if (!this.settings.autoFallbackEnabled || !provider.fallbackEligible) {
          break;
        }
      }
    }

    // 5. Zero-Failure Contextual SVG Fallback (guarantees Presentation Maker never breaks)
    return this.executeZeroFailureFallback(
      options,
      `All primary providers failed (${lastError}). Activated high-fidelity contextual visual engine.`,
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
      errorMessage: reason,
    });

    return {
      success: true,
      imageUrl: synthesized.imageUrl,
      provider: "local-svg",
      model: "contextual-svg-engine",
      durationMs,
      format: "svg+xml",
      error: reason,
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
