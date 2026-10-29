import type {
  IImageProviderAdapter,
  ImageProviderConfig,
  GenerateImageOptions,
  ProviderConnectionTestResult,
} from "../types";

export class GeminiImageAdapter implements IImageProviderAdapter {
  id = "gemini" as const;

  async testConnection(config: ImageProviderConfig): Promise<ProviderConnectionTestResult> {
    const apiKey = config.apiKey?.trim();
    if (!apiKey) {
      return {
        success: false,
        latencyMs: 0,
        message: "Google Gemini API key is missing. Please configure your API key.",
      };
    }

    const start = Date.now();
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
        { signal: AbortSignal.timeout(10000) },
      );
      const latencyMs = Date.now() - start;

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const msg = errorData?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
        return {
          success: false,
          latencyMs,
          message: `Connection failed: ${msg}`,
        };
      }

      const data = (await res.json()) as { models?: Array<{ name: string }> };
      const foundModels =
        data.models
          ?.map((m) => m.name.replace("models/", ""))
          ?.filter((n) => n.includes("imagen") || n.includes("gemini") || n.includes("flash"))
          ?.slice(0, 8) || [];

      return {
        success: true,
        latencyMs,
        message: "Successfully authenticated with Google Gemini / Imagen API.",
        models: foundModels.length > 0 ? foundModels : config.supportedModels,
        quota: {
          isEstimate: true,
          unit: "Requests / Min",
          total: 15,
          remaining: 15,
        },
      };
    } catch (err) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        message: `Connection test error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  async generateImage(
    config: ImageProviderConfig,
    options: GenerateImageOptions,
  ): Promise<{ imageUrl: string; format: "png" | "jpeg" }> {
    const apiKey = config.apiKey?.trim();
    if (!apiKey) {
      throw new Error("Gemini API key is unconfigured.");
    }

    const model = config.selectedModel || "imagen-3.0-generate-002";
    const aspectRatio = options.aspectRatio === "1:1" ? "1:1" : "16:9";

    // 1. If using Imagen model, call predict endpoint
    if (model.includes("imagen")) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
        const errJson = await res.json().catch(() => null);
        throw new Error(
          errJson?.error?.message || `Imagen generation failed with status HTTP ${res.status}`,
        );
      }

      const json = (await res.json()) as any;
      const b64 =
        json.predictions?.[0]?.bytesBase64Encoded ||
        json.predictions?.[0]?.image?.imageBytes;

      if (!b64) {
        throw new Error("No image data returned from Imagen model.");
      }

      return {
        imageUrl: `data:image/jpeg;base64,${b64}`,
        format: "jpeg",
      };
    }

    // 2. If using multimodal Gemini 2.5 Flash, generate high-definition visual description or graphic
    throw new Error(`Model ${model} does not support direct binary image output. Please select an Imagen model.`);
  }
}
