import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { ENV } from "../config/env";

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

export interface AdminSystemSettings {
  activeProvider: "gemini" | "openai" | "offline";
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
}

const SETTINGS_FILE = path.join(process.cwd(), "server", "config", "runtime-admin-settings.json");

// Default initial settings
const DEFAULT_SETTINGS: AdminSystemSettings = {
  activeProvider: "gemini",
  geminiApiKey: ENV.GEMINI_API_KEY || "",
  geminiModel: "gemini-2.5-flash",
  imagenModel: "imagen-3.0-generate-002",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: "gpt-4o-mini",
  aiEngineMode: "full",
  maxSlideCount: 20,
  aiTimeoutSeconds: 15,
  temperature: 0.7,
  maintenanceMode: false,
  announcement: {
    enabled: false,
    text: "DocuMind System Update: Gemini 2.5 Flash and Imagen 3 vision models are now globally available.",
    type: "info",
  },
};

// Initial Staff Directory for DocuMind Platform
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
    details: "Initialized Gemini 2.5 Flash and Imagen 3 vision pipeline globally for all users.",
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "log-2",
    staffName: "Elena Rostova",
    staffEmail: "elena.rostova@techcorp.io",
    action: "System Verification",
    details: "Ran automated latency and model health diagnostics on Google AI endpoints.",
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
try {
  if (fs.existsSync(SETTINGS_FILE)) {
    const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    activeSettings = { ...DEFAULT_SETTINGS, ...parsed.settings };
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

function persistToDisk() {
  try {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(
      SETTINGS_FILE,
      JSON.stringify(
        {
          settings: activeSettings,
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

/**
 * Returns current admin system settings (with option to mask key for UI)
 */
export function getAdminSettings(maskKey = true): AdminSystemSettings & {
  hasKeyConfigured: boolean;
  hasOpenAiKeyConfigured: boolean;
} {
  const key = activeSettings.geminiApiKey || ENV.GEMINI_API_KEY || "";
  const hasKeyConfigured = key.trim().length > 8;
  const oKey = activeSettings.openaiApiKey || process.env.OPENAI_API_KEY || "";
  const hasOpenAiKeyConfigured = oKey.trim().length > 8;

  let displayKey = "";
  if (hasKeyConfigured) {
    if (maskKey) {
      displayKey = key.slice(0, 6) + "••••••••••••••••" + key.slice(-4);
    } else {
      displayKey = key;
    }
  }

  let displayOpenAiKey = "";
  if (hasOpenAiKeyConfigured) {
    if (maskKey) {
      displayOpenAiKey = oKey.slice(0, 6) + "••••••••••••••••" + oKey.slice(-4);
    } else {
      displayOpenAiKey = oKey;
    }
  }

  return {
    ...activeSettings,
    geminiApiKey: displayKey,
    openaiApiKey: displayOpenAiKey,
    hasKeyConfigured,
    hasOpenAiKeyConfigured,
  };
}

/**
 * Returns active provider mode ("gemini" | "openai" | "offline")
 */
export function getActiveProvider(): "gemini" | "openai" | "offline" {
  return activeSettings.activeProvider || "gemini";
}

/**
 * Returns the effective unmasked Gemini API key for server presentation synthesis
 */
export function getEffectiveGeminiApiKey(): string {
  return (activeSettings.geminiApiKey || ENV.GEMINI_API_KEY || "").trim();
}

/**
 * Returns the effective unmasked OpenAI API key
 */
export function getEffectiveOpenAIApiKey(): string {
  return (activeSettings.openaiApiKey || process.env.OPENAI_API_KEY || "").trim();
}

/**
 * Updates admin system settings
 */
export function updateAdminSettings(
  updates: Partial<AdminSystemSettings>,
  author = { name: "Administrator", email: "admin@documind.app" },
): AdminSystemSettings {
  if (updates.activeProvider) {
    activeSettings.activeProvider = updates.activeProvider;
    recordStaffAuditLog(
      author.name,
      author.email,
      "Update AI Provider",
      `Switched default presentation engine to ${updates.activeProvider.toUpperCase()}.`,
    );
  }

  if (updates.geminiApiKey !== undefined) {
    // Only update if key actually changed and is not masked
    const trimmed = updates.geminiApiKey.trim();
    if (!trimmed.includes("••••")) {
      activeSettings.geminiApiKey = trimmed;
      recordStaffAuditLog(
        author.name,
        author.email,
        "Update Gemini API Key",
        trimmed ? "Updated Google Gemini & Imagen API credentials." : "Cleared Gemini API key.",
      );
    }
  }

  if (updates.openaiApiKey !== undefined) {
    const trimmed = updates.openaiApiKey.trim();
    if (!trimmed.includes("••••")) {
      activeSettings.openaiApiKey = trimmed;
      recordStaffAuditLog(
        author.name,
        author.email,
        "Update OpenAI API Key",
        trimmed ? "Updated OpenAI API credentials." : "Cleared OpenAI key.",
      );
    }
  }

  if (updates.aiEngineMode) {
    activeSettings.aiEngineMode = updates.aiEngineMode;
  }
  if (updates.geminiModel) {
    activeSettings.geminiModel = updates.geminiModel;
  }
  if (updates.imagenModel) {
    activeSettings.imagenModel = updates.imagenModel;
  }
  if (updates.openaiModel) {
    activeSettings.openaiModel = updates.openaiModel;
  }
  if (typeof updates.maxSlideCount === "number") {
    activeSettings.maxSlideCount = Math.max(3, Math.min(25, updates.maxSlideCount));
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
  return activeSettings;
}

/**
 * Tests connection to OpenAI API endpoint
 */
export async function testOpenAIConnection(keyOverride?: string): Promise<{
  success: boolean;
  latencyMs: number;
  modelsFound?: string[];
  message: string;
}> {
  const key = (keyOverride || getEffectiveOpenAIApiKey()).trim();
  if (!key) {
    return {
      success: false,
      latencyMs: 0,
      message: "No OpenAI API key provided or configured in the system.",
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
      message: err?.message || "Failed to contact OpenAI API.",
    };
  }
}

/**
 * Tests connection to Google Gemini API
 */
export async function testGeminiConnection(keyOverride?: string): Promise<{
  success: boolean;
  latencyMs: number;
  modelsFound?: string[];
  message: string;
}> {
  const key = (keyOverride || getEffectiveGeminiApiKey()).trim();

  if (!key) {
    return {
      success: false,
      latencyMs: 0,
      message: "No Gemini API key provided or configured in the system.",
    };
  }

  const startTime = Date.now();
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
      {
        method: "GET",
        signal: AbortSignal.timeout(8000),
      },
    );

    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      const errText = await res.text();
      let parsedErr = errText;
      try {
        const json = JSON.parse(errText);
        parsedErr = json.error?.message || errText;
      } catch {
        // ignore
      }
      return {
        success: false,
        latencyMs,
        message: `Google API Error (${res.status}): ${parsedErr.slice(0, 160)}`,
      };
    }

    const data = (await res.json()) as { models?: Array<{ name: string; displayName?: string }> };
    const modelNames = (data.models || []).map((m) => m.name.replace("models/", ""));
    const flashReady = modelNames.some((m) => m.includes("gemini"));

    return {
      success: true,
      latencyMs,
      modelsFound: modelNames.slice(0, 6),
      message: flashReady
        ? `Connection verified in ${latencyMs}ms. Gemini & Imagen endpoints operational.`
        : `Connected in ${latencyMs}ms. Available models: ${modelNames.slice(0, 3).join(", ")}`,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      latencyMs,
      message: err?.message || "Failed to contact Google Gemini API endpoint.",
    };
  }
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
    details,
    timestamp: new Date().toISOString(),
  };
  activeAuditLogs.unshift(log);
  if (activeAuditLogs.length > 100) {
    activeAuditLogs = activeAuditLogs.slice(0, 100);
  }
}
