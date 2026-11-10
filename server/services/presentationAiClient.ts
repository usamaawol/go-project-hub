import { redactSecrets } from "./serverSecretStore";

export const DEFAULT_GEMINI_TEXT_MODEL = "gemini-3.8-flash";
export const DEPRECATED_GEMINI_MODELS = new Set(["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]);

export type FreeFallbackTextProviderId = "none" | "groq" | "openrouter" | "ollama" | "offline";

export type AiErrorKind =
  | "missing_key"
  | "auth_error"
  | "model_unavailable"
  | "quota_exhausted"
  | "paid_required"
  | "invalid_response"
  | "network_error";

export interface GeminiRequestOptions {
  apiKey: string;
  model?: string;
  systemInstruction?: string;
  prompt: string;
  pdfBase64?: string;
  responseMimeType?: "text/plain" | "application/json";
  responseSchema?: Record<string, unknown>;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
}

export interface GeminiResponseResult {
  success: boolean;
  text: string;
  parsedJson?: unknown;
  model: string;
  endpoint: string;
  latencyMs: number;
  httpStatus?: number;
  errorKind?: AiErrorKind;
  errorMessage?: string;
  rateLimitHeaders?: Record<string, string>;
}

/**
 * Resolves deprecated legacy Gemini model aliases (e.g. gemini-2.5-flash) to the current free-tier model.
 */
export function resolveSupportedGeminiModel(model?: string): string {
  const trimmed = (model || "").trim();
  if (!trimmed || DEPRECATED_GEMINI_MODELS.has(trimmed)) {
    return DEFAULT_GEMINI_TEXT_MODEL;
  }
  return trimmed;
}

export function extractRateLimitHeaders(headers: Headers): Record<string, string> | undefined {
  const relevant: Record<string, string> = {};
  headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      lower.includes("ratelimit") ||
      lower === "retry-after" ||
      lower.startsWith("x-compute-") ||
      lower.startsWith("x-credits-")
    ) {
      relevant[lower] = value;
    }
  });
  return Object.keys(relevant).length > 0 ? relevant : undefined;
}

export function extractGeminiCandidateText(json: any): string {
  const parts = json?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .filter((p: any) => typeof p?.text === "string" && !p?.thought)
    .map((p: any) => p.text)
    .join("")
    .trim();
}

export function parseStructuredJsonText(rawText: string): unknown {
  const trimmed = (rawText || "").trim();
  if (!trimmed) {
    throw new Error("Empty response returned when structured JSON output was expected.");
  }
  const stripped = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(stripped);
}

/**
 * Calls the official Gemini Developer API v1beta :generateContent endpoint using x-goog-api-key header.
 * Supports plain text, structured JSON (responseMimeType + responseSchema), and multimodal PDF inputs.
 */
