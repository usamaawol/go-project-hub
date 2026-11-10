import type {
  IImageProviderAdapter,
  ImageProviderConfig,
  GenerateImageOptions,
  ProviderConnectionTestResult,
} from "../types";
import { extractRateLimitHeaders } from "../../presentationAiClient";
import { redactSecrets } from "../../serverSecretStore";

function buildHfRouterUrl(model: string): string {
  const cleanModel = (model || "black-forest-labs/FLUX.1-schnell")
    .trim()
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `https://router.huggingface.co/hf-inference/models/${cleanModel}`;
}

function classifyHfError(status: number, rawBody: string, model: string): string {
  const snippet = redactSecrets(rawBody).slice(0, 220);
  if (status === 401) {
    return `Hugging Face rejected token (HTTP 401 Invalid/Revoked Token). Generate a fine-grained token at huggingface.co/settings/tokens.`;
  }
  if (status === 403) {
    return `Hugging Face token lacks permission for Inference Providers (HTTP 403). Enable "Make calls to Inference Providers" on your token.`;
  }
  if (status === 402) {
    return `Hugging Face free monthly inference credits exhausted (HTTP 402 Payment Required). Free-First policy prevents automatic paid billing.`;
  }
  if (status === 404 || status === 410) {
    return `Hugging Face model "${model}" was not found or is unavailable on Serverless Inference Router (${status}): ${snippet}`;
  }
  if (status === 429) {
    return `Hugging Face Inference rate limit reached (HTTP 429): ${snippet}`;
  }
  if (status === 503) {
    return `Hugging Face model "${model}" is currently warming up / unavailable (HTTP 503): ${snippet}`;
  }
  return `Hugging Face Inference error (HTTP ${status}): ${snippet}`;
}

export class HuggingFaceImageAdapter implements IImageProviderAdapter {
  id = "huggingface" as const;

  async testConnection(config: ImageProviderConfig): Promise<ProviderConnectionTestResult> {
    const apiKey = config.apiKey?.trim();
    const model = (config.selectedModel || "black-forest-labs/FLUX.1-schnell").trim();

    if (!apiKey) {
      return {
        success: false,
        latencyMs: 0,
        provider: "huggingface",
        testedModel: model,
        message: "Hugging Face User Access Token is missing.",
      };
    }

    const start = Date.now();
    try {
      // 1. Validate Hugging Face account/token independently via Hugging Face Auth API
      const whoRes = await fetch("https://huggingface.co/api/whoami-v2", {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10000),
      });

      if (!whoRes.ok) {
        const latencyMs = Date.now() - start;
        const errText = await whoRes.text().catch(() => "");
        return {
          success: false,
          latencyMs,
          provider: "huggingface",
          testedModel: model,
          message: classifyHfError(whoRes.status, errText, model),
        };
      }

      const user = (await whoRes.json()) as { name?: string; type?: string };

      // 2. Independently probe the actual selected model via router.huggingface.co
      const routerUrl = buildHfRouterUrl(model);
      const inferRes = await fetch(routerUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "x-use-cache": "false",
        },
        body: JSON.stringify({
          inputs: "minimalist clean geometric presentation shape",
          parameters: {
            num_inference_steps: 1,
          },
        }),
        signal: AbortSignal.timeout(35000),
      });

      const latencyMs = Date.now() - start;
      const rateLimitHeaders = extractRateLimitHeaders(inferRes.headers);

      if (!inferRes.ok) {
        const errText = await inferRes.text().catch(() => "");
        return {
          success: false,
          latencyMs,
          provider: "huggingface",
          testedModel: model,
          message: `HF account "${user.name || "user"}" authenticated, but "${model}" inference failed: ${classifyHfError(inferRes.status, errText, model)}`,
          rateLimitHeaders,
        };
      }

      const contentType = inferRes.headers.get("content-type") || "";
      const bytes = await inferRes.arrayBuffer();
      if (!contentType.startsWith("image/") && bytes.byteLength < 128) {
        return {
          success: false,
          latencyMs,
          provider: "huggingface",
          testedModel: model,
          message: `Hugging Face router responded (${inferRes.status}) for "${model}" without valid image bytes (${contentType || "unknown content-type"}).`,
          rateLimitHeaders,
        };
      }

      return {
        success: true,
        latencyMs,
        provider: "huggingface",
        testedModel: model,
        message: `Verified Hugging Face (${user.name || "user"}) & live inference for "${model}" (${latencyMs}ms).`,
        models: config.supportedModels,
        rateLimitHeaders,
        quota: {
          officialSource: rateLimitHeaders ? "api_header" : "unavailable",
          officialLimitText:
            "Free accounts include ~$0.10/mo HF Inference Providers credits (exact balance not returned unless in headers; halts at HTTP 402).",
          isEstimate: !rateLimitHeaders,
          refreshedAt: new Date().toISOString(),
          rateLimitHeaders,
        },
      };
    } catch (err) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        provider: "huggingface",
        testedModel: model,
        message: `Hugging Face connection error: ${redactSecrets(err instanceof Error ? err.message : String(err))}`,
      };
    }
  }

  async generateImage(
    config: ImageProviderConfig,
    options: GenerateImageOptions,
  ): Promise<{ imageUrl: string; format: "png" | "jpeg" }> {
    const apiKey = config.apiKey?.trim();
    if (!apiKey) {
      throw new Error("Hugging Face API token is not configured.");
    }

    const model = (config.selectedModel || "black-forest-labs/FLUX.1-schnell").trim();
    const url = buildHfRouterUrl(model);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "x-use-cache": "false",
      },
      body: JSON.stringify({
        inputs: options.prompt,
        parameters: {
          guidance_scale: 0.0,
          num_inference_steps: 4,
        },
      }),
      signal: AbortSignal.timeout(35000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(classifyHfError(res.status, errText, model));
    }

    const contentType = res.headers.get("content-type") || "image/png";
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength < 64) {
      throw new Error(`Hugging Face model "${model}" returned an empty image buffer.`);
    }

    const base64 = Buffer.from(buffer).toString("base64");
    const format: "png" | "jpeg" = contentType.includes("jpeg") || contentType.includes("jpg") ? "jpeg" : "png";

    return {
      imageUrl: `data:${contentType};base64,${base64}`,
      format,
    };
  }
}
