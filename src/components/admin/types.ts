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

export interface ProviderItem {
  id: "gemini" | "huggingface" | "cloudflare" | "fal" | "replicate";
  name: string;
  enabled: boolean;
  priority: number;
  fallbackEligible: boolean;
  selectedModel: string;
  supportedModels: string[];
  apiKey: string;
  maskedKey?: string;
  isConfigured: boolean;
  endpointUrl?: string;
  status: "ready" | "needs_key" | "error" | "rate_limited";
  lastTestedAt?: string;
  lastError?: string;
  freeTierInfo: string;
  quotaInfo?: {
    total?: number;
    used?: number;
    remaining?: number;
    isEstimate: boolean;
    unit?: string;
  };
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

export interface AdminSystemSettingsState {
  activeProvider?: "gemini" | "openai" | "offline";
  geminiApiKey: string;
  geminiModel: string;
  imagenModel: string;
  openaiApiKey?: string;
  openaiModel?: string;
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
}

export const DEFAULT_PROVIDER_ITEMS: ProviderItem[] = [
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
    apiKey: "",
    isConfigured: false,
    status: "needs_key",
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
    apiKey: "",
    isConfigured: false,
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
    apiKey: "",
    endpointUrl: "",
    isConfigured: false,
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
    supportedModels: ["fal-ai/flux/schnell", "fal-ai/fast-sdxl"],
    apiKey: "",
    isConfigured: false,
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
    supportedModels: ["black-forest-labs/flux-schnell", "stability-ai/sdxl"],
    apiKey: "",
    isConfigured: false,
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