export async function callGeminiGenerateContent(
  options: GeminiRequestOptions,
): Promise<GeminiResponseResult> {
  const apiKey = (options.apiKey || "").trim();
  const model = (options.model || DEFAULT_GEMINI_TEXT_MODEL).trim();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  if (!apiKey) {
    return {
      success: false,
      text: "",
      model,
      endpoint,
      latencyMs: 0,
      errorKind: "missing_key",
      errorMessage: "Google Gemini API key is missing.",
    };
  }

  const parts: Array<Record<string, unknown>> = [];
  if (options.pdfBase64) {
    parts.push({
      inlineData: {
        mimeType: "application/pdf",
        data: options.pdfBase64,
      },
    });
  }
  parts.push({ text: options.prompt });

  const generationConfig: Record<string, unknown> = {
    temperature: typeof options.temperature === "number" ? options.temperature : 0.2,
    maxOutputTokens: options.maxOutputTokens || 4096,
  };
  if (options.responseMimeType) {
    generationConfig.responseMimeType = options.responseMimeType;
  }
  if (options.responseSchema) {
    generationConfig.responseSchema = options.responseSchema;
  }

  const payload: Record<string, unknown> = {
    contents: [{ role: "user", parts }],
    generationConfig,
  };
  if (options.systemInstruction) {
    payload.systemInstruction = { parts: [{ text: options.systemInstruction }] };
  }

  const start = Date.now();
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(options.timeoutMs || 25000),
    });
    const latencyMs = Date.now() - start;
    const rateLimitHeaders = extractRateLimitHeaders(res.headers);

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      let apiMsg = errBody;
      try {
        const parsedErr = JSON.parse(errBody);
        apiMsg = parsedErr?.error?.message || errBody;
      } catch {
        // retain plain text error
      }
      const safeMsg = redactSecrets(apiMsg).slice(0, 260) || `HTTP ${res.status} ${res.statusText}`;

      let errorKind: AiErrorKind = "network_error";
      let humanMsg = `Google AI Studio Error (${res.status}): ${safeMsg}`;

      if (res.status === 401 || res.status === 403) {
        errorKind = "auth_error";
        humanMsg = `Google AI Studio rejected the API key (${res.status}): ${safeMsg}`;
      } else if (
        res.status === 404 ||
        safeMsg.toLowerCase().includes("no longer available") ||
        safeMsg.toLowerCase().includes("not found")
      ) {
        errorKind = "model_unavailable";
        humanMsg = `Gemini model "${model}" is unavailable (${res.status}): ${safeMsg}`;
      } else if (
        res.status === 429 ||
        safeMsg.toLowerCase().includes("quota") ||
        safeMsg.toLowerCase().includes("resource_exhausted") ||
        safeMsg.toLowerCase().includes("rate limit")
      ) {
        if (safeMsg.includes("limit: 0")) {
          errorKind = "paid_required";
          humanMsg = `Gemini model "${model}" has zero free-tier quota (billing required) and is blocked under Free-First policy: ${safeMsg}`;
        } else {
          errorKind = "quota_exhausted";
          humanMsg = `Gemini Free Tier rate/quota limit reached (HTTP ${res.status}). Paid fallback is disabled: ${safeMsg}`;
        }
      }

      return {
        success: false,
        text: "",
        model,
        endpoint,
        latencyMs,
        httpStatus: res.status,
        errorKind,
        errorMessage: humanMsg,
        rateLimitHeaders,
      };
    }

    const json = (await res.json()) as any;
    if (json?.promptFeedback?.blockReason) {
      return {
        success: false,
        text: "",
        model,
        endpoint,
        latencyMs,
        httpStatus: res.status,
        errorKind: "invalid_response",
        errorMessage: `Gemini blocked request content: ${json.promptFeedback.blockReason}`,
        rateLimitHeaders,
      };
    }

    const text = extractGeminiCandidateText(json);
    if (!text) {
      return {
        success: false,
        text: "",
        model,
        endpoint,
        latencyMs,
        httpStatus: res.status,
        errorKind: "invalid_response",
        errorMessage: `Gemini model "${model}" returned an empty candidate response.`,
        rateLimitHeaders,
      };
    }

    let parsedJson: unknown;
    if (options.responseMimeType === "application/json") {
      try {
        parsedJson = parseStructuredJsonText(text);
      } catch (parseErr: any) {
        return {
          success: false,
          text,
          model,
          endpoint,
          latencyMs,
          httpStatus: res.status,
          errorKind: "invalid_response",
          errorMessage: `Gemini returned malformed JSON: ${parseErr?.message || "parse failure"}`,
          rateLimitHeaders,
        };
      }
    }

    return {
      success: true,
      text,
      parsedJson,
      model,
      endpoint,
      latencyMs,
      httpStatus: res.status,
      rateLimitHeaders,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    return {
      success: false,
      text: "",
      model,
      endpoint,
      latencyMs,
      errorKind: "network_error",
      errorMessage: redactSecrets(err?.message || "Failed to contact Gemini Developer API."),
    };
  }
}

export interface FreeFallbackTextRequest {
  provider: Exclude<FreeFallbackTextProviderId, "none" | "offline">;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  systemInstruction?: string;
  prompt: string;
  jsonMode?: boolean;
  temperature?: number;
  timeoutMs?: number;
}

export const FREE_FALLBACK_DEFAULTS: Record<
  Exclude<FreeFallbackTextProviderId, "none" | "offline">,
  { label: string; defaultModel: string; defaultUrl: string; billingInfo: string }
> = {
  groq: {
    label: "Groq Free Tier (LPU)",
    defaultModel: "llama-3.3-70b-versatile",
    defaultUrl: "https://api.groq.com/openai/v1/chat/completions",
    billingInfo: "Free tier available without credit card (subject to RPM/TPM/TPD caps).",
  },
  openrouter: {
    label: "OpenRouter (:free models only)",
    defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
    defaultUrl: "https://openrouter.ai/api/v1/chat/completions",
    billingInfo: "Free :free endpoints only (~20 RPM / ~50 RPD without credit top-up).",
  },
  ollama: {
    label: "Ollama Local Open-Weight Engine",
    defaultModel: "llama3.2",
    defaultUrl: "http://localhost:11434",
    billingInfo: "100% Free & Private local inference (runs on your own machine).",
  },
};

/**
 * Invokes an explicitly configured free-tier fallback text provider (Groq, OpenRouter :free, or Ollama local).
 * Enforces Free-First rules (rejects non-:free OpenRouter models when paid services are disabled).
 */
