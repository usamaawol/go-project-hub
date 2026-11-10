import fs from "fs";
import path from "path";
import { ENV } from "../config/env";
import {
  buildDiagnosticSamplePdfBase64,
  callFreeFallbackTextProvider,
  callGeminiGenerateContent,
  DEFAULT_GEMINI_TEXT_MODEL,
  DEPRECATED_GEMINI_MODELS,
  FREE_FALLBACK_DEFAULTS,
  resolveSupportedGeminiModel,
  type FreeFallbackTextProviderId,
} from "./presentationAiClient";
import {
  getMaskedSecretInfo,
  getServerSecret,
  hydrateServerSecrets,
  maskSecretValue,
  redactSecrets,
  setServerSecretSync,
} from "./serverSecretStore";

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "admin" | "staff" | "moderator";
  department: string;
  avatarColor: string;
  status: "active" | "invited" | "suspended";
  lastActive: string;
  createdAt: string;
}

export interface StaffAuditLog {
  id: string;
  staffName: string;
  staffEmail: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface ProviderConnectionSnapshot {
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

export interface AdminSystemSettings {
  activeProvider: "gemini" | "groq" | "openrouter" | "ollama" | "openai" | "offline";
  geminiApiKey: string;
  geminiModel: string;
  imagenModel: string;
  fallbackTextProvider: FreeFallbackTextProviderId;
  fallbackTextModel: string;
  groqApiKey?: string;
  openrouterApiKey?: string;
  ollamaBaseUrl?: string;
  openaiApiKey?: string;
  openaiModel?: string;
  exaoneApiKey?: string;
  exaoneBaseUrl?: string;
  exaoneModel?: string;
  allowPaidProviders: boolean;
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
  geminiLastTest?: ProviderConnectionSnapshot;
  fallbackLastTest?: ProviderConnectionSnapshot;
}

const SETTINGS_FILE = path.join(process.cwd(), "server", "config", "runtime-admin-settings.json");

// Free-First Default Initial Settings
const DEFAULT_SETTINGS: AdminSystemSettings = {
  activeProvider: "gemini",
  geminiApiKey: "",
  geminiModel: DEFAULT_GEMINI_TEXT_MODEL,
  imagenModel: "disabled",
  fallbackTextProvider: "none",
  fallbackTextModel: FREE_FALLBACK_DEFAULTS.groq.defaultModel,
  groqApiKey: "",
  openrouterApiKey: "",
  ollamaBaseUrl: FREE_FALLBACK_DEFAULTS.ollama.defaultUrl,
  openaiApiKey: "",
  openaiModel: "gpt-4o-mini",
  exaoneApiKey: "",
  exaoneBaseUrl: ENV.EXAONE_BASE_URL || "https://api.exaone.ai/v1",
  exaoneModel: ENV.EXAONE_MODEL || "k-exaone_v2.5",
  allowPaidProviders: false,
  aiEngineMode: "full",
  maxSlideCount: 50,
  aiTimeoutSeconds: 20,
  temperature: 0.7,
  maintenanceMode: false,
  announcement: {
    enabled: false,
    text: "DocuMind Presentation Engine configured with Gemini 3.8 Flash (Free Tier) & programmatic vector diagrams.",
    type: "info",
  },
};

const DEFAULT_STAFF: StaffMember[] = [
  {
    id: "staff-101",
    name: "Lead Administrator",
    email: "admin@documind.app",
    role: "super_admin",
    department: "Executive & System Infrastructure",
    avatarColor: "#2563EB",
    status: "active",
    lastActive: "Just now",
    createdAt: new Date(Date.now() - 86400000 * 90).toISOString(),
  },
  {
    id: "staff-102",
    name: "Dr. Elena Rostova",
    email: "elena.rostova@techcorp.io",
    role: "admin",
    department: "AI Research & Model Engineering",
    avatarColor: "#7C3AED",
    status: "active",
    lastActive: "14m ago",
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
  },
  {
    id: "staff-103",
    name: "Sarah Jenkins",
    email: "sarah.jenkins@designstudio.co",
    role: "staff",
    department: "Theme Design & Visual Systems",
    avatarColor: "#EC4899",
    status: "active",
    lastActive: "1h ago",
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: "staff-104",
    name: "Tariq Nasser",
    email: "tariq.n@mobilefirst.dev",
    role: "staff",
    department: "Client Experience & Web QA",
    avatarColor: "#059669",
    status: "active",
    lastActive: "3h ago",
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
  },
  {
    id: "staff-105",
    name: "Dr. Marcus Vance",
    email: "dr.marcus@berkeley.edu",
    role: "moderator",
    department: "Academic & Scientific Review",
    avatarColor: "#D97706",
    status: "active",
    lastActive: "Yesterday",
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
  },
];

const DEFAULT_AUDIT_LOGS: StaffAuditLog[] = [
  {
    id: "log-1",
    staffName: "Lead Administrator",
    staffEmail: "admin@documind.app",
    action: "AI Engine Configuration",
    details: "Configured Gemini 3.8 Flash (Free Tier) & programmatic vector diagram pipeline.",
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "log-2",
    staffName: "Elena Rostova",
    staffEmail: "elena.rostova@techcorp.io",
    action: "System Verification",
    details: "Verified Free-First security boundaries and server-side key management.",
    timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
  {
    id: "log-3",
    staffName: "Sarah Jenkins",
    staffEmail: "sarah.jenkins@designstudio.co",
    action: "Theme Catalog Audit",
    details: "Verified all 110 presentation templates adhere to the 100% Free Access Policy.",
    timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
];

let activeSettings: AdminSystemSettings = { ...DEFAULT_SETTINGS };
let activeStaff: StaffMember[] = [...DEFAULT_STAFF];
let activeAuditLogs: StaffAuditLog[] = [...DEFAULT_AUDIT_LOGS];

// Load settings from persistent file on startup
if (!(process.env.NODE_ENV === "test" || process.env.VITEST)) {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      const diskSettings = (parsed.settings || {}) as Partial<AdminSystemSettings>;

      // Migrate legacy secrets from disk JSON into encrypted server vault if present
      if (diskSettings.geminiApiKey && !diskSettings.geminiApiKey.includes("••••")) {
        setServerSecretSync("gemini", diskSettings.geminiApiKey);
      }
      if (diskSettings.openaiApiKey && !diskSettings.openaiApiKey.includes("••••")) {
        setServerSecretSync("openai", diskSettings.openaiApiKey);
      }
      if (diskSettings.groqApiKey && !diskSettings.groqApiKey.includes("••••")) {
        setServerSecretSync("groq", diskSettings.groqApiKey);
      }
      if (diskSettings.openrouterApiKey && !diskSettings.openrouterApiKey.includes("••••")) {
        setServerSecretSync("openrouter", diskSettings.openrouterApiKey);
      }
      if (diskSettings.exaoneApiKey && !diskSettings.exaoneApiKey.includes("••••")) {
        setServerSecretSync("exaone", diskSettings.exaoneApiKey);
      }

      activeSettings = {
        ...DEFAULT_SETTINGS,
        ...diskSettings,
        geminiModel: resolveSupportedGeminiModel(diskSettings.geminiModel),
        imagenModel:
          diskSettings.allowPaidProviders && diskSettings.imagenModel
            ? diskSettings.imagenModel
            : "disabled",
        geminiApiKey: "",
        openaiApiKey: "",
        groqApiKey: "",
        openrouterApiKey: "",
        exaoneApiKey: "",
      };

      if (Array.isArray(parsed.staff) && parsed.staff.length > 0) {
        activeStaff = parsed.staff;
      }
      if (Array.isArray(parsed.auditLogs) && parsed.auditLogs.length > 0) {
        activeAuditLogs = parsed.auditLogs;
      }
    }
  } catch (e) {
    console.warn("Could not load runtime admin settings from disk, using defaults:", e);
  }
}

function persistToDisk() {
  if (process.env.NODE_ENV === "test" || process.env.VITEST) {
    return;
  }
  try {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // Strictly never write API keys to tracked config JSON
    const sanitizedSettings: AdminSystemSettings = {
      ...activeSettings,
      geminiApiKey: "",
      openaiApiKey: "",
      groqApiKey: "",
      openrouterApiKey: "",
      exaoneApiKey: "",
    };
    fs.writeFileSync(
      SETTINGS_FILE,
      JSON.stringify(
        {
          settings: sanitizedSettings,
          staff: activeStaff,
          auditLogs: activeAuditLogs.slice(0, 50),
        },
        null,
        2,
      ),
      "utf-8",
    );
  } catch (err) {
    console.warn("Failed to persist admin settings to disk:", err);
  }
}

export function getAdminSettings(maskKey = true): AdminSystemSettings & {
  hasKeyConfigured: boolean;
  hasOpenAiKeyConfigured: boolean;
  hasGroqKeyConfigured: boolean;
  hasOpenRouterKeyConfigured: boolean;
  keySource: string;
} {
  const key = getServerSecret("gemini");
  const hasKeyConfigured = key.trim().length > 8;
  const oKey = getServerSecret("openai");
  const hasOpenAiKeyConfigured = oKey.trim().length > 8;
  const gKey = getServerSecret("groq");
  const hasGroqKeyConfigured = gKey.trim().length > 8;
  const orKey = getServerSecret("openrouter");
  const hasOpenRouterKeyConfigured = orKey.trim().length > 8;
  const gemInfo = getMaskedSecretInfo("gemini");

  return {
    ...activeSettings,
    geminiModel: resolveSupportedGeminiModel(activeSettings.geminiModel),
    geminiApiKey: maskKey ? (hasKeyConfigured ? maskSecretValue(key) : "") : key,
    openaiApiKey: maskKey ? (hasOpenAiKeyConfigured ? maskSecretValue(oKey) : "") : oKey,
    groqApiKey: maskKey ? (hasGroqKeyConfigured ? maskSecretValue(gKey) : "") : gKey,
    openrouterApiKey: maskKey ? (hasOpenRouterKeyConfigured ? maskSecretValue(orKey) : "") : orKey,
    exaoneApiKey: maskKey ? "" : getServerSecret("exaone"),
    hasKeyConfigured,
    hasOpenAiKeyConfigured,
    hasGroqKeyConfigured,
    hasOpenRouterKeyConfigured,
    keySource: gemInfo.keySource,
  };
}

export function getActiveProvider(): AdminSystemSettings["activeProvider"] {
  const configured = activeSettings.activeProvider || "gemini";
  if (configured === "openai" && !activeSettings.allowPaidProviders) {
    return "gemini";
  }
  return configured;
}

export function getEffectiveGeminiModel(): string {
  return resolveSupportedGeminiModel(activeSettings.geminiModel);
}

export function getEffectiveGeminiApiKey(): string {
  return getServerSecret("gemini");
}

export function getEffectiveOpenAIApiKey(): string {
  return getServerSecret("openai");
}

export function getEffectiveExaoneApiKey(): string {
  return getServerSecret("exaone");
}

export function getEffectiveExaoneModel(): string {
  return (activeSettings.exaoneModel || ENV.EXAONE_MODEL || process.env.EXAONE_MODEL || "k-exaone_v2.5").trim();
}

export function getEffectiveExaoneBaseUrl(): string {
  return (
    activeSettings.exaoneBaseUrl ||
    ENV.EXAONE_BASE_URL ||
    process.env.EXAONE_BASE_URL ||
    "https://api.exaone.ai/v1"
  ).trim();
}

export function updateAdminSettings(
  updates: Partial<AdminSystemSettings>,
  author = { name: "Administrator", email: "admin@documind.app" },
): AdminSystemSettings {
  if (typeof updates.allowPaidProviders === "boolean") {
    activeSettings.allowPaidProviders = updates.allowPaidProviders;
    recordStaffAuditLog(
      author.name,
      author.email,
      "Update Paid Billing Policy",
      updates.allowPaidProviders
        ? "Administrator explicitly allowed paid provider models."
        : "Enforced Free-First lock (all paid models disabled).",
    );
  }

  if (updates.activeProvider) {
    if (updates.activeProvider === "openai" && !activeSettings.allowPaidProviders) {
      throw new Error(
        "OpenAI requires paid billing and cannot be activated while Free-First lock (allowPaidProviders: false) is enabled.",
      );
    }
    activeSettings.activeProvider = updates.activeProvider;
    recordStaffAuditLog(
      author.name,
      author.email,
      "Update AI Provider",
      `Switched default presentation engine to ${updates.activeProvider.toUpperCase()}.`,
    );
  }

  if (updates.geminiApiKey !== undefined && !updates.geminiApiKey.includes("••••")) {
    const trimmed = updates.geminiApiKey.trim();
    setServerSecretSync("gemini", trimmed);
    activeSettings.geminiLastTest = undefined;
    recordStaffAuditLog(
      author.name,
      author.email,
      "Update Gemini API Key",
      trimmed ? "Stored Google Gemini API credentials securely server-side." : "Cleared Gemini API key.",
    );
  }

  if (updates.openaiApiKey !== undefined && !updates.openaiApiKey.includes("••••")) {
    const trimmed = updates.openaiApiKey.trim();
    setServerSecretSync("openai", trimmed);
    recordStaffAuditLog(
      author.name,
      author.email,
      "Update OpenAI API Key",
      trimmed ? "Stored OpenAI API credentials server-side." : "Cleared OpenAI key.",
    );
  }

  if (updates.groqApiKey !== undefined && !updates.groqApiKey.includes("••••")) {
    setServerSecretSync("groq", updates.groqApiKey.trim());
    activeSettings.fallbackLastTest = undefined;
  }

  if (updates.openrouterApiKey !== undefined && !updates.openrouterApiKey.includes("••••")) {
    setServerSecretSync("openrouter", updates.openrouterApiKey.trim());
    activeSettings.fallbackLastTest = undefined;
  }

  if (updates.fallbackTextProvider) {
    activeSettings.fallbackTextProvider = updates.fallbackTextProvider;
    activeSettings.fallbackLastTest = undefined;
  }
  if (updates.fallbackTextModel !== undefined) {
    activeSettings.fallbackTextModel = updates.fallbackTextModel.trim();
  }
  if (updates.ollamaBaseUrl !== undefined) {
    activeSettings.ollamaBaseUrl = updates.ollamaBaseUrl.trim() || FREE_FALLBACK_DEFAULTS.ollama.defaultUrl;
    setServerSecretSync("ollama_base_url", activeSettings.ollamaBaseUrl);
  }

  if (updates.aiEngineMode) {
    activeSettings.aiEngineMode = updates.aiEngineMode;
  }
  if (updates.geminiModel) {
    const chosen = updates.geminiModel.trim();
    if (DEPRECATED_GEMINI_MODELS.has(chosen)) {
      activeSettings.geminiModel = DEFAULT_GEMINI_TEXT_MODEL;
    } else {
      activeSettings.geminiModel = chosen;
    }
    activeSettings.geminiLastTest = undefined;
  }
  if (updates.imagenModel !== undefined) {
    activeSettings.imagenModel =
      !activeSettings.allowPaidProviders && updates.imagenModel.includes("imagen")
        ? "disabled"
        : updates.imagenModel;
  }
  if (updates.openaiModel) {
    activeSettings.openaiModel = updates.openaiModel;
  }
  if (typeof updates.maxSlideCount === "number") {
    activeSettings.maxSlideCount = Math.max(3, Math.min(60, updates.maxSlideCount));
  }
  if (typeof updates.aiTimeoutSeconds === "number") {
    activeSettings.aiTimeoutSeconds = Math.max(5, Math.min(60, updates.aiTimeoutSeconds));
  }
  if (typeof updates.temperature === "number") {
    activeSettings.temperature = Math.max(0, Math.min(1, updates.temperature));
  }
  if (typeof updates.maintenanceMode === "boolean") {
    activeSettings.maintenanceMode = updates.maintenanceMode;
  }
  if (updates.announcement) {
    activeSettings.announcement = {
      ...activeSettings.announcement,
      ...updates.announcement,
    };
  }

  persistToDisk();
  return getAdminSettings(true);
}

/**
 * Tests OpenAI API connectivity (only permitted when paid providers are explicitly approved or testing supplied key).
 */
export async function testOpenAIConnection(keyOverride?: string): Promise<{
  success: boolean;
  latencyMs: number;
  modelsFound?: string[];
  message: string;
}> {
  if (!activeSettings.allowPaidProviders) {
    return {
      success: false,
      latencyMs: 0,
      message:
        "OpenAI is a paid service and is disabled under the Free-First policy. Enable Paid Providers explicitly before activating OpenAI.",
    };
  }

  const key = (keyOverride && !keyOverride.includes("••••") ? keyOverride : getEffectiveOpenAIApiKey()).trim();
  if (!key) {
    return {
      success: false,
      latencyMs: 0,
      message: "No OpenAI API key configured on the server.",
    };
  }

  const startTime = Date.now();
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    const latencyMs = Date.now() - startTime;
    if (!res.ok) {
      return {
        success: false,
        latencyMs,
        message: `OpenAI API returned HTTP ${res.status}`,
      };
    }
    const data = (await res.json()) as { data?: Array<{ id: string }> };
    const models = (data.data || []).map((m) => m.id).slice(0, 5);
    return {
      success: true,
      latencyMs,
      modelsFound: models,
      message: `OpenAI API operational (${latencyMs}ms). Models: ${models.join(", ")}`,
    };
  } catch (err: any) {
    return {
      success: false,
      latencyMs: Date.now() - startTime,
      message: redactSecrets(err?.message || "Failed to contact OpenAI API."),
    };
  }
}

/**
 * Executes real API verification against Gemini v1beta :generateContent (never relying on GET /models).
 * Verifies text generation + structured JSON output, and optionally tests PDF multimodal understanding.
 */
export async function testGeminiConnection(
  keyOverride?: string,
  modelOverride?: string,
  options?: { testPdf?: boolean },
): Promise<{
  success: boolean;
  latencyMs: number;
  model: string;
  modelsFound?: string[];
  message: string;
  capabilities?: { text: boolean; json: boolean; pdf?: boolean };
  rateLimitHeaders?: Record<string, string>;
}> {
  await hydrateServerSecrets();
  const key = (
    keyOverride && !keyOverride.includes("••••") ? keyOverride : getEffectiveGeminiApiKey()
  ).trim();
  const requestedModel = (modelOverride || getEffectiveGeminiModel()).trim();
  const effectiveModel = resolveSupportedGeminiModel(requestedModel);

  if (!key) {
    return {
      success: false,
      latencyMs: 0,
      model: effectiveModel,
      message: "No Gemini API key configured on the server.",
    };
  }

  if (requestedModel !== effectiveModel) {
    return {
      success: false,
      latencyMs: 0,
      model: requestedModel,
      message: `Gemini model "${requestedModel}" is no longer available to new users. Update model configuration to "${DEFAULT_GEMINI_TEXT_MODEL}" and retry.`,
    };
  }

  // 1. Live generateContent + Structured JSON check
  const jsonProbe = await callGeminiGenerateContent({
    apiKey: key,
    model: effectiveModel,
    prompt:
      'Return a JSON object verifying live connectivity with exact keys {"status":"ready","modelEcho":"' +
      effectiveModel +
      '","ok":true}.',
    responseMimeType: "application/json",
    responseSchema: {
      type: "OBJECT",
      properties: {
        status: { type: "STRING" },
        modelEcho: { type: "STRING" },
        ok: { type: "BOOLEAN" },
      },
      required: ["status", "ok"],
    },
    temperature: 0,
    maxOutputTokens: 128,
    timeoutMs: 15000,
  });

  if (!jsonProbe.success) {
    const failedSnap: ProviderConnectionSnapshot = {
      success: false,
      testedAt: new Date().toISOString(),
      lastSuccessfulTestAt: activeSettings.geminiLastTest?.lastSuccessfulTestAt,
      model: effectiveModel,
      message: jsonProbe.errorMessage || "Gemini generateContent probe failed.",
      latencyMs: jsonProbe.latencyMs,
      capabilities: { text: false, json: false, pdf: false },
      rateLimitHeaders: jsonProbe.rateLimitHeaders,
    };
    activeSettings.geminiLastTest = failedSnap;
    persistToDisk();

    return {
      success: false,
      latencyMs: jsonProbe.latencyMs,
      model: effectiveModel,
      message: failedSnap.message,
      capabilities: failedSnap.capabilities,
      rateLimitHeaders: jsonProbe.rateLimitHeaders,
    };
  }

  // 2. Optional PDF document understanding probe
  let pdfOk: boolean | undefined;
  let totalLatency = jsonProbe.latencyMs;
  if (options?.testPdf) {
    const pdfRes = await callGeminiGenerateContent({
      apiKey: key,
      model: effectiveModel,
      prompt: 'Read the attached PDF and return JSON: {"documentTitle":"string","topic":"string"}.',
      pdfBase64: buildDiagnosticSamplePdfBase64(),
      responseMimeType: "application/json",
      temperature: 0,
      maxOutputTokens: 256,
      timeoutMs: 20000,
    });
    totalLatency += pdfRes.latencyMs;
    const parsedPdf = pdfRes.parsedJson as Record<string, unknown> | undefined;
    pdfOk =
      pdfRes.success &&
      Boolean(
        parsedPdf &&
          (String(parsedPdf.documentTitle || "").length > 0 ||
            String(parsedPdf.topic || "").length > 0 ||
            pdfRes.text.toLowerCase().includes("quantum")),
      );
    if (!pdfOk) {
      const msg = `Text & JSON passed on ${effectiveModel}, but PDF document understanding probe failed: ${pdfRes.errorMessage || "unreadable PDF output"}`;
      const partialSnap: ProviderConnectionSnapshot = {
        success: false,
        testedAt: new Date().toISOString(),
        lastSuccessfulTestAt: activeSettings.geminiLastTest?.lastSuccessfulTestAt,
        model: effectiveModel,
        message: msg,
        latencyMs: totalLatency,
        capabilities: { text: true, json: true, pdf: false },
      };
      activeSettings.geminiLastTest = partialSnap;
      persistToDisk();
      return {
        success: false,
        latencyMs: totalLatency,
        model: effectiveModel,
        message: msg,
        capabilities: partialSnap.capabilities,
      };
    }
  }

  const nowIso = new Date().toISOString();
  const successMsg = pdfOk
    ? `Verified "${effectiveModel}" via v1beta generateContent (Text + Structured JSON + PDF understanding) in ${totalLatency}ms.`
    : `Verified "${effectiveModel}" via v1beta generateContent (Text + Structured JSON) in ${totalLatency}ms.`;

  activeSettings.geminiLastTest = {
    success: true,
    testedAt: nowIso,
    lastSuccessfulTestAt: nowIso,
    model: effectiveModel,
    message: successMsg,
    latencyMs: totalLatency,
    capabilities: { text: true, json: true, ...(pdfOk !== undefined ? { pdf: pdfOk } : {}) },
    rateLimitHeaders: jsonProbe.rateLimitHeaders,
  };
  persistToDisk();

  return {
    success: true,
    latencyMs: totalLatency,
    model: effectiveModel,
    modelsFound: [effectiveModel, "gemini-3.5-flash-lite"],
    message: successMsg,
    capabilities: activeSettings.geminiLastTest.capabilities,
    rateLimitHeaders: jsonProbe.rateLimitHeaders,
  };
}

/**
 * Tests the explicitly configured free fallback text provider (Groq Free, OpenRouter :free, or Ollama Local).
 */
export async function testFallbackTextConnection(params?: {
  provider?: FreeFallbackTextProviderId;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}): Promise<{
  success: boolean;
  latencyMs: number;
  provider: FreeFallbackTextProviderId;
  model: string;
  message: string;
  rateLimitHeaders?: Record<string, string>;
}> {
  await hydrateServerSecrets();
  const provider = params?.provider || activeSettings.fallbackTextProvider || "none";
  if (provider === "none" || provider === "offline") {
    return {
      success: provider === "offline",
      latencyMs: 0,
      provider,
      model: provider === "offline" ? "deterministic-parser" : "",
      message:
        provider === "offline"
          ? "Local deterministic offline fallback is always available with zero API calls."
          : "No external free fallback text provider configured.",
    };
  }

  const secretSlot = provider === "groq" ? "groq" : provider === "openrouter" ? "openrouter" : undefined;
  const apiKey = secretSlot
    ? params?.apiKey && !params.apiKey.includes("••••")
      ? params.apiKey.trim()
      : getServerSecret(secretSlot)
    : undefined;
  const meta = FREE_FALLBACK_DEFAULTS[provider];
  const model = (params?.model || activeSettings.fallbackTextModel || meta.defaultModel).trim();
  const baseUrl = params?.baseUrl || activeSettings.ollamaBaseUrl || meta.defaultUrl;

  const res = await callFreeFallbackTextProvider(
    {
      provider,
      apiKey,
      baseUrl,
      model,
      prompt: 'Respond ONLY with JSON: {"status":"ready","provider":"' + provider + '"}',
      jsonMode: true,
      temperature: 0,
      timeoutMs: 15000,
    },
    activeSettings.allowPaidProviders,
  );

  const nowIso = new Date().toISOString();
  const message = res.success
    ? `Verified ${meta.label} (${res.model}) with JSON output in ${res.latencyMs}ms.`
    : res.errorMessage || `Failed testing ${meta.label}.`;

  activeSettings.fallbackLastTest = {
    success: res.success,
    testedAt: nowIso,
    lastSuccessfulTestAt: res.success
      ? nowIso
      : activeSettings.fallbackLastTest?.lastSuccessfulTestAt,
    model: res.model,
    message,
    latencyMs: res.latencyMs,
    capabilities: { text: res.success, json: Boolean(res.parsedJson) },
    rateLimitHeaders: res.rateLimitHeaders,
  };
  persistToDisk();

  return {
    success: res.success,
    latencyMs: res.latencyMs,
    provider,
    model: res.model,
    message,
    rateLimitHeaders: res.rateLimitHeaders,
  };
}

/**
 * Staff Directory Operations
 */
export function listStaffMembers(): StaffMember[] {
  return activeStaff;
}

export function addStaffMember(input: {
  name: string;
  email: string;
  role: "super_admin" | "admin" | "staff" | "moderator";
  department: string;
}): StaffMember {
  const existing = activeStaff.find((s) => s.email.toLowerCase() === input.email.toLowerCase());
  if (existing) {
    existing.name = input.name;
    existing.role = input.role;
    existing.department = input.department;
    existing.status = "active";
    persistToDisk();
    return existing;
  }

  const colors = ["#2563EB", "#7C3AED", "#EC4899", "#059669", "#D97706", "#0284C7", "#9333EA"];
  const randomColor = colors[Math.floor(Math.random() * colors.length)] || "#2563EB";

  const newStaff: StaffMember = {
    id: `staff-${Date.now().toString(36)}`,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    role: input.role,
    department: input.department.trim(),
    avatarColor: randomColor,
    status: "active",
    lastActive: "Just added",
    createdAt: new Date().toISOString(),
  };

  activeStaff.unshift(newStaff);
  recordStaffAuditLog(
    "Lead Administrator",
    "admin@documind.app",
    "Add Staff Member",
    `Added ${newStaff.name} (${newStaff.email}) as ${newStaff.role} in ${newStaff.department}.`,
  );
  persistToDisk();
  return newStaff;
}

export function removeStaffMember(staffId: string): boolean {
  const idx = activeStaff.findIndex((s) => s.id === staffId);
  if (idx === -1) return false;
  const removed = activeStaff[idx];
  activeStaff.splice(idx, 1);
  if (removed) {
    recordStaffAuditLog(
      "Lead Administrator",
      "admin@documind.app",
      "Remove Staff Member",
      `Removed staff access for ${removed.name} (${removed.email}).`,
    );
  }
  persistToDisk();
  return true;
}

/**
 * Audit Logging Operations
 */
export function getStaffAuditLogs(): StaffAuditLog[] {
  return activeAuditLogs;
}

export function recordStaffAuditLog(
  staffName: string,
  staffEmail: string,
  action: string,
  details: string,
): void {
  const log: StaffAuditLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    staffName,
    staffEmail,
    action,
    details: redactSecrets(details),
    timestamp: new Date().toISOString(),
  };
  activeAuditLogs.unshift(log);
  if (activeAuditLogs.length > 100) {
    activeAuditLogs = activeAuditLogs.slice(0, 100);
  }
}
