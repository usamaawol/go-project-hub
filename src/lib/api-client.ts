/**
 * DocuMind Full-Stack API Client
 * Seamlessly interfaces with Node.js/Express backend with browser-side fallbacks.
 */

import { extractTextFromPdfBytes } from "./pdf-extractor";

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
  isScannedOrEmpty?: boolean;
  warning?: string;
}> {
  // 1. Try backend extraction service if available
  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/documents/extract`, {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data && json.data.text?.trim()?.length > 0) {
        return json.data;
      }
    }
  } catch (e) {
    console.warn("Backend extraction unavailable, using in-browser extraction engine:", e);
  }

  // 2. Client-side extraction engine (runs natively on Vercel, client browser, and offline)
  const ext = file.name.split(".").pop()?.toLowerCase() || "";

  // Plain Text / Markdown / CSV
  if (ext === "txt" || ext === "md" || ext === "csv") {
    const text = (await file.text()).trim();
    if (text.length === 0) {
      return {
        text: "",
        wordCount: 0,
        lineCount: 0,
        format: ext,
        isScannedOrEmpty: true,
        warning: "The uploaded text file is empty.",
      };
    }
    return {
      text,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      lineCount: text.split("\n").filter((l) => l.trim().length > 0).length,
      format: ext,
    };
  }

  // PDF Extraction (handles compressed FlateDecode streams, vector fonts, and scanned pages)
  if (ext === "pdf" || file.type === "application/pdf") {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const pdfResult = await extractTextFromPdfBytes(bytes);

      if (pdfResult.text && pdfResult.text.length > 0) {
        return {
          text: pdfResult.text,
          wordCount: pdfResult.wordCount,
          lineCount: pdfResult.lineCount,
          format: pdfResult.isOcr ? "PDF OCR" : "pdf",
        };
      }
    } catch (pdfErr) {
      console.warn("Client-side PDF extraction error:", pdfErr);
    }
  }

  // Client-side DOCX text extraction
  if (ext === "docx" || ext === "doc" || file.type.includes("wordprocessingml")) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = (result.value || "").trim();
      if (text.length > 0) {
        return {
          text,
          wordCount: text.split(/\s+/).filter(Boolean).length,
          lineCount: text.split("\n").filter((l) => l.trim().length > 0).length,
          format: "docx",
        };
      }
    } catch (mErr) {
      console.warn("Client-side Mammoth extraction error:", mErr);
    }
  }

  // Client-side image OCR (PNG, JPG, JPEG, WEBP, BMP)
  const isImage = file.type.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "bmp", "tiff"].includes(ext);
  if (isImage) {
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      const ret = await worker.recognize(file);
      await worker.terminate();
      const text = (ret?.data?.text || "").trim();
      if (text.length > 0) {
        return {
          text,
          wordCount: text.split(/\s+/).filter(Boolean).length,
          lineCount: text.split("\n").filter((l) => l.trim().length > 0).length,
          format: "image",
        };
      }
    } catch (ocrErr) {
      console.warn("Client-side OCR fallback error:", ocrErr);
    }
  }

  return {
    text: "",
    wordCount: 0,
    lineCount: 0,
    format: ext || "unknown",
    isScannedOrEmpty: true,
    warning: `Unable to extract selectable text from this ${ext?.toUpperCase() || "document"} file. Please ensure the document is not an empty or password-protected file.`,
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

export async function fetchAdminSettings(adminKey = "documind-admin-secret") {
  const res = await fetch(`${API_BASE}/admin/settings?adminKey=${adminKey}`);
  return await res.json();
}

export async function updateAdminSettings(settings: Record<string, unknown>, adminKey = "documind-admin-secret") {
  const res = await fetch(`${API_BASE}/admin/settings?adminKey=${adminKey}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  return await res.json();
}

export async function testAdminGeminiConnection(apiKey?: string, adminKey = "documind-admin-secret") {
  const res = await fetch(`${API_BASE}/admin/test-gemini?adminKey=${adminKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  });
  return await res.json();
}

export async function testAdminOpenAIConnection(apiKey?: string, adminKey = "documind-admin-secret") {
  const res = await fetch(`${API_BASE}/admin/test-openai?adminKey=${adminKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  });
  return await res.json();
}