export async function callFreeFallbackTextProvider(
  options: FreeFallbackTextRequest,
  allowPaidProviders = false,
): Promise<GeminiResponseResult> {
  const meta = FREE_FALLBACK_DEFAULTS[options.provider];
  const model = (options.model || meta.defaultModel).trim();
  const start = Date.now();

  if (options.provider === "openrouter" && !allowPaidProviders && !model.endsWith(":free")) {
    return {
      success: false,
      text: "",
      model,
      endpoint: meta.defaultUrl,
      latencyMs: 0,
      errorKind: "paid_required",
      errorMessage: `OpenRouter model "${model}" is not a ":free" variant and is blocked under Free-First policy.`,
    };
  }

  if (options.provider === "ollama") {
    const baseUrl = (options.baseUrl || meta.defaultUrl).replace(/\/+$/, "");
    const endpoint = `${baseUrl}/api/chat`;
    try {
      const messages = [
        ...(options.systemInstruction ? [{ role: "system", content: options.systemInstruction }] : []),
        { role: "user", content: options.prompt },
      ];
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          stream: false,
          ...(options.jsonMode ? { format: "json" } : {}),
          options: { temperature: options.temperature ?? 0.2 },
          messages,
        }),
        signal: AbortSignal.timeout(options.timeoutMs || 20000),
      });
      const latencyMs = Date.now() - start;
      if (!res.ok) {
        const errText = redactSecrets(await res.text().catch(() => ""));
        return {
          success: false,
          text: "",
          model,
          endpoint,
          latencyMs,
          httpStatus: res.status,
          errorKind: "network_error",
          errorMessage: `Ollama error (${res.status}): ${errText.slice(0, 180)}`,
        };
      }
      const json = (await res.json()) as any;
      const text = String(json?.message?.content || "").trim();
      if (!text) {
        return {
          success: false,
          text: "",
          model,
          endpoint,
          latencyMs,
          errorKind: "invalid_response",
          errorMessage: "Ollama returned an empty response.",
        };
      }
      const parsedJson = options.jsonMode ? parseStructuredJsonText(text) : undefined;
      return {
        success: true,
        text,
        parsedJson,
        model,
        endpoint,
        latencyMs,
        httpStatus: res.status,
      };
    } catch (err: any) {
      return {
        success: false,
        text: "",
        model,
        endpoint,
        latencyMs: Date.now() - start,
        errorKind: "network_error",
        errorMessage: redactSecrets(
          `Ollama endpoint (${endpoint}) unreachable: ${err?.message || "connection failed"}`,
        ),
      };
    }
  }

  // OpenAI-compatible free providers: Groq / OpenRouter :free
  const apiKey = (options.apiKey || "").trim();
  if (!apiKey) {
    return {
      success: false,
      text: "",
      model,
      endpoint: meta.defaultUrl,
      latencyMs: 0,
      errorKind: "missing_key",
      errorMessage: `${meta.label} API key is not configured.`,
    };
  }

  try {
    const messages = [
      ...(options.systemInstruction ? [{ role: "system", content: options.systemInstruction }] : []),
      { role: "user", content: options.prompt },
    ];
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };
    if (options.provider === "openrouter") {
      headers["HTTP-Referer"] = "https://documind.app";
      headers["X-Title"] = "DocuMind Presentation Maker";
    }

    const res = await fetch(meta.defaultUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.2,
        ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.timeout(options.timeoutMs || 20000),
    });
    const latencyMs = Date.now() - start;
    const rateLimitHeaders = extractRateLimitHeaders(res.headers);

    if (!res.ok) {
      const errBody = redactSecrets(await res.text().catch(() => ""));
      return {
        success: false,
        text: "",
        model,
        endpoint: meta.defaultUrl,
        latencyMs,
        httpStatus: res.status,
        errorKind: res.status === 429 ? "quota_exhausted" : res.status === 401 || res.status === 403 ? "auth_error" : "network_error",
        errorMessage: `${meta.label} error (${res.status}): ${errBody.slice(0, 200)}`,
        rateLimitHeaders,
      };
    }

    const json = (await res.json()) as any;
    const text = String(json?.choices?.[0]?.message?.content || "").trim();
    const parsedJson = options.jsonMode ? parseStructuredJsonText(text) : undefined;
    return {
      success: true,
      text,
      parsedJson,
      model,
      endpoint: meta.defaultUrl,
      latencyMs,
      httpStatus: res.status,
      rateLimitHeaders,
    };
  } catch (err: any) {
    return {
      success: false,
      text: "",
      model,
      endpoint: meta.defaultUrl,
      latencyMs: Date.now() - start,
      errorKind: "network_error",
      errorMessage: redactSecrets(err?.message || `Failed to contact ${meta.label}.`),
    };
  }
}

/**
 * Generates a minimal, valid 1-page in-memory PDF for Gemini PDF understanding verification.
 */
export function buildDiagnosticSamplePdfBase64(): string {
  const textContent = "BT /F1 12 Tf 50 150 Td (DocuMind PDF Diagnostic: Quantum Annealing Overview 2026) Tj ET";
  const objs = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${Buffer.byteLength(textContent, "utf8")} >>\nstream\n${textContent}\nendstream\nendobj\n`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objs) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += obj;
  }
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objs.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, "utf8").toString("base64");
}
