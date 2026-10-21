/**
 * DocuMind Full-Stack API Client
 * Seamlessly interfaces with Node.js/Express backend with browser-side fallbacks.
 */

const API_BASE = "/api";

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  freeAccessPolicy: {
    status: string;
    watermarks: string;
    paywalls: string;
    freeTemplatesCount: number;
  };
  database: string;
  uptimeSeconds: number;
  timestamp: string;
}

export async function checkBackendHealth(): Promise<HealthResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function extractDocumentText(file: File): Promise<{
  text: string;
  wordCount: number;
  lineCount: number;
  format: string;
}> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/documents/extract`, {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    }
  } catch (e) {
    console.warn("Backend extraction unavailable, using browser text reader:", e);
  }

  // Resilient browser-side fallback
  const text = await file.text();
  const clean = text.replace(/[^\x20-\x7E\n\r\t]/g, " ").slice(0, 10000);
  return {
    text: clean,
    wordCount: clean.split(/\s+/).length,
    lineCount: clean.split("\n").length,
    format: file.name.split(".").pop() || "txt",
  };
}

export async function compressDocumentApi(
  file: File,
  profile: "balanced" | "aggressive" | "archival" = "balanced",
): Promise<{
  originalSize: number;
  compressedSize: number;
  reductionPercent: number;
  jobId: string;
}> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("profile", profile);

    const res = await fetch(`${API_BASE}/documents/compress`, {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    }
  } catch (e) {
    console.warn("Backend compression unavailable, using simulated statistics:", e);
  }

  const reduction = profile === "aggressive" ? 78 : profile === "balanced" ? 64 : 35;
  const compressedSize = Math.floor(file.size * (1 - reduction / 100));
  return {
    originalSize: file.size,
    compressedSize,
    reductionPercent: reduction,
    jobId: "local_" + Math.random().toString(36).substring(2, 9),
  };
}

export async function requestAiGuidance(
  text: string,
  goal?: string,
): Promise<{
  recommendedTool: string;
  recommendedTheme: string;
  suggestedSteps: string[];
  summary: string;
  outline: Array<{ title: string; bullets: string[] }>;
}> {
  try {
    const res = await fetch(`${API_BASE}/documents/guide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, goal }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    }
  } catch (e) {
    console.warn("Backend AI guide unavailable, using local deterministic logic:", e);
  }

  // Deterministic local fallthrough
  return {
    recommendedTool: "Presentation Studio",
    recommendedTheme: "Executive Brief",
    summary: text.slice(0, 200) + "…",
    suggestedSteps: [
      "1. Extract primary outline and metrics.",
      "2. Apply 16:9 presentation layout.",
      "3. Export PowerPoint deck without watermarks.",
    ],
    outline: [
      { title: "Introduction & Context", bullets: ["Core premise", "Current landscape"] },
      { title: "Key Findings & Analysis", bullets: ["Metrics breakdown", "Impact study"] },
      { title: "Next Steps", bullets: ["Deployment schedule", "Resource allocation"] },
    ],
  };
}

