export type AdminTab =
  | "overview"
  | "providers"
  | "image-gen"
  | "users"
  | "presentations"
  | "limits"
  | "activity-logs"
  | "settings"
  | "security"
  | "health";

export type BillingStatus =
  | "free_tier"
  | "free_credits_then_paid"
  | "paid_required"
  | "local_free";

export interface ProviderQuotaInfo {
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

export interface ProviderItem {
  id: "gemini" | "huggingface" | "cloudflare" | "fal" | "replicate";
  name: string;
  enabled: boolean;
  priority: number;
  fallbackEligible: boolean;
  selectedModel: string;
  supportedModels: string[];
  paidModels?: string[];
  apiKey: string;
  maskedKey?: string;
  isConfigured: boolean;
  keySource?: "env" | "firestore" | "server_vault" | "none";
  endpointUrl?: string;
  status: "ready" | "needs_key" | "untested" | "error" | "rate_limited" | "paid_disabled";
  lastTestedAt?: string;
  lastSuccessfulTestAt?: string;
  lastTestedModel?: string;
  lastTestSuccess?: boolean;
  lastError?: string;
  freeTierInfo: string;
  billingTier?: "free" | "paid";
  billingStatus?: BillingStatus;
  quotaInfo?: ProviderQuotaInfo;
}

export interface ProviderAlertItem {
  id: string;
  providerId: "gemini" | "huggingface" | "cloudflare" | "fal" | "replicate";
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

export interface ImageSettingsItem {
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

export interface ImageLogItem {
  id: string;
  timestamp: string;
  source: "presentation_maker" | "admin_test";
  prompt: string;
  concept?: string;
  provider: string;
  model: string;
  status: "success" | "failed" | "fallback";
  durationMs: number;
  errorCategory?: string;
  errorMessage?: string;
}

export interface AdminUserItem {
  uid: string;
  displayName: string;
  email: string;
  role: "admin" | "user";
  plan: "pro" | "free";
  providerId: string;
  createdAt: string;
  lastActive?: string;
}

export interface PresentationSessionItem {
  id: string;
  title: string;
  purpose: string;
  slideCount: number;
  themeName: string;
  hasVisuals: boolean;
  visualCount: number;
  createdAt: number;
  expiresAt: number;
  secondsRemaining: number;
  fileSize: number;
}

export interface StaffAuditLogItem {
  id: string;
  staffName: string;
  staffEmail: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface AdminMetrics {
  totalUsers: number;
  proPlanUsers: number;
  freePlanUsers: number;
  proConversionRate: string;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  successRate: string;
  totalFeedback: number;
  averageFeedbackRating: number;
  uptimeSeconds: number;
  databaseConnected: boolean;
  memoryUsageMb: number;
  totalTemplates: number;
  toolUsageBreakdown: Array<{ name: string; count: number; percentage: number }>;
  dailyTrend: Array<{
    day: string;
    viewers: number;
    pageViews: number;
    newUsers: number;
    proUses: number;
    jobs: number;
  }>;
}

export interface ProviderConnectionSnapshotItem {
  success: boolean;
  testedAt: string;
  lastSuccessfulTestAt?: string;
  model: string;
  message: string;
  latencyMs: number;
  capabilities?: {
    text: boolean;
    json: boolean;
    pdf?: boolean;
  };
  rateLimitHeaders?: Record<string, string>;
}

export interface AdminSystemSettingsState {
  activeProvider?: "gemini" | "groq" | "openrouter" | "ollama" | "openai" | "offline";
  geminiApiKey: string;
  geminiModel: string;
  imagenModel: string;
  fallbackTextProvider?: "none" | "groq" | "openrouter" | "ollama" | "offline";
  fallbackTextModel?: string;
  ollamaBaseUrl?: string;
  groqApiKey?: string;
  openrouterApiKey?: string;
  openaiApiKey?: string;
  openaiModel?: string;
  allowPaidProviders?: boolean;
  aiEngineMode: "full" | "balanced" | "local";
  maxSlideCount: number;
  aiTimeoutSeconds: number;
  temperature: number;
  maintenanceMode: boolean;
  announcement: {
    enabled: boolean;
    text: string;
    type: "info" | "warning" | "success";
  };
  hasKeyConfigured?: boolean;
  hasOpenAiKeyConfigured?: boolean;
  hasGroqKeyConfigured?: boolean;
  hasOpenRouterKeyConfigured?: boolean;
  keySource?: string;
  geminiLastTest?: ProviderConnectionSnapshotItem;
  fallbackLastTest?: ProviderConnectionSnapshotItem;
}

export const DEFAULT_PROVIDER_ITEMS: ProviderItem[] = [
  {
    id: "gemini",
    name: "Google Gemini / AI Studio",
    enabled: true,
    priority: 1,
    fallbackEligible: true,
    selectedModel: "gemini-3.8-flash",
    supportedModels: [
      "gemini-3.8-flash",
      "gemini-3.5-flash-lite",
      "imagen-3.0-generate-002",
      "imagen-3.0-fast-generate-001",
    ],
    paidModels: ["imagen-3.0-generate-002", "imagen-3.0-fast-generate-001"],
    apiKey: "",
    isConfigured: false,
    keySource: "none",
    status: "needs_key",
    billingTier: "free",
    billingStatus: "free_tier",
    freeTierInfo:
      "Gemini 3.8 Flash uses Gemini API Free Tier quotas for text & vector diagrams. Imagen 3 image models require Google Cloud Billing (disabled by default).",
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
    isConfigured: false,
    keySource: "none",
    status: "needs_key",
    billingTier: "free",
    billingStatus: "free_credits_then_paid",
    freeTierInfo:
      "Free HF accounts receive ~$0.10/mo in Inference Providers credits (~few FLUX runs); halts at HTTP 402 with no auto-billing.",
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
    isConfigured: false,
    keySource: "none",
    status: "needs_key",
    billingTier: "free",
    billingStatus: "free_tier",
    freeTierInfo:
      "Free tier grants 10,000 Neurons/day resetting at 00:00 UTC without requiring a paid Workers plan.",
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
    isConfigured: false,
    keySource: "none",
    status: "paid_disabled",
    billingTier: "paid",
    billingStatus: "paid_required",
    freeTierInfo:
      "Initial sign-up credits only; requires pay-as-you-go billing thereafter. Disabled unless Paid Providers are explicitly approved.",
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
    isConfigured: false,
    keySource: "none",
    status: "paid_disabled",
    billingTier: "paid",
    billingStatus: "paid_required",
    freeTierInfo:
      "Pay-per-second cloud GPU billing after brief trial. Disabled unless Paid Providers are explicitly approved.",
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
