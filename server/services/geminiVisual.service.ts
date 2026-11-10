import { ENV } from "../config/env";
import { verifySlideVisualAsset } from "../../src/lib/image-verifier";
import { extractRealMetrics } from "../../src/lib/presentation-pipeline/content-analyzer";
import {
  buildSlideDiagramData,
  renderDiagramDataToSvg,
} from "../../src/lib/presentation-pipeline/diagram-synthesizer";
import { getAdminSettings, getEffectiveGeminiModel } from "./adminSettings.service";
import { callGeminiGenerateContent } from "./presentationAiClient";
import { getServerSecret } from "./serverSecretStore";

export interface ContextualVisualResult {
  imageUrl: string;
  svgContent?: string;
  caption: string;
  concept: string;
  type: "picture" | "graph" | "diagram" | "chart";
}

/**
 * Intelligent contextual visual generator.
 * Uses Gemini / Imagen when a valid API key is present and verifies output dimensions/format,
 * falling back cleanly to content-driven programmatic diagrams.
 */
export async function generateSlideVisual(params: {
  title: string;
  subtitle?: string;
  bullets?: string[];
  visualPrompt?: string;
  visualType?: "picture" | "graph" | "diagram" | "chart";
  concept?: string;
  apiKey?: string;
  accentColor?: string;
  isDark?: boolean;
}): Promise<ContextualVisualResult> {
  const {
    title,
    subtitle = "",
    bullets = [],
    visualPrompt,
    visualType = "diagram",
    concept,
    apiKey = getServerSecret("gemini") || ENV.GEMINI_API_KEY,
    accentColor = "#2563EB",
    isDark = false,
  } = params;

  const conceptName = concept || title.replace(/^(slide|section|\d+)[—:.\s]+/i, "").slice(0, 48);
  const captionText = subtitle || conceptName;
  const adminSettings = getAdminSettings(true);
  const allowPaid = Boolean(adminSettings.allowPaidProviders);

  // 1. If Gemini API key is configured and non-placeholder, attempt Gemini / (paid-gated) Imagen generation
  if (
    apiKey &&
    apiKey.trim().length > 10 &&
    !/mock|testkey|custompresentationtest/i.test(apiKey)
  ) {
    try {
      if (visualType === "picture" && allowPaid) {
        const imageResult = await generateImagenPicture({
          prompt:
            visualPrompt ||
            `Editorial presentation illustration of ${title}. ${subtitle}. Clean composition, vivid high-contrast clarity, 16:9 ratio, no watermark, no random garbled text.`,
          apiKey,
        });
        if (imageResult) {
          const check = await verifySlideVisualAsset(imageResult, { minDimensionPx: 120 });
          if (check.valid && check.dataUrl) {
            return {
              imageUrl: check.dataUrl,
              caption: captionText,
              concept: conceptName,
              type: "picture",
            };
          }
        }
      }

      const svgResult = await generateGeminiSvgDiagram({
        title,
        subtitle,
        bullets,
        visualPrompt: visualPrompt || `Diagram representing: ${title} - ${subtitle}`,
        accentColor,
        isDark,
        apiKey,
      });

      if (svgResult) {
        const base64Data = Buffer.from(svgResult).toString("base64");
        const check = await verifySlideVisualAsset(`data:image/svg+xml;base64,${base64Data}`);
        if (check.valid && check.dataUrl) {
          return {
            imageUrl: check.dataUrl,
            svgContent: svgResult,
            caption: captionText,
            concept: conceptName,
            type: visualType === "chart" ? "chart" : "diagram",
          };
        }
      }
    } catch (err) {
      console.warn("Gemini visual generation encountered an error, using contextual diagram synthesizer:", err);
    }
  }

  // 2. Content-driven Vector Diagram Synthesizer (zero fabricated ML/metric labels)
  return synthesizeContextualVisual({
    title,
    subtitle,
    bullets,
    concept: conceptName,
    caption: captionText,
    accentColor,
    isDark,
  });
}

/**
 * Call Google Imagen 3 API for high-resolution 16:9 illustrations (only when explicitly paid-approved)
 */
async function generateImagenPicture(params: {
  prompt: string;
  apiKey: string;
}): Promise<string | null> {
  const timeoutMs = 12000;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": params.apiKey,
      },
      body: JSON.stringify({
        instances: [{ prompt: params.prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: "16:9",
          outputMimeType: "image/jpeg",
        },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as {
      predictions?: Array<{ bytesBase64Encoded?: string }>;
    };
    const b64 = data.predictions?.[0]?.bytesBase64Encoded;
    if (b64) {
      return `data:image/jpeg;base64,${b64}`;
    }
  } catch {
    // Fail gracefully to SVG diagram
  }
  return null;
}

/**
 * Call configured Gemini Flash model (default gemini-3.8-flash) to generate custom contextual SVG vector graphics
 */
async function generateGeminiSvgDiagram(params: {
  title: string;
  subtitle: string;
  bullets: string[];
  visualPrompt: string;
  accentColor: string;
  isDark: boolean;
  apiKey: string;
}): Promise<string | null> {
  const timeoutMs = 10000;
  const model = getEffectiveGeminiModel();

  const prompt = `You are a presentation diagram designer. Generate a clean vector SVG diagram strictly depicting the slide topic below.
Topic: ${params.title}
Subtitle: ${params.subtitle}
Key Details: ${params.bullets.slice(0, 4).join(" | ")}
Visual Brief: ${params.visualPrompt}

RULES:
1. Return ONLY valid XML SVG markup starting with <svg viewBox="0 0 960 540" xmlns="http://www.w3.org/2000/svg"> and ending with </svg>.
2. Escape any '&' characters as '&amp;'. Do NOT wrap in markdown code fences.
3. Palette: Background ${params.isDark ? "#0F172A" : "#F8FAFC"}, text ${params.isDark ? "#F8FAFC" : "#0F172A"}, accent ${params.accentColor}.
4. Wrap text cleanly so nothing clips outside boxes.`;

  const res = await callGeminiGenerateContent({
    apiKey: params.apiKey,
    model,
    prompt,
    temperature: 0.2,
    maxOutputTokens: 4096,
    timeoutMs,
  });
  if (res.success && res.text) {
    const match = res.text.match(/<svg[\s\S]*<\/svg>/i);
    if (match) return match[0];
  }
  return null;
}

/**
 * High-fidelity contextual SVG synthesizer grounded strictly in the slide's real content.
 */
export function synthesizeContextualVisual(params: {
  title: string;
  subtitle: string;
  bullets?: string[];
  concept: string;
  caption: string;
  accentColor: string;
  isDark: boolean;
}): ContextualVisualResult {
  const bulletList = Array.isArray(params.bullets) ? params.bullets.filter(Boolean) : [];
  const extractedMetrics = extractRealMetrics(
    `${params.title}\n${params.subtitle}\n${bulletList.join("\n")}`,
  ).filter((m) => typeof m.numericValue === "number");

  const diagram = buildSlideDiagramData({
    title: params.title || params.concept || "Visual Overview",
    subtitle: params.subtitle,
    concept: params.concept,
    bullets: bulletList,
    metrics: extractedMetrics.length >= 2 ? extractedMetrics : undefined,
  });

  const { svgContent, dataUrl } = renderDiagramDataToSvg({
    diagram,
    accentColor: params.accentColor || "#2563EB",
    isDark: Boolean(params.isDark),
  });

  return {
    imageUrl: dataUrl,
    svgContent,
    caption: params.caption,
    concept: params.concept,
    type: diagram.kind === "bar-chart" ? "chart" : "diagram",
  };
}
