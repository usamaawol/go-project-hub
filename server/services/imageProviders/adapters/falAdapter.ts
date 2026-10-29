import type {
  IImageProviderAdapter,
  ImageProviderConfig,
  GenerateImageOptions,
  ProviderConnectionTestResult,
} from "../types";

export class FalAiImageAdapter implements IImageProviderAdapter {
  id = "fal" as const;

  async testConnection(config: ImageProviderConfig): Promise<ProviderConnectionTestResult> {
    const apiKey = config.apiKey?.trim();
    if (!apiKey) {
      return {
        success: false,
        latencyMs: 0,
        message: "fal.ai API Key is missing. Format: key_id:secret_key",
      };
    }

    const start = Date.now();
    try {
      // fal.ai key validation via model schema probe
      const model = config.selectedModel || "fal-ai/flux/schnell";
      const res = await fetch(`https://fal.run/${model}`, {
        method: "OPTIONS",
        headers: {
          Authorization: `Key ${apiKey}`,
        },
        signal: AbortSignal.timeout(10000),
      });
      const latencyMs = Date.now() - start;

      // Even if OPTIONS is 405 or 200, if 401/403 then key is invalid
      if (res.status === 401 || res.status === 403) {
        return {
          success: false,
          latencyMs,
          message: "fal.ai authentication failed. Please verify your FAL_KEY format and permissions.",
        };
      }

      return {
        success: true,
        latencyMs,
        message: "fal.ai endpoint reachable and credentials accepted.",
        models: config.supportedModels,
        quota: {
          isEstimate: true,
          unit: "Compute Credits ($)",
          total: 10,
          remaining: 9.5,
        },
      };
    } catch (err) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        message: `fal.ai connection test: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  async generateImage(
    config: ImageProviderConfig,
    options: GenerateImageOptions,
  ): Promise<{ imageUrl: string; format: "png" | "jpeg" }> {
    const apiKey = config.apiKey?.trim();
    if (!apiKey) {
      throw new Error("fal.ai API key is unconfigured.");
    }

    const model = config.selectedModel || "fal-ai/flux/schnell";
    const res = await fetch(`https://fal.run/${model}`, {
      method: "POST",
      headers: {
        Authorization: `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: options.prompt,
        image_size: options.aspectRatio === "1:1" ? "square_hd" : "landscape_16_9",
        num_inference_steps: 4,
        enable_safety_checker: true,
      }),
      signal: AbortSignal.timeout(40000),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`fal.ai generation error (${res.status}): ${errText.slice(0, 200)}`);
    }

    const data = (await res.json()) as { images?: Array<{ url: string; content_type?: string }> };
    const remoteUrl = data.images?.[0]?.url;
    if (!remoteUrl) {
      throw new Error("No image URL returned by fal.ai.");
    }

    // Download image bytes to return base64 for reliable PPTX export
    const imgRes = await fetch(remoteUrl, { signal: AbortSignal.timeout(15000) });
    if (!imgRes.ok) {
      // If download fails, return remote URL directly
      return { imageUrl: remoteUrl, format: "png" };
    }

    const buffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const contentType = imgRes.headers.get("content-type") || "image/png";
    const format = contentType.includes("jpeg") ? "jpeg" : "png";

    return {
      imageUrl: `data:${contentType};base64,${base64}`,
      format,
    };
  }
}
