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
