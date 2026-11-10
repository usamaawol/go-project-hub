import type {
  IImageProviderAdapter,
  ImageProviderConfig,
  GenerateImageOptions,
  ProviderConnectionTestResult,
} from "../types";
import { extractRateLimitHeaders } from "../../presentationAiClient";
import { getServerSecret, redactSecrets } from "../../serverSecretStore";

export class CloudflareWorkersAiAdapter implements IImageProviderAdapter {
  id = "cloudflare" as const;

  async testConnection(config: ImageProviderConfig): Promise<ProviderConnectionTestResult> {
    const apiToken = config.apiKey?.trim();
    const accountId = (config.endpointUrl || getServerSecret("cloudflare_account_id")).trim();
    const model = (config.selectedModel || "@cf/black-forest-labs/flux-1-schnell").trim();

    if (!apiToken) {
      return {
        success: false,
        latencyMs: 0,
        provider: "cloudflare",
        testedModel: model,
        message: "Cloudflare API Token is missing.",
      };
    }

    const start = Date.now();
    try {
      const res = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", {
        headers: { Authorization: `Bearer ${apiToken}` },
        signal: AbortSignal.timeout(10000),
      });
      const latencyMs = Date.now() - start;

      if (!res.ok) {
        return {
          success: false,
          latencyMs,
          provider: "cloudflare",
          testedModel: model,
          message: `Cloudflare token verification failed (HTTP ${res.status}). Ensure token has Workers AI permissions.`,
        };
      }

      const json = (await res.json()) as { success?: boolean; result?: { status?: string } };
      if (!json.success || json.result?.status !== "active") {
        return {
          success: false,
          latencyMs,
          provider: "cloudflare",
          testedModel: model,
          message: "Cloudflare token is inactive or rejected.",
        };
      }

      if (!accountId) {
        return {
          success: false,
          latencyMs,
          provider: "cloudflare",
          testedModel: model,
          message:
            "Cloudflare token is active, but Cloudflare Account ID is missing in Endpoint / Account ID settings.",
        };
      }

      // Live model invocation test for Workers AI free tier
      const runUrl = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${model}`;
      const runRes = await fetch(runUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: "minimal geometric blue square icon",
          num_steps: 2,
        }),
        signal: AbortSignal.timeout(35000),
      });
      const totalLatency = Date.now() - start;
      const rateLimitHeaders = extractRateLimitHeaders(runRes.headers);

      if (!runRes.ok) {
        const errText = redactSecrets(await runRes.text().catch(() => ""));
        return {
          success: false,
          latencyMs: totalLatency,
          provider: "cloudflare",
          testedModel: model,
          message: `Cloudflare Workers AI model "${model}" failed (HTTP ${runRes.status}): ${errText.slice(0, 180)}`,
          rateLimitHeaders,
        };
      }

      return {
        success: true,
        latencyMs: totalLatency,
        provider: "cloudflare",
        testedModel: model,
        message: `Verified Cloudflare Workers AI token & live model "${model}" (${totalLatency}ms).`,
        models: config.supportedModels,
        rateLimitHeaders,
        quota: {
          officialLimit: 10000,
          officialSource: "unavailable",
          officialLimitText:
            "10,000 Neurons/day free tier resetting 00:00 UTC (live Neuron consumption is tracked in Cloudflare dashboard).",
          isEstimate: true,
          refreshedAt: new Date().toISOString(),
          rateLimitHeaders,
        },
      };
    } catch (err) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        provider: "cloudflare",
        testedModel: model,
        message: `Cloudflare connection error: ${redactSecrets(err instanceof Error ? err.message : String(err))}`,
      };
    }
  }

  async generateImage(
    config: ImageProviderConfig,
    options: GenerateImageOptions,
  ): Promise<{ imageUrl: string; format: "png" | "jpeg" }> {
    const apiToken = config.apiKey?.trim();
    const accountId = (config.endpointUrl || getServerSecret("cloudflare_account_id")).trim();

    if (!apiToken) {
      throw new Error("Cloudflare API token is unconfigured.");
    }
    if (!accountId) {
      throw new Error(
        "Cloudflare Account ID is required. Set it in Endpoint / Account ID in Admin Dashboard.",
      );
    }

    const model = (config.selectedModel || "@cf/black-forest-labs/flux-1-schnell").trim();
    const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${model}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: options.prompt,
        num_steps: 4,
      }),
      signal: AbortSignal.timeout(35000),
    });

    if (!res.ok) {
      const errText = redactSecrets(await res.text().catch(() => ""));
      throw new Error(`Cloudflare Workers AI error (${res.status}): ${errText.slice(0, 200)}`);
    }

    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    // FLUX.1-schnell returns application/json with { result: { image: "<base64>" } }
    if (contentType.includes("application/json")) {
      const json = (await res.json()) as {
        success?: boolean;
        result?: { image?: string };
        errors?: Array<{ message?: string }>;
      };
      const b64 = json?.result?.image;
      if (!b64) {
        const msg = json?.errors?.[0]?.message || "Cloudflare JSON response contained no image.";
        throw new Error(`Cloudflare Workers AI error: ${msg}`);
      }
      return {
        imageUrl: b64.startsWith("data:image/") ? b64 : `data:image/png;base64,${b64}`,
        format: "png",
      };
    }

    // SDXL-Lightning returns binary image/png bytes
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const resolvedMime = contentType.startsWith("image/") ? contentType : "image/png";
    return {
      imageUrl: `data:${resolvedMime};base64,${base64}`,
      format: resolvedMime.includes("jpeg") ? "jpeg" : "png",
    };
  }
}
