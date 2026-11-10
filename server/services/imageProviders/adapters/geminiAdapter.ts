import type {
  IImageProviderAdapter,
  ImageProviderConfig,
  GenerateImageOptions,
  ProviderConnectionTestResult,
} from "../types";
import {
  callGeminiGenerateContent,
  DEFAULT_GEMINI_TEXT_MODEL,
  extractRateLimitHeaders,
  resolveSupportedGeminiModel,
} from "../../presentationAiClient";
import { redactSecrets } from "../../serverSecretStore";

export const GEMINI_PAID_IMAGE_MODELS = new Set([
  "imagen-3.0-generate-002",
  "imagen-3.0-fast-generate-001",
  "imagen-3.0-generate-001",
]);

export function isGeminiPaidImageModel(model: string): boolean {
  const normalized = (model || "").trim().toLowerCase();
  return normalized.startsWith("imagen-") || normalized.includes("-image") || GEMINI_PAID_IMAGE_MODELS.has(normalized);
}

export class GeminiImageAdapter implements IImageProviderAdapter {
  id = "gemini" as const;

  async testConnection(config: ImageProviderConfig): Promise<ProviderConnectionTestResult> {
    const apiKey = config.apiKey?.trim();
    const rawModel = (config.selectedModel || DEFAULT_GEMINI_TEXT_MODEL).trim();

    if (!apiKey) {
      return {
        success: false,
        latencyMs: 0,
        provider: "gemini",
        testedModel: rawModel,
        message: "Google Gemini API key is missing. Configure a key in Admin Dashboard (stored server-side).",
      };
    }

    // Paid Imagen models must stay disabled unless explicitly approved by admin
    if (isGeminiPaidImageModel(rawModel) && !config.allowPaidModelExecution) {
      return {
        success: false,
        latencyMs: 0,
        provider: "gemini",
        testedModel: rawModel,
        message: `Model "${rawModel}" requires Cloud Billing (not included in Gemini API Free Tier quotas) and is disabled under the Free-First policy. Select "${DEFAULT_GEMINI_TEXT_MODEL}" for free vector/text visuals, or explicitly approve Paid Providers first.`,
        quota: {
          officialLimit: 0,
          officialRemaining: 0,
          officialSource: "unavailable",
          officialLimitText: `${rawModel}: Paid Tier only (Free Tier quota = 0; disabled by default)`,
          isEstimate: false,
          refreshedAt: new Date().toISOString(),
        },
      };
    }

    // If paid Imagen execution WAS explicitly approved, test the actual :predict endpoint directly
    if (isGeminiPaidImageModel(rawModel) && config.allowPaidModelExecution) {
      const start = Date.now();
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(rawModel)}:predict`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
              instances: [{ prompt: "minimalist geometric circle icon" }],
              parameters: { sampleCount: 1, aspectRatio: "16:9", outputMimeType: "image/jpeg" },
            }),
            signal: AbortSignal.timeout(20000),
          },
        );
        const latencyMs = Date.now() - start;
        const rateLimitHeaders = extractRateLimitHeaders(res.headers);
        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          const rawMsg = errJson?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
          return {
            success: false,
            latencyMs,
            provider: "gemini",
            testedModel: rawModel,
            message: `Google Imagen API Error (${res.status}): ${redactSecrets(rawMsg)}`,
            rateLimitHeaders,
          };
        }
        return {
          success: true,
          latencyMs,
          provider: "gemini",
          testedModel: rawModel,
          message: `Paid Imagen model "${rawModel}" verified via live :predict request (${latencyMs}ms).`,
          rateLimitHeaders,
          quota: {
            officialSource: rateLimitHeaders ? "api_header" : "unavailable",
            officialLimitText: "Billed per generated image on Google Cloud Paid Tier.",
            isEstimate: !rateLimitHeaders,
            refreshedAt: new Date().toISOString(),
            rateLimitHeaders,
          },
        };
      } catch (err: any) {
        return {
          success: false,
          latencyMs: Date.now() - start,
          provider: "gemini",
          testedModel: rawModel,
          message: `Imagen connection error: ${redactSecrets(err?.message || String(err))}`,
        };
      }
    }

    // Standard Gemini text/SVG generation test against the actual selected model (never only GET /models)
    const testModel = resolveSupportedGeminiModel(rawModel);
    if (testModel !== rawModel) {
      return {
        success: false,
        latencyMs: 0,
        provider: "gemini",
        testedModel: rawModel,
        message: `Selected model "${rawModel}" is deprecated/unavailable to new users. Switch to "${DEFAULT_GEMINI_TEXT_MODEL}" and re-test.`,
      };
    }

    const genResult = await callGeminiGenerateContent({
      apiKey,
      model: testModel,
      prompt: 'Respond ONLY with valid JSON: {"status":"ok","provider":"gemini"}',
      responseMimeType: "application/json",
      temperature: 0,
      maxOutputTokens: 64,
      timeoutMs: 15000,
    });

    if (!genResult.success) {
      return {
        success: false,
        latencyMs: genResult.latencyMs,
        provider: "gemini",
        testedModel: testModel,
        message: genResult.errorMessage || `Gemini model "${testModel}" test failed.`,
        rateLimitHeaders: genResult.rateLimitHeaders,
      };
    }

    return {
      success: true,
      latencyMs: genResult.latencyMs,
      provider: "gemini",
      testedModel: testModel,
      message: `Verified Google Gemini "${testModel}" via live generateContent & JSON output (${genResult.latencyMs}ms).`,
      models: config.supportedModels,
      rateLimitHeaders: genResult.rateLimitHeaders,
      quota: {
        officialSource: genResult.rateLimitHeaders ? "api_header" : "unavailable",
        officialLimitText:
          "Per-project dynamic RPM/TPM/RPD managed by Google AI Studio (not returned via API; inspect AI Studio Rate Limits).",
        isEstimate: !genResult.rateLimitHeaders,
        refreshedAt: new Date().toISOString(),
        rateLimitHeaders: genResult.rateLimitHeaders,
      },
    };
  }

  async generateImage(
    config: ImageProviderConfig,
    options: GenerateImageOptions,
  ): Promise<{ imageUrl: string; format: "png" | "jpeg" | "svg+xml" }> {
    const apiKey = config.apiKey?.trim();
    if (!apiKey) {
      throw new Error("Google Gemini API key is not configured.");
    }

    const rawModel = (config.selectedModel || DEFAULT_GEMINI_TEXT_MODEL).trim();
    const aspectRatio = options.aspectRatio === "1:1" ? "1:1" : "16:9";

    // Strict Free-First enforcement for paid Imagen models
    if (isGeminiPaidImageModel(rawModel)) {
      const allowPaid = options.allowPaidProviders === true || config.allowPaidModelExecution === true;
      if (!allowPaid) {
        throw new Error(
          `Paid Imagen model "${rawModel}" is disabled under the Free-First policy. Use free programmatic diagrams or enable paid billing explicitly.`,
        );
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(rawModel)}:predict`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            instances: [{ prompt: options.prompt }],
            parameters: {
              sampleCount: 1,
              aspectRatio,
              outputMimeType: "image/jpeg",
              personGeneration: "allow_adult",
            },
          }),
          signal: AbortSignal.timeout(30000),
        },
      );

      if (!res.ok) {
        const errText = redactSecrets(await res.text().catch(() => ""));
        throw new Error(`Imagen 3 error (${res.status}): ${errText.slice(0, 200)}`);
      }

      const json = (await res.json()) as any;
      const b64 =
        json.predictions?.[0]?.bytesBase64Encoded ||
        json.predictions?.[0]?.image?.imageBytes;

      if (!b64) {
        throw new Error(`Imagen model "${rawModel}" returned no image payload.`);
      }

      return {
        imageUrl: `data:image/jpeg;base64,${b64}`,
        format: "jpeg",
      };
    }

    // Free-tier vector SVG diagram generation using configured Gemini Flash model (e.g. gemini-3.8-flash)
    const model = resolveSupportedGeminiModel(rawModel);
    const svgPrompt = `You are a presentation vector diagram designer.
Generate a clean presentation vector SVG diagram (16:9 aspect ratio, viewBox="0 0 960 540") for:
Slide Concept: "${options.concept || options.slideTitle || "Concept Illustration"}"
Prompt: "${options.prompt}"

STRICT RULES:
- Output ONLY valid raw <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540"> ... </svg>.
- Do not output markdown fences or backticks.
- Escape any ampersands as &amp;.
- Use clear geometric blocks, arrows, and concise readable typography.`;

    const gen = await callGeminiGenerateContent({
      apiKey,
      model,
      prompt: svgPrompt,
      temperature: 0.2,
      maxOutputTokens: 4096,
      timeoutMs: 20000,
    });

    if (!gen.success) {
      throw new Error(gen.errorMessage || `Gemini model "${model}" failed to generate vector graphic.`);
    }

    const svgMatch = gen.text.match(/<svg[\s\S]*?<\/svg>/i);
    if (!svgMatch?.[0]) {
      throw new Error(`Gemini model "${model}" returned non-SVG output for vector graphic request.`);
    }

    const b64 = Buffer.from(svgMatch[0], "utf-8").toString("base64");
    return {
      imageUrl: `data:image/svg+xml;base64,${b64}`,
      format: "svg+xml",
    };
  }
}