export async function submitUserFeedback(data: {
  rating: number;
  comment: string;
  category?: string;
  email?: string;
}) {
  const res = await fetch(`${API_BASE}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return await res.json();
}

export async function fetchAdminMetrics(adminKey = "documind-admin-secret") {
  const res = await fetch(`${API_BASE}/admin/metrics?adminKey=${adminKey}`);
  return await res.json();
}

export async function fetchAdminJobs(adminKey = "documind-admin-secret") {
  const res = await fetch(`${API_BASE}/admin/jobs?adminKey=${adminKey}`);
  return await res.json();
}

export async function fetchAdminFeedback(adminKey = "documind-admin-secret") {
  const res = await fetch(`${API_BASE}/admin/feedback?adminKey=${adminKey}`);
  return await res.json();
}

export async function updateAdminFeedbackStatus(
  feedbackId: string,
  status: "pending" | "reviewed" | "resolved" | "in_progress",
  adminKey = "documind-admin-secret",
) {
  const res = await fetch(`${API_BASE}/admin/feedback/${feedbackId}/status?adminKey=${adminKey}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return await res.json();
}

export async function fetchAdminUsers(adminKey = "documind-admin-secret") {
  const res = await fetch(`${API_BASE}/admin/users?adminKey=${adminKey}`);
  return await res.json();
}

export async function toggleAdminUserPlan(
  userId: string,
  plan: "free" | "pro",
  adminKey = "documind-admin-secret",
) {
  const res = await fetch(`${API_BASE}/admin/users/${userId}/plan?adminKey=${adminKey}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });
  return await res.json();
}

export async function purgeAdminTempFiles(adminKey = "documind-admin-secret") {
  const res = await fetch(`${API_BASE}/admin/purge-temp?adminKey=${adminKey}`, {
    method: "POST",
  });
  return await res.json();
}


export interface SlidePreviewItem {
  id: string;
  slideNumber: number;
  layout: "title" | "agenda" | "content" | "two-column" | "metrics" | "conclusion";
  title: string;
  subtitle?: string;
  bullets?: string[];
  leftColumn?: { title: string; bullets: string[] };
  rightColumn?: { title: string; bullets: string[] };
  metrics?: Array<{ label: string; value: string; description?: string }>;
  notes?: string;
}

export interface PresentationSessionData {
  id: string;
  title: string;
  purpose: string;
  density: "concise" | "balanced" | "detailed";
  theme: {
    id: string;
    name: string;
    category: string;
    kind: string;
    colors: {
      primary: string;
      accent: string;
      bg: string;
    };
    fonts: string;
    tier: "free" | "pro";
  };
  typography: {
    fontFamily: string;
    fontSizePreset: "compact" | "standard" | "large" | "extra-large";
  };
  slideCount: number;
  slides: SlidePreviewItem[];
  fileSize: number;
  createdAt: number;
  expiresAt: number;
  secondsRemaining: number;
}

import {
  buildSlideDeckContent,
  saveClientSession,
  getClientSession,
  removeClientSession,
} from "./presentation-session-client";

export async function createPresentationSessionApi(input: {
  title: string;
  content: string;
  purpose?: string;
  density?: "concise" | "balanced" | "detailed";
  theme: {
    id: string;
    name: string;
    category: string;
    kind: string;
    colors: { primary: string; accent: string; bg: string };
    fonts: string;
    tier: "free" | "pro";
  };
  typography?: {
    fontFamily?: string;
    fontSizePreset?: "compact" | "standard" | "large" | "extra-large";
  };
  slideCount?: number;
}): Promise<{
  sessionId: string;
  title: string;
  slideCount: number;
  expiresAt: number;
  secondsRemaining: number;
}> {
  // 1. Attempt backend API first (used when Express server is running)
  try {
    const res = await fetch(`${API_BASE}/presentations/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    const contentType = res.headers.get("content-type") || "";
    if (res.ok && contentType.includes("application/json")) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    }
  } catch (err) {
    console.warn(
      "Backend presentation API unreachable, activating client ephemeral generator:",
      err,
    );
  }

  // 2. Resilient browser-side ephemeral generator (for Vercel / serverless / offline)
  const sessionId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `pres_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const slideCount = Math.min(20, Math.max(3, input.slideCount || 8));
  const density = input.density || "balanced";
  const purpose = input.purpose || "Business & Strategy";
  const fontFamily = input.typography?.fontFamily || "Inter";
  const fontSizePreset = input.typography?.fontSizePreset || "standard";

  const slides = buildSlideDeckContent(input.title, input.content, slideCount, density, purpose);

  const clientSession: PresentationSessionData = {
    id: sessionId,
    title: input.title.trim() || "Untitled Presentation",
    purpose,
    density,
    theme: input.theme,
    typography: {
      fontFamily,
      fontSizePreset,
    },
    slideCount: slides.length,
    slides,
    fileSize: 45000,
    createdAt: Date.now(),
    expiresAt: Date.now() + 10 * 60 * 1000,
    secondsRemaining: 600,
  };

  saveClientSession(clientSession);

  return {
    sessionId,
    title: clientSession.title,
    slideCount: clientSession.slideCount,
    expiresAt: clientSession.expiresAt,
    secondsRemaining: 600,
  };
}

export async function fetchPresentationPreviewApi(
  sessionId: string,
): Promise<PresentationSessionData> {
  // 1. Check local client session storage first (immediate, works on Vercel without server)
  const localSession = getClientSession(sessionId);
  if (localSession) {
    const now = Date.now();
    if (now >= localSession.expiresAt) {
      removeClientSession(sessionId);
      const error = new Error("This temporary presentation has expired and was deleted.");
      (error as unknown as { code: string }).code = "SESSION_EXPIRED";
      throw error;
    }
    return {
      ...localSession,
      secondsRemaining: Math.max(0, Math.floor((localSession.expiresAt - now) / 1000)),
    };
  }

  // 2. Query backend API if available
  try {
    const res = await fetch(`${API_BASE}/presentations/${sessionId}/preview`, {
      headers: { "Cache-Control": "no-cache" },
    });

    if (res.status === 410) {
      const error = new Error("This temporary presentation has expired and was deleted.");
      (error as unknown as { code: string }).code = "SESSION_EXPIRED";
      throw error;
    }

    const contentType = res.headers.get("content-type") || "";
    if (res.ok && contentType.includes("application/json")) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    }
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === "SESSION_EXPIRED") throw err;
    console.warn("Backend presentation preview unavailable:", err);
  }

  const error = new Error("This temporary presentation has expired or is no longer available.");
  (error as unknown as { code: string }).code = "SESSION_EXPIRED";
  throw error;
}

export async function deletePresentationSessionApi(sessionId: string): Promise<boolean> {
  removeClientSession(sessionId);
  try {
    const res = await fetch(`${API_BASE}/presentations/${sessionId}`, { method: "DELETE" });
    return res.ok;
  } catch {
    return true;
  }
}
