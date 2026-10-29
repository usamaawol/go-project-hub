export type ImageProviderId = "gemini" | "huggingface" | "cloudflare" | "fal" | "replicate";

export interface QuotaInfo {
  total?: number;
  used?: number;
  remaining?: number;
  isEstimate: boolean;
  unit?: string;
  resetsAt?: string;
}

export interface ImageProviderConfig {
  id: ImageProviderId;
  name: string;
  enabled: boolean;
  priority: number;
  fallbackEligible: boolean;
  selectedModel: string;
  supportedModels: string[];
  apiKey: string;
  endpointUrl?: string; // e.g. Cloudflare Account ID or custom gateway
  status: "ready" | "needs_key" | "error" | "rate_limited";
  lastTestedAt?: string;
  lastError?: string;
  freeTierInfo: string;
  quotaInfo?: QuotaInfo;
}

export interface GenerateImageOptions {
  prompt: string;
  aspectRatio?: "16:9" | "1:1";
  source: "presentation_maker" | "admin_test";
  slideTitle?: string;
  concept?: string;
  style?: "illustration" | "diagram" | "photorealistic" | "minimalist";
}

export interface GenerateImageResult {
  success: boolean;
  imageUrl: string;
  provider: ImageProviderId | "local-svg";
  model: string;
  durationMs: number;
  error?: string;
  format: "png" | "jpeg" | "svg+xml";
}

export interface ProviderConnectionTestResult {
  success: boolean;
  latencyMs: number;
  message: string;
  models?: string[];
  quota?: QuotaInfo;
}

export interface IImageProviderAdapter {
  id: ImageProviderId;
  testConnection(config: ImageProviderConfig): Promise<ProviderConnectionTestResult>;
  generateImage(
    config: ImageProviderConfig,
    options: GenerateImageOptions,
  ): Promise<{ imageUrl: string; format: "png" | "jpeg" | "svg+xml" }>;
}

export interface ProviderAlert {
  id: string;
  providerId: ImageProviderId;
  providerName: string;
  severity: "warning" | "critical" | "info";
  title: string;
  message: string;
  timestamp: string;
  remainingQuota: number;
  totalQuota: number;
  unit: string;
  cascadedTo?: string;
  dismissed?: boolean;
}

export interface ImageGenerationSettings {
  globallyEnabled: boolean;
  newUserAccess: boolean;
  maxGenerationsPerPresentation: number;
  maxDailyGenerationsPerUser: number;
  maxConcurrentRequests: number;
  timeoutSeconds: number;
  autoFallbackEnabled: boolean;
  preferredAspectRatio: "16:9" | "1:1";
}

export interface ImageGenerationLogEntry {
  id: string;
  timestamp: string;
  source: "presentation_maker" | "admin_test";
  prompt: string;
  concept?: string;
  provider: ImageProviderId | "local-svg";
  model: string;
  status: "success" | "failed" | "fallback";
  durationMs: number;
  errorCategory?: string;
  errorMessage?: string;
  userId?: string;
}
