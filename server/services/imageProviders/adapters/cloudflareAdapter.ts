import type {
  IImageProviderAdapter,
  ImageProviderConfig,
  GenerateImageOptions,
  ProviderConnectionTestResult,
} from "../types";

export class CloudflareWorkersAiAdapter implements IImageProviderAdapter {
  id = "cloudflare" as const;

  async testConnection(config: ImageProviderConfig): Promise<ProviderConnectionTestResult> {
    const apiToken = config.apiKey?.trim();
    if (!apiToken) {
      return {
        success: false,
        latencyMs: 0,
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
          message: `Cloudflare token verification failed (HTTP ${res.status}). Ensure your token has Workers AI read/edit permissions.`,
        };
      }

      const json = (await res.json()) as { success?: boolean; result?: { status?: string } };
      if (!json.success || json.result?.status !== "active") {
        return {
          success: false,
          latencyMs,
          message: `Cloudflare token is inactive or rejected.`,
        };
      }

      return {
        success: true,
        latencyMs,
        message: "Cloudflare Workers AI token verified and active.",
        models: config.supportedModels,
        quota: {
          isEstimate: true,
          unit: "Neurons / Day",
          total: 10000,
          remaining: 9800,
        },
      };
    } catch (err) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        message: `Cloudflare connection error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  async generateImage(
    config: ImageProviderConfig,
    options: GenerateImageOptions,
  ): Promise<{ imageUrl: string; format: "png" | "jpeg" }> {
    const apiToken = config.apiKey?.trim();
    const accountId = config.endpointUrl?.trim() || process.env.CLOUDFLARE_ACCOUNT_ID;

    if (!apiToken) {
      throw new Error("Cloudflare API token is unconfigured.");
    }
    if (!accountId) {
      throw new Error("Cloudflare Account ID is required. Please set it in provider settings (Endpoint / Account ID).");
    }

    const model = config.selectedModel || "@cf/bytedance/stable-diffusion-xl-lightning";
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

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
      const errText = await res.text();
      throw new Error(`Cloudflare Workers AI error (${res.status}): ${errText.slice(0, 200)}`);
    }

    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const contentType = res.headers.get("content-type") || "image/png";

    return {
      imageUrl: `data:${contentType};base64,${base64}`,
      format: "png",
    };
  }
}
