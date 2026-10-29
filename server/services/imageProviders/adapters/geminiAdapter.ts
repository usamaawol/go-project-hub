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
  ): Promise<{ imageUrl: string; format: "png" | "jpeg" | "svg+xml" }> {
    const apiKey = config.apiKey?.trim();
    if (!apiKey) {
      throw new Error("Gemini API key is unconfigured.");
    }

    const model = config.selectedModel || "imagen-3.0-generate-002";
    const aspectRatio = options.aspectRatio === "1:1" ? "1:1" : "16:9";

    // 1. If using Imagen model, attempt Imagen prediction endpoint
    if (model.includes("imagen")) {
      try {
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

        if (res.ok) {
          const json = (await res.json()) as any;
          const b64 =
            json.predictions?.[0]?.bytesBase64Encoded ||
            json.predictions?.[0]?.image?.imageBytes;

          if (b64) {
            return {
              imageUrl: `data:image/jpeg;base64,${b64}`,
              format: "jpeg",
            };
          }
        } else {
          console.warn(`Imagen 3 call returned HTTP ${res.status}, evaluating Gemini 2.5 Flash graphic synthesizer.`);
        }
      } catch (imgErr) {
        console.warn("Imagen 3 generation call failed, evaluating Gemini 2.5 Flash fallback:", imgErr);
      }
    }

    // 2. Multimodal / Gemini 2.5 Flash Vector Presentation Graphic Generator
    // Used when gemini-2.5-flash is selected or when Imagen 3 is unavailable on user account
    try {
      const svgPrompt = `You are an elite vector graphic designer for DocuMind presentations.
Generate a clean, high-aesthetic presentation vector SVG graphic (16:9 aspect ratio, viewBox="0 0 960 540") for:
Slide Concept: "${options.concept || options.slideTitle || "Concept Illustration"}"
Prompt: "${options.prompt}"

STRICT RULES:
- Output ONLY valid raw <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540"> ... </svg>.
- Do not output markdown, code blocks, or backticks.
- Design with a modern presentation aesthetic: elegant dark gradient background, clean geometric cards, flowing topology or conceptual nodes, clear icons, and professional colors.`;

      const flashRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: svgPrompt }] }],
          }),
          signal: AbortSignal.timeout(20000),
        },
      );

      if (flashRes.ok) {
        const flashJson = (await flashRes.json()) as any;
        const text = flashJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const svgMatch = text.match(/<svg[\s\S]*?<\/svg>/i);
        if (svgMatch && svgMatch[0]) {
          const rawSvg = svgMatch[0];
          const b64 = Buffer.from(rawSvg, "utf-8").toString("base64");
          return {
            imageUrl: `data:image/svg+xml;base64,${b64}`,
            format: "svg+xml",
          };
        }
      }
    } catch (flashErr) {
      console.warn("Gemini 2.5 Flash vector synthesis call failed:", flashErr);
    }

    throw new Error(`Google Gemini could not generate image for model ${model}. Please verify your API key privileges.`);
  }
}
