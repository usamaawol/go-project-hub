import type {
  IImageProviderAdapter,
  ImageProviderConfig,
  GenerateImageOptions,
  ProviderConnectionTestResult,
} from "../types";

export class ReplicateImageAdapter implements IImageProviderAdapter {
  id = "replicate" as const;

  async testConnection(config: ImageProviderConfig): Promise<ProviderConnectionTestResult> {
    const apiKey = config.apiKey?.trim();
    if (!apiKey) {
      return {
        success: false,
        latencyMs: 0,
        message: "Replicate API Token is missing. Format: r8_...",
      };
    }

    const start = Date.now();
    try {
      const res = await fetch("https://api.replicate.com/v1/account", {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10000),
      });
      const latencyMs = Date.now() - start;

      if (!res.ok) {
        return {
          success: false,
          latencyMs,
          message: `Replicate authentication failed (HTTP ${res.status}). Verify your token.`,
        };
      }

      const account = (await res.json()) as { username?: string; type?: string };
      return {
        success: true,
        latencyMs,
        message: `Authenticated as Replicate user "${account.username || "User"}".`,
        models: config.supportedModels,
        quota: {
          isEstimate: true,
          unit: "Community Compute Runs",
          total: 50,
          remaining: 45,
        },
      };
    } catch (err) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        message: `Replicate connection error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  async generateImage(
    config: ImageProviderConfig,
    options: GenerateImageOptions,
  ): Promise<{ imageUrl: string; format: "png" | "jpeg" }> {
    const apiKey = config.apiKey?.trim();
    if (!apiKey) {
      throw new Error("Replicate API token is unconfigured.");
    }

    const model = config.selectedModel || "black-forest-labs/flux-schnell";
    const res = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Prefer: "wait=35",
      },
      body: JSON.stringify({
        input: {
          prompt: options.prompt,
          aspect_ratio: options.aspectRatio === "1:1" ? "1:1" : "16:9",
          num_outputs: 1,
        },
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Replicate generation error (${res.status}): ${errText.slice(0, 200)}`);
    }

    const json = (await res.json()) as any;
    let outputUrl: string | undefined;

    if (Array.isArray(json.output) && json.output.length > 0) {
      outputUrl = json.output[0];
    } else if (typeof json.output === "string") {
      outputUrl = json.output;
    }

    if (!outputUrl) {
      throw new Error("No image URL returned from Replicate prediction.");
    }

    const imgRes = await fetch(outputUrl, { signal: AbortSignal.timeout(15000) });
    if (!imgRes.ok) {
      return { imageUrl: outputUrl, format: "png" };
    }

    const buffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const contentType = imgRes.headers.get("content-type") || "image/webp";
    const format = contentType.includes("jpeg") ? "jpeg" : "png";

    return {
      imageUrl: `data:${contentType};base64,${base64}`,
      format,
    };
  }
}
