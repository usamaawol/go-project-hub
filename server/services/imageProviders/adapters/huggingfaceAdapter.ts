import type {
  IImageProviderAdapter,
  ImageProviderConfig,
  GenerateImageOptions,
  ProviderConnectionTestResult,
} from "../types";

export class HuggingFaceImageAdapter implements IImageProviderAdapter {
  id = "huggingface" as const;

  async testConnection(config: ImageProviderConfig): Promise<ProviderConnectionTestResult> {
    const apiKey = config.apiKey?.trim();
    if (!apiKey) {
      return {
        success: false,
        latencyMs: 0,
        message: "Hugging Face User Access Token is missing.",
      };
    }

    const start = Date.now();
    try {
      const res = await fetch("https://huggingface.co/api/whoami-v2", {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10000),
      });
      const latencyMs = Date.now() - start;

      if (!res.ok) {
        return {
          success: false,
          latencyMs,
          message: `Authentication failed (HTTP ${res.status}). Verify your Hugging Face API token permissions.`,
        };
      }

      const user = (await res.json()) as { name?: string; type?: string };
      return {
        success: true,
        latencyMs,
        message: `Authenticated successfully as ${user.name || "Hugging Face User"} (${user.type || "user"}).`,
        models: config.supportedModels,
        quota: {
          isEstimate: true,
          unit: "Monthly Free Compute",
          total: 1000,
          remaining: 950,
        },
      };
    } catch (err) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        message: `Hugging Face connection error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  async generateImage(
    config: ImageProviderConfig,
    options: GenerateImageOptions,
  ): Promise<{ imageUrl: string; format: "png" | "jpeg" }> {
    const apiKey = config.apiKey?.trim();
    if (!apiKey) {
      throw new Error("Hugging Face API key is unconfigured.");
    }

    const model = config.selectedModel || "black-forest-labs/FLUX.1-schnell";
    const endpoints = [
      `https://router.huggingface.co/hf-inference/models/${model}`,
      `https://api-inference.huggingface.co/models/${model}`,
    ];

    let lastError: Error | null = null;
    for (const url of endpoints) {
      try {
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
              wait_for_model: true,
              guidance_scale: 0.0,
              num_inference_steps: 4,
            },
          }),
          signal: AbortSignal.timeout(35000),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`HF error (${res.status}): ${errText.slice(0, 200)}`);
        }

        const buffer = await res.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const contentType = res.headers.get("content-type") || "image/png";
        const format: "png" | "jpeg" = contentType.includes("jpeg") ? "jpeg" : "png";

        return {
          imageUrl: `data:${contentType};base64,${base64}`,
          format,
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    throw lastError || new Error(`Hugging Face model ${model} generation failed.`);
  }
}
