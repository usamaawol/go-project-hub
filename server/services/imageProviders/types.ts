export type ImageProviderId = "gemini" | "huggingface" | "cloudflare" | "fal" | "replicate";

export type BillingStatus =
  | "free_tier"
  | "free_credits_then_paid"
  | "paid_required"
  | "local_free";

export interface QuotaInfo {
  total?: number;
  used?: number;
  remaining?: number | null;
  isEstimate: boolean;
  unit?: string;
  resetsAt?: string;
  officialLimit?: number | null;
  officialRemaining?: number | null;
  officialLimitText?: string;
  officialSource?: "api_header" | "api_endpoint" | "unavailable";
  appLimit?: number | null;
  refreshedAt?: string;
  rateLimitHeaders?: Record<string, string>;
}

export interface ImageProviderConfig {
  id: ImageProviderId;
  name: string;
  enabled: boolean;
  priority: number;
  fallbackEligible: boolean;
  selectedModel: string;
  supportedModels: string[];
  paidModels?: string[];
  apiKey: string;
  endpointUrl?: string; // e.g. Cloudflare Account ID or custom gateway
  status: "ready" | "needs_key" | "untested" | "error" | "rate_limited" | "paid_disabled";
  lastTestedAt?: string;
  lastSuccessfulTestAt?: string;
  lastTestedModel?: string;
  lastTestSuccess?: boolean;
  lastError?: string;
  freeTierInfo: string;
  billingTier?: "free" | "paid";
  billingStatus?: BillingStatus;
  allowPaidModelExecution?: boolean;
  quotaInfo?: QuotaInfo;
}

export interface GenerateImageOptions {
  prompt: string;
  aspectRatio?: "16:9" | "1:1";
  source: "presentation_maker" | "admin_test";
  providerId?: ImageProviderId;
  slideTitle?: string;
  concept?: string;
  style?: "illustration" | "diagram" | "photorealistic" | "minimalist";
  allowPaidProviders?: boolean;
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
  provider?: ImageProviderId;
  testedModel?: string;
  models?: string[];
  quota?: Partial<QuotaInfo>;
  rateLimitHeaders?: Record<string, string>;
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
  allowPaidProviders?: boolean;
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