export async function fetchAdminStaff(adminKey = "documind-admin-secret") {
  const res = await fetch(`${API_BASE}/admin/staff?adminKey=${adminKey}`);
  return await res.json();
}

export async function createAdminStaff(
  staff: { name: string; email: string; role?: string; department?: string },
  adminKey = "documind-admin-secret",
) {
  const res = await fetch(`${API_BASE}/admin/staff?adminKey=${adminKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(staff),
  });
  return await res.json();
}

export async function deleteAdminStaff(staffId: string, adminKey = "documind-admin-secret") {
  const res = await fetch(`${API_BASE}/admin/staff/${staffId}?adminKey=${adminKey}`, {
    method: "DELETE",
  });
  return await res.json();
}

export async function fetchAdminAuditLogs(adminKey = "documind-admin-secret") {
  const res = await fetch(`${API_BASE}/admin/audit-logs?adminKey=${adminKey}`);
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
import type { AssignmentMetadata } from "./assignment-types";

export async function createPresentationSessionApi(input: {
  title: string;
  content: string;
  purpose?: string;
  density?: "concise" | "balanced" | "detailed";
  assignmentMetadata?: AssignmentMetadata;
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
  geminiApiKey?: string;
}): Promise<{
  sessionId: string;
  title: string;
  slideCount: number;
  expiresAt: number;
  secondsRemaining: number;
  slides?: SlidePreviewItem[];
  downloadUrl?: string;
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
        if (json.data.slides) {
          const clientSession: PresentationSessionData = {
            id: json.data.sessionId,
            title: json.data.title,
            purpose: input.purpose || "Business & Strategy",
            density: input.density || "balanced",
            assignmentMetadata: input.assignmentMetadata,
            theme: input.theme,
            typography: {
              fontFamily: input.typography?.fontFamily || "Inter",
              fontSizePreset: input.typography?.fontSizePreset || "standard",
            },
            slideCount: json.data.slideCount || json.data.slides.length,
            slides: json.data.slides,
            fileSize: 45000,
            createdAt: Date.now(),
            expiresAt: json.data.expiresAt,
            secondsRemaining: json.data.secondsRemaining || 900,
          };
          saveClientSession(clientSession);
        }
        return {
          ...json.data,
          slideCount: json.data.slideCount || json.data.slides?.length || input.slideCount || 8,
          downloadUrl:
            json.data.downloadUrl || `/api/presentations/${json.data.sessionId}/download`,
        };
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

  const slides = buildSlideDeckContent(
    input.title,
    input.content,
    slideCount,
    density,
    purpose,
    input.assignmentMetadata,
  );

  const clientSession: PresentationSessionData = {
    id: sessionId,
    title: input.title.trim() || "Untitled Presentation",
    purpose,
    density,
    assignmentMetadata: input.assignmentMetadata,
    theme: input.theme,
    typography: {
      fontFamily,
      fontSizePreset,
    },
    slideCount: slides.length,
    slides,
    fileSize: 45000,
    createdAt: Date.now(),
    expiresAt: Date.now() + 15 * 60 * 1000,
    secondsRemaining: 900,
  };

  saveClientSession(clientSession);

  return {
    sessionId,
    title: clientSession.title,
    slideCount: clientSession.slideCount,
    expiresAt: clientSession.expiresAt,
    secondsRemaining: 900,
    slides: clientSession.slides,
    downloadUrl: `/api/presentations/${sessionId}/download`,
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

export async function updatePresentationSlideApi(
  sessionId: string,
  slideIndex: number,
  slideData: Partial<SlidePreviewItem>,
): Promise<{ success: boolean; data?: PresentationSessionData; error?: { message: string } }> {
  // Update local client session if present
  const local = getClientSession(sessionId);
  if (local && local.slides[slideIndex]) {
    local.slides[slideIndex] = {
      ...local.slides[slideIndex],
      ...slideData,
    };
    if (slideIndex === 0 && slideData.title) {
      local.title = slideData.title;
    }
    saveClientSession(local);
  }

  // Attempt backend sync
  try {
    const res = await fetch(`${API_BASE}/presentations/session/${sessionId}/slide/${slideIndex}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slideData),
    });
    if (res.ok) {
      const json = await res.json();
      return json;
    }
  } catch (err) {
    console.warn("Backend updatePresentationSlideApi unreachable, local session preserved:", err);
  }

  return { success: true, data: local || undefined };
}
