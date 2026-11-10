import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import {
  buildSlideDeckContent,
  type SlidePreviewItem,
} from "../../src/lib/presentation-session-client";
import {
  analyzeSourceContent,
  buildAiAnalysisPrompts,
  buildAiDeckComposerPrompts,
  buildCrispCardFromPoint,
  buildFullDocumentAnalysisBrief,
  buildPreciseVisualPrompt,
  buildSlideDiagramData,
  composePresentationDeck,
  detectUnreadableExtraction,
  extractRealMetrics,
  renderDiagramDataToSvg,
  sanitizePresentationInput,
  validateAndRepairDeck,
  type DocumentAnalysis,
} from "../../src/lib/presentation-pipeline";
import {
  computeThemeTokens,
  type RawThemeInput,
  type SlideLayoutType,
} from "../../src/lib/presentation-theme";
import { renderSlideDeckToPptx } from "../../src/lib/presentation-renderer";
import { verifyAndSanitizeImage, verifySlideVisualAsset } from "../../src/lib/image-verifier";
import { generateSlideVisual } from "./geminiVisual.service";
import { imageProviderManager } from "./imageProviders/imageProviderManager";
import {
  getEffectiveGeminiApiKey,
  getEffectiveOpenAIApiKey,
  getActiveProvider,
} from "./adminSettings.service";
import { ENV } from "../config/env";
import type { AssignmentMetadata } from "../../src/lib/assignment-types";
import {
  generatePresentationPlanWithExaone,
  redesignSlideWithExaone,
  getExaoneApiKey,
} from "./exaone.service";

export type { SlideLayoutType };
export type SlideData = SlidePreviewItem;
export type SlideItem = SlidePreviewItem;

export interface PresentationSession {
  id: string;
  title: string;
  purpose: string;
  density: "concise" | "balanced" | "detailed";
  assignmentMetadata?: AssignmentMetadata;
  theme: {
    id: string;
    name: string;
    category: string;
    kind: string;
    colors: {
      primary: string;
      accent: string;
      bg: string;
    };
    fonts: string;
    tier: "free" | "pro";
  };
  typography: {
    fontFamily: string;
    fontSizePreset: "compact" | "standard" | "large" | "extra-large";
  };
  slideCount: number;
  slides: SlideData[];
  filePath: string;
  fileSize: number;
  createdAt: number;
  expiresAt: number;
}

export interface CreatePresentationSessionInput {
  title: string;
  content: string;
  purpose?: string;
  density?: "concise" | "balanced" | "detailed";
  audience?: string;
  language?: string;
  additionalInstructions?: string;
  presentationType?: "standard" | "assignment";
  theme: {
    id: string;
    name: string;
    category: string;
    kind: string;
    colors: {
      primary: string;
      accent: string;
      bg: string;
    };
    fonts: string;
    tier: "free" | "pro";
  };
  typography?: {
    fontFamily?: string;
    fontSizePreset?: "compact" | "standard" | "large" | "extra-large";
  };
  slideCount?: number;
  autoSlideCount?: boolean;
  allowPaidProviders?: boolean;
  visualPreference?: "diagrams" | "text-only";
  geminiApiKey?: string;
  providerKeys?: Record<string, string>;
  assignmentMetadata?: AssignmentMetadata;
}

// 15 Minutes in milliseconds (zero-retention ephemeral session)
const SESSION_TTL_MS = 15 * 60 * 1000;

// Isolated temporary directory outside the web-accessible root
const BASE_TEMP_DIR = path.join(os.tmpdir(), "documind-temp-sessions");

// In-memory registry of active sessions
const activeSessions = new Map<string, PresentationSession>();

// Ensure base temp directory exists
try {
  if (!fs.existsSync(BASE_TEMP_DIR)) {
    fs.mkdirSync(BASE_TEMP_DIR, { recursive: true });
  }
} catch (e) {
  console.warn("Failed to create temporary session directory:", e);
}

/**
 * Generate a physical PPTX file matching the slide deck, theme, and font choices
 */
async function generatePptxFile(session: PresentationSession, destPath: string): Promise<number> {
  const rawTheme: RawThemeInput = {
    id: session.theme.id,
    name: session.theme.name,
    category: session.theme.category,
    kind: session.theme.kind,
    colors: session.theme.colors,
    fonts: session.theme.fonts,
    tier: session.theme.tier,
  };

  const tokens = computeThemeTokens(rawTheme, session.typography);
  const pptx = await renderSlideDeckToPptx(session.title, session.purpose, session.slides, tokens);

  const rawData = await pptx.write({ outputType: "nodebuffer" });
  const buffer = Buffer.isBuffer(rawData) ? rawData : Buffer.from(rawData as ArrayBuffer);
  fs.writeFileSync(destPath, buffer);
  return buffer.length;
}

/**
 * Builds a balanced full-document brief using start + evenly sampled interior sections + conclusion,
 * preserving the entire narrative arc of long uploads instead of dropping middle chapters.
 */
function prepareDocumentBrief(content: string, targetSlideCount: number = 8): string {
  const maxChars = targetSlideCount > 15 ? Math.min(36000, targetSlideCount * 1400) : 14000;
  return buildFullDocumentAnalysisBrief(content, maxChars);
}

/**
 * Two-stage Gemini synthesis:
 * Stage 1 understands the source document structurally (facts, thesis, metrics, relationships)
 * strictly isolated from system instructions or metadata.
 * Stage 2 writes visually varied, concise Gamma-grade slides grounded strictly in that analysis.
 */
async function generateSlidesWithGemini(
  title: string,
  content: string,
  slideCount: number,
  density: "concise" | "balanced" | "detailed",
  purpose: string,
  apiKey?: string,
  options?: {
    audience?: string;
    language?: string;
    additionalInstructions?: string;
    assignmentMetadata?: AssignmentMetadata;
    visualPreference?: "diagrams" | "text-only";
    analysis?: DocumentAnalysis;
  },
): Promise<SlideData[] | null> {
  const activeKey = apiKey || ENV.GEMINI_API_KEY;
  if (!activeKey || /mock|testkey|custompresentationtest/i.test(activeKey) || !content || content.trim().length < 20) {
    return null;
  }

  try {
    const sanitized = sanitizePresentationInput(content);
    if (!sanitized.valid) return null;

    let effectiveAnalysis = options?.analysis || analyzeSourceContent(sanitized, title);
    const isArabicOrRtl = effectiveAnalysis.isRtl;

    // Skip network AI calls in automated unit tests with short timeout budgets
    const timeoutMs = process.env.NODE_ENV === "test" || process.env.VITEST ? 800 : Math.max(30000, slideCount * 1200);

    // Stage 1: Semantic Source Analysis (source-only prompt, zero directive pollution)
    try {
      const stage1Prompts = buildAiAnalysisPrompts(sanitized.cleanSourceText);
      const s1Res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: stage1Prompts.systemPrompt }] },
            contents: [{ parts: [{ text: stage1Prompts.userPrompt }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.15 },
          }),
          signal: AbortSignal.timeout(timeoutMs),
        },
      );
      if (s1Res.ok) {
        const s1Json = (await s1Res.json()) as any;
        const rawS1 = s1Json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawS1) {
          const parsedS1 = JSON.parse(rawS1);
          if (Array.isArray(parsedS1.topics) && parsedS1.topics.length >= 1) {
            effectiveAnalysis = {
              ...effectiveAnalysis,
              subject: parsedS1.subject || effectiveAnalysis.subject,
              detectedTitle: parsedS1.detectedTitle || effectiveAnalysis.detectedTitle,
              domain: parsedS1.domain || effectiveAnalysis.domain,
              coreThesis: parsedS1.coreThesis || effectiveAnalysis.coreThesis,
              conclusionPoints:
                Array.isArray(parsedS1.conclusionPoints) && parsedS1.conclusionPoints.length > 0
                  ? parsedS1.conclusionPoints
                  : effectiveAnalysis.conclusionPoints,
              topics: parsedS1.topics.map((t: any, idx: number) => ({
                id: `ai-topic-${idx + 1}`,
                title: String(t.title || `Topic ${idx + 1}`),
                summary: String(t.summary || ""),
                keyFacts: Array.isArray(t.keyFacts) ? t.keyFacts : [],
                examples: Array.isArray(t.examples) ? t.examples : [],
                technicalTerms: Array.isArray(t.technicalTerms) ? t.technicalTerms : [],
                metrics: Array.isArray(t.metrics) ? t.metrics : [],
                processSteps: Array.isArray(t.processSteps) ? t.processSteps : [],
                timelineItems: Array.isArray(t.timelineItems) ? t.timelineItems : [],
                comparison: t.comparison,
                recommendedVisual: t.recommendedVisual || "cards",
                visualConcept: t.visualConcept,
                importance: 10 - idx,
                sourceIndices: [idx],
              })),
            };
          }
        }
      }
    } catch {
      // Retain deterministic Stage 1 analysis cleanly on timeout
    }

    // Stage 2: Gamma Presentation Composer (consumes ONLY analyzed document + separated directives)
    const stage2Prompts = buildAiDeckComposerPrompts(effectiveAnalysis, {
      title: title || effectiveAnalysis.detectedTitle,
      purpose,
      audience: options?.audience,
      language: options?.language || effectiveAnalysis.language,
      density,
      slideCount,
      visualPreference: options?.visualPreference,
      assignmentMetadata: options?.assignmentMetadata,
    });

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: stage2Prompts.systemPrompt }] },
          contents: [{ parts: [{ text: stage2Prompts.userPrompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      },
    );

    interface GeminiSlideOutput {
      layout?: SlideLayoutType;
      title?: string;
      subtitle?: string;
      categoryTag?: string;
      bullets?: string[];
      heroSplit?: { headline: string; highlight: string; details: string[] };
      bentoGrid?: Array<{ title: string; description: string; tag?: string; icon?: string }>;
      statCallout?: { stat: string; label: string; context: string; bullets?: string[] };
      leftColumn?: { title: string; bullets: string[] };
      rightColumn?: { title: string; bullets: string[] };
      cards?: Array<{ title: string; description: string; tag?: string; icon?: string }>;
      metrics?: Array<{ label: string; value: string; description?: string }>;
      timeline?: Array<{ phase: string; title: string; description: string }>;
      processSteps?: Array<{ stepNumber: number; title: string; description: string }>;
      quote?: { text: string; author?: string; role?: string };
      calloutPill?: { text: string; icon?: string; type?: "info" | "warning" | "success" | "accent" };
      alertCallout?: { title?: string; text: string; icon?: string };
      quoteBox?: { text: string; citation?: string; badge?: string };
      workflowSteps?: Array<{ stepNumber: number; title: string; subtitle?: string; icon?: string }>;
      visual?: SlidePreviewItem["visual"];
      isRtl?: boolean;
      visualMesh?: boolean;
      notes?: string;
    }

    interface GeminiApiResponse {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    }

    if (res.ok) {
      const data = (await res.json()) as GeminiApiResponse;
      const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawJson) {
        const parsed = JSON.parse(rawJson) as { slides?: GeminiSlideOutput[] };
        if (Array.isArray(parsed.slides) && parsed.slides.length >= 3) {
          return parsed.slides.map((s: GeminiSlideOutput, idx: number) => ({
            id: `slide-${idx + 1}`,
            slideNumber: idx + 1,
            layout:
              (s.layout as SlideLayoutType) ||
              (idx === 0
                ? "title"
                : idx === 1
                  ? "agenda"
                  : idx === parsed.slides!.length - 1
                    ? "conclusion"
                    : "content"),
            title: s.title || `Slide ${idx + 1}`,
            subtitle: s.subtitle,
            categoryTag: s.categoryTag || purpose,
            bullets: Array.isArray(s.bullets) ? s.bullets : undefined,
            heroSplit: s.heroSplit,
            bentoGrid: s.bentoGrid,
            statCallout: s.statCallout,
            leftColumn: s.leftColumn,
            rightColumn: s.rightColumn,
            cards: s.cards,
            metrics: Array.isArray(s.metrics) ? s.metrics : undefined,
            timeline: s.timeline,
            processSteps: s.processSteps,
            quote: s.quote,
            calloutPill: s.calloutPill,
            alertCallout: s.alertCallout,
            quoteBox: s.quoteBox,
            workflowSteps: s.workflowSteps,
            visual: s.visual,
            slideSurface: (s as any).slideSurface,
            visualMesh: s.visualMesh || (idx === 0 || s.layout === "hero-split"),
            isRtl: s.isRtl !== undefined ? s.isRtl : isArabicOrRtl,
            notes: s.notes,
          }));
        }
      }
    }
  } catch (err) {
    console.warn(
      "Gemini slide synthesis unavailable, timed out, or unconfigured, utilizing local semantic parser:",
      err,
    );
  }
  return null;
}

/**
 * Alternative AI Synthesis via OpenAI / Compatible Endpoints
 */
async function generateSlidesWithOpenAI(
  title: string,
  content: string,
  slideCount: number,
  density: "concise" | "balanced" | "detailed",
  purpose: string,
  apiKey: string,
): Promise<SlideData[] | null> {
  if (!apiKey || apiKey.length < 8) return null;
  try {
    const brief = prepareDocumentBrief(content, slideCount);
    const prompt = `You are a world-class presentation architect for DocuMind.
Convert the source text into a structured presentation deck of exactly ${slideCount} slides.
Output must strictly be valid JSON format:
{
  "title": "string",
  "slides": [
    {
      "slideNumber": 1,
      "layout": "title",
      "title": "string",
      "subtitle": "string",
      "categoryTag": "string"
    },
    ...
  ]
}
SOURCE TITLE: ${title}
SOURCE TEXT:
${brief}`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;
    const json = (await res.json()) as any;
    const rawText = json.choices?.[0]?.message?.content;
    if (!rawText) return null;

    const parsed = JSON.parse(rawText);
    if (!Array.isArray(parsed.slides) || parsed.slides.length !== slideCount) return null;

    return parsed.slides.map((s: any, idx: number) => ({
      id: `slide-${idx + 1}`,
      slideNumber: idx + 1,
      layout: s.layout || (idx === 0 ? "title" : "content"),
      title: s.title || `Slide ${idx + 1}`,
      subtitle: s.subtitle,
      categoryTag: s.categoryTag || purpose,
      bullets: Array.isArray(s.bullets) ? s.bullets : [],
      leftColumn: s.leftColumn,
      rightColumn: s.rightColumn,
      cards: s.cards,
      metrics: s.metrics,
      timeline: s.timeline,
      processSteps: s.processSteps,
      quote: s.quote,
      visual: s.visual,
      notes: s.notes,
    }));
  } catch {
    return null;
  }
}

/**
 * Creates a temporary presentation session with genuine PPTX and structured slides
 */
export async function createPresentationSession(
  input: CreatePresentationSessionInput,
): Promise<PresentationSession> {
  if (input.providerKeys) {
    imageProviderManager.setTemporaryProviderKeys(input.providerKeys);
  }

  // Strict Separation of Instructions and Content + Honest Extraction Validation
  const rawSource = (input.content || "").trim();
  if (rawSource.length > 0) {
    const unreadable = detectUnreadableExtraction(rawSource);
    if (unreadable) {
      throw new Error(unreadable);
    }
  }
  const effectiveSource = rawSource || (input.title || "").trim();
  const sanitized = sanitizePresentationInput(effectiveSource);
  if (!sanitized.valid) {
    throw new Error(
      sanitized.errorReason ||
        "Source document contains no readable presentation content.",
    );
  }

  // Stage 1: Understand the actual document BEFORE composing slides
  const analysis = analyzeSourceContent(sanitized, input.title);

  const sessionId = crypto.randomUUID();
  const sessionDir = path.join(BASE_TEMP_DIR, sessionId);
  fs.mkdirSync(sessionDir, { recursive: true });

  const slideCount =
    input.autoSlideCount || !input.slideCount
      ? analysis.recommendedSlideCount
      : Math.min(50, Math.max(3, input.slideCount));
  const density = input.density || "balanced";
  const purpose = input.purpose || analysis.domain || "Executive Briefing";
  const fontFamily = input.typography?.fontFamily || "Inter";
  const fontSizePreset = input.typography?.fontSizePreset || "standard";

  const defaultTheme: CreatePresentationSessionInput["theme"] = {
    id: "executive-brief",
    name: "Executive Brief",
    category: "Business",
    kind: "business",
    colors: { primary: "#0F294A", accent: "#2563EB", bg: "#FAF8F5" },
    fonts: "Newsreader + Manrope",
    tier: "free",
  };
  const theme = input.theme || defaultTheme;
  const themeTokens = computeThemeTokens(theme, input.typography);

  const activeProvider = getActiveProvider();
  const effectiveApiKey = input.geminiApiKey || getEffectiveGeminiApiKey() || ENV.GEMINI_API_KEY;
  const effectiveOpenAiKey = getEffectiveOpenAIApiKey();

  let slides: SlideData[] = [];

  // 1. EXAONE: Dedicated primary engine when configured
  const effectiveExaoneKey = getExaoneApiKey();
  if (effectiveExaoneKey && activeProvider !== "offline") {
    try {
      const exaoneSlides = await generatePresentationPlanWithExaone({
        title: input.title || analysis.detectedTitle,
        content: sanitized.cleanSourceText,
        slideCount,
        density,
        purpose,
        audience: input.audience,
        language: input.language || analysis.language,
        additionalInstructions: input.additionalInstructions,
        assignmentMetadata: input.assignmentMetadata,
      });
      if (exaoneSlides && exaoneSlides.length >= Math.max(3, slideCount - 2)) {
        slides = exaoneSlides.slice(0, slideCount).map((s, idx) => ({
          ...s,
          id: `slide-${idx + 1}`,
          slideNumber: idx + 1,
        }));
      }
    } catch (exErr) {
      console.warn("[Presentation Maker] EXAONE generation failed, cascading cleanly:", exErr);
    }
  }

  // 2. OpenAI if configured as active provider
  if (slides.length === 0 && activeProvider === "openai" && effectiveOpenAiKey) {
    const oSlides = await generateSlidesWithOpenAI(
      input.title || analysis.detectedTitle,
      sanitized.cleanSourceText,
      slideCount,
      density,
      purpose,
      effectiveOpenAiKey,
    );
    if (oSlides && oSlides.length >= Math.max(3, slideCount - 1)) {
      slides = oSlides.slice(0, slideCount);
    }
  }

  // 3. Gemini 2-Stage Pipeline when configured
  if (slides.length === 0 && activeProvider !== "offline" && effectiveApiKey) {
    const aiSlides = await generateSlidesWithGemini(
      input.title || analysis.detectedTitle,
      sanitized.cleanSourceText,
      slideCount,
      density,
      purpose,
      effectiveApiKey,
      {
        audience: input.audience,
        language: input.language || analysis.language,
        additionalInstructions: input.additionalInstructions,
        assignmentMetadata: input.assignmentMetadata,
        visualPreference: input.visualPreference,
        analysis,
      },
    );
    if (aiSlides && aiSlides.length >= Math.max(3, Math.floor(slideCount * 0.75))) {
      slides = aiSlides.slice(0, slideCount).map((s, idx) => ({
        ...s,
        id: `slide-${idx + 1}`,
        slideNumber: idx + 1,
      }));
    }
  }

  // 4. Deterministic Stage 2 Composer fallback grounded cleanly in analyzed source
  if (slides.length === 0) {
    slides = composePresentationDeck(analysis, {
      title: input.title || analysis.detectedTitle,
      purpose,
      audience: input.audience,
      language: input.language || analysis.language,
      density,
      slideCount,
      autoSlideCount: input.autoSlideCount,
      visualPreference: input.visualPreference,
      assignmentMetadata: input.assignmentMetadata,
      theme,
    });
  }

  // If this is an academic assignment, guarantee Slide 1 is the official assignment cover
  if (input.assignmentMetadata?.isAssignment && slides.length > 0) {
    const resolvedTitle =
      input.assignmentMetadata.assignmentTitle?.trim() ||
      (input.title || "").trim() ||
      slides[0]?.title ||
      analysis.detectedTitle;
    const isGroup = input.assignmentMetadata.assignmentType === "group";
    const courseLabel = input.assignmentMetadata.courseName?.trim() || resolvedTitle;
    const sub = `${courseLabel} — ${isGroup ? "Group Assignment" : "Individual Assignment"}`;
    slides[0] = {
      ...slides[0],
      id: "slide-1",
      slideNumber: 1,
      layout: "assignment-cover",
      title: resolvedTitle,
      subtitle: sub,
      categoryTag: "ACADEMIC ASSIGNMENT",
      assignmentMetadata: input.assignmentMetadata,
      notes: input.assignmentMetadata.instructorName?.trim()
        ? `Course: ${courseLabel}. Instructor: ${input.assignmentMetadata.instructorName.trim()}.`
        : `Course: ${courseLabel}.`,
    };
  }

  // Guarantee at least one relevant visual per presentation when eligible (unless user chose text-only)
  const hasExistingVisual = slides.some((s) => s.visual?.imageUrl || s.layout === "text-visual" || s.layout === "image-led" || s.layout === "diagram-explainer");
  if (input.visualPreference !== "text-only" && !hasExistingVisual && slides.length >= 3) {
    const protectedLayouts = new Set([
      "assignment-cover",
      "title",
      "agenda",
      "conclusion",
      "metrics",
      "timeline",
      "process",
      "table",
      "two-column",
      "comparison",
      "references",
    ]);
    const preferredIdx = slides.findIndex(
      (s, idx) => idx > 0 && idx < slides.length - 1 && (s.layout === "content" || s.layout === "hero-split"),
    );
    const eligibleIdx =
      preferredIdx !== -1
        ? preferredIdx
        : slides.findIndex((s, idx) => idx > 0 && !protectedLayouts.has(s.layout));
    const targetSlide = eligibleIdx !== -1 ? slides[eligibleIdx] : undefined;
    if (targetSlide) {
      targetSlide.layout = "text-visual";
      targetSlide.visual = {
        type: "diagram",
        concept: targetSlide.title,
        caption: targetSlide.subtitle || targetSlide.title,
        imagePrompt: buildPreciseVisualPrompt({
          slideTitle: targetSlide.title,
          summary: targetSlide.subtitle,
          domain: analysis.domain,
        }),
      };
    }
  }

  for (const s of slides) {
    if (input.visualPreference === "text-only") {
      delete s.visual;
      delete s.diagramData;
      continue;
    }
    if (
      s.layout === "text-visual" ||
      s.layout === "image-led" ||
      s.visual?.concept ||
      s.visual?.imagePrompt
    ) {
      // Only call external AI image providers for image-led/picture concepts when enabled & free (unless paid explicitly allowed)
      const isPictureRequest = s.layout === "image-led" || s.visual?.type === "picture" || s.visual?.type === "image";
      if (!s.visual?.imageUrl || (isPictureRequest && s.visual.imageUrl.startsWith("data:image/svg+xml"))) {
        try {
          const prompt =
            s.visual?.imagePrompt ||
            buildPreciseVisualPrompt({
              slideTitle: s.title,
              concept: s.visual?.concept,
              summary: s.subtitle,
              domain: analysis.domain,
            });
          const concept = s.visual?.concept || s.title;

          const imgRes = await imageProviderManager.generateImage({
            source: "presentation_maker",
            prompt,
            slideTitle: s.title,
            concept,
            aspectRatio: "16:9",
            allowPaidProviders: Boolean(input.allowPaidProviders),
          });

          // Only accept genuine raster visuals from external AI providers;
          // if provider fell back to "local-svg", keep our richer source-derived diagramData SVG below!
          if (imgRes && imgRes.imageUrl && imgRes.provider !== "local-svg") {
            const verification = await verifySlideVisualAsset(imgRes.imageUrl, {
              minDimensionPx: imgRes.format === "svg+xml" ? 1 : 120,
            });
            if (verification.valid && verification.dataUrl) {
              s.visual = {
                type: verification.format === "svg+xml" ? "diagram" : "picture",
                concept,
                caption: s.subtitle || concept,
                imageUrl: verification.dataUrl,
                imagePrompt: prompt,
              };
            }
          }
        } catch (visErr) {
          console.warn("Multi-provider visual generation fallback for slide:", s.title, visErr);
        }
      }

      // If still no valid imageUrl, synthesize a genuine source-driven diagram SVG locally
      if (!s.visual?.imageUrl) {
        const diagramData =
          s.diagramData ||
          buildSlideDiagramData({
            title: s.title,
            subtitle: s.subtitle,
            concept: s.visual?.concept || s.title,
            bullets: s.bullets,
            cards: s.cards || s.bentoGrid,
            metrics: s.metrics,
          });
        const svg = renderDiagramDataToSvg({
          diagram: diagramData,
          accentColor: theme.colors.accent,
          isDark: s.slideSurface === "dark" || themeTokens.isDark,
          isRtl: s.isRtl,
        });
        s.diagramData = diagramData;
        s.visual = {
          type: "diagram",
          concept: s.visual?.concept || s.title,
          caption: s.subtitle || s.title,
          imageUrl: svg.dataUrl,
          svgContent: svg.svgContent,
        };
      }
    }
  }

  // Verify every attached image via binary/SVG gatekeeper before running full Quality Control
  for (const s of slides) {
    if (s.visual?.imageUrl) {
      const verification = await verifySlideVisualAsset(s.visual.imageUrl, { minDimensionPx: 120 });
      if (!verification.valid || !verification.dataUrl) {
        console.warn(`[ImageVerifier] Rejected unviable image on slide "${s.title}": ${verification.error}`);
        s.visual = undefined;
      } else {
        s.visual.imageUrl = verification.dataUrl;
      }
    }
  }

  // Stage 3 Real Quality-Control Gatekeeper before presenting or exporting
  const qc = validateAndRepairDeck(slides as any, themeTokens, analysis);
  slides = (qc.slides as SlideData[]).map((s, idx) => ({
    ...s,
    slideNumber: idx + 1,
    id: `slide-${idx + 1}`,
  }));

  const derivedTitle = input.title.trim() || analysis.detectedTitle || slides[0]?.title || "Presentation";
  const pptxFilePath = path.join(sessionDir, "presentation.pptx");

  const session: PresentationSession = {
    id: sessionId,
    title: derivedTitle,
    purpose,
    density,
    assignmentMetadata: input.assignmentMetadata,
    theme,
    typography: {
      fontFamily,
      fontSizePreset,
    },
    slideCount: slides.length,
    slides,
    filePath: pptxFilePath,
    fileSize: 0,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
  };

  const fileSize = await generatePptxFile(session, pptxFilePath);
  session.fileSize = fileSize;

  activeSessions.set(sessionId, session);

  return session;
}

/**
 * Retrieve session by ID. If expired, immediately purge and return null.
 */
export function getPresentationSession(sessionId: string): PresentationSession | null {
  const session = activeSessions.get(sessionId);
  if (!session) return null;

  if (Date.now() >= session.expiresAt) {
    deletePresentationSession(sessionId);
    return null;
  }

  return session;
}

/**
 * Update a slide in an active session (for typos, modified bullets, title tweaks, layout change)
 * Automatically updates memory session and re-generates the PPTX file on disk.
 */
export async function updateSessionSlide(
  sessionId: string,
  slideIndex: number,
  updatedData: Partial<SlideItem>,
): Promise<PresentationSession | null> {
  const session = getPresentationSession(sessionId);
  if (!session) return null;
  if (slideIndex < 0 || slideIndex >= session.slides.length) return null;

  const currentSlide = session.slides[slideIndex]!;
  const hasSemanticFieldChange =
    !updatedData.elements &&
    (updatedData.title !== undefined ||
      updatedData.subtitle !== undefined ||
      updatedData.bullets !== undefined ||
      updatedData.layout !== undefined ||
      updatedData.cards !== undefined ||
      updatedData.bentoGrid !== undefined ||
      updatedData.metrics !== undefined ||
      updatedData.timeline !== undefined ||
      updatedData.processSteps !== undefined ||
      updatedData.leftColumn !== undefined ||
      updatedData.rightColumn !== undefined ||
      updatedData.visual !== undefined);

  const mergedSlide: SlideItem = {
    ...currentSlide,
    ...updatedData,
    // Rebuild canonical canvas elements on semantic/modal edit so PPTX export doesn't use stale coordinates
    ...(hasSemanticFieldChange ? { elements: undefined } : {}),
    isManuallyEdited: true,
  };

  // If slide 0 title changed, update presentation title
  if (slideIndex === 0 && updatedData.title) {
    session.title = updatedData.title.trim();
  }

  // If layout is text-visual or image-led, regenerate contextual visual if title/subtitle changed
  if (
    (mergedSlide.layout === "text-visual" || mergedSlide.layout === "image-led") &&
    (updatedData.title || updatedData.subtitle)
  ) {
    const themeTokens = computeThemeTokens(session.theme, session.typography);
    try {
      const vis = await generateSlideVisual({
        title: mergedSlide.title,
        subtitle: mergedSlide.subtitle,
        bullets: mergedSlide.bullets,
        visualPrompt: mergedSlide.visual?.imagePrompt || mergedSlide.visual?.concept,
        visualType: (mergedSlide.visual?.type as any) || "diagram",
        concept: mergedSlide.visual?.concept || mergedSlide.title,
        accentColor: session.theme.colors.accent,
        isDark: themeTokens.isDark,
      });
      mergedSlide.visual = {
        type: vis.type,
        concept: vis.concept,
        caption: vis.caption,
        imageUrl: vis.imageUrl,
        svgContent: vis.svgContent,
      };
    } catch {
      // keep existing visual on error
    }
  }

  session.slides[slideIndex] = mergedSlide;

  // Re-generate PPTX file on disk with updated slide content
  try {
    const fileSize = await generatePptxFile(session, session.filePath);
    session.fileSize = fileSize;
  } catch (err) {
    console.warn("Failed to re-render PPTX file for session:", sessionId, err);
  }

  activeSessions.set(sessionId, session);
  return session;
}

/**
 * Securely deletes session and removes physical temporary files
 */
export function deletePresentationSession(sessionId: string): boolean {
  const session = activeSessions.get(sessionId);
  activeSessions.delete(sessionId);

  const sessionDir = path.join(BASE_TEMP_DIR, sessionId);
  try {
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }
    return true;
  } catch (err) {
    console.warn(`Failed to clean up temporary directory for session ${sessionId}:`, err);
    return false;
  }
}

/**
 * Background scheduled cleaner — runs every 30 seconds to clean expired files
 */
export function cleanupExpiredSessions(): number {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [id, session] of activeSessions.entries()) {
    if (now >= session.expiresAt) {
      deletePresentationSession(id);
      cleanedCount++;
    }
  }

  try {
    if (fs.existsSync(BASE_TEMP_DIR)) {
      const dirs = fs.readdirSync(BASE_TEMP_DIR);
      for (const d of dirs) {
        if (!activeSessions.has(d)) {
          const fullPath = path.join(BASE_TEMP_DIR, d);
          const stat = fs.statSync(fullPath);
          if (now - stat.mtimeMs > SESSION_TTL_MS) {
            fs.rmSync(fullPath, { recursive: true, force: true });
            cleanedCount++;
          }
        }
      }
    }
  } catch {
    // Suppress disk scanning errors
  }

  return cleanedCount;
}

/**
 * Lists active presentation sessions for the Admin Dashboard
 */
export function listPresentationSessions(): Array<{
  id: string;
  title: string;
  purpose: string;
  slideCount: number;
  themeName: string;
  hasVisuals: boolean;
  visualCount: number;
  createdAt: number;
  expiresAt: number;
  secondsRemaining: number;
  fileSize: number;
}> {
  return Array.from(activeSessions.values()).map((s) => {
    const visualCount = s.slides.filter((sl) => Boolean(sl.visual?.imageUrl)).length;
    return {
      id: s.id,
      title: s.title,
      purpose: s.purpose,
      slideCount: s.slideCount,
      themeName: s.theme?.name || "Standard",
      hasVisuals: visualCount > 0,
      visualCount,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      secondsRemaining: Math.max(0, Math.floor((s.expiresAt - Date.now()) / 1000)),
      fileSize: s.fileSize,
    };
  });
}

/**
 * Regenerates the AI visual for a specific slide using active providers and re-renders PPTX
 */
export async function regenerateSlideVisual(
  sessionId: string,
  slideIndex: number,
  customPrompt?: string,
  providerKeys?: Record<string, string>,
): Promise<PresentationSession | null> {
  if (providerKeys) {
    imageProviderManager.setTemporaryProviderKeys(providerKeys);
  }

  const session = activeSessions.get(sessionId);
  if (!session || !session.slides[slideIndex]) return null;

  const slide = session.slides[slideIndex]!;
  const prompt =
    customPrompt ||
    slide.visual?.imagePrompt ||
    `A professional 16:9 presentation visual illustration: ${slide.title}. ${slide.subtitle || ""}. High aesthetic, clean educational style.`;
  const concept = slide.visual?.concept || slide.title;

  const imgResult = await imageProviderManager.generateImage({
    source: "presentation_maker",
    prompt,
    slideTitle: slide.title,
    concept,
    aspectRatio: "16:9",
  });

  if (imgResult && imgResult.imageUrl) {
    const verification = await verifyAndSanitizeImage(imgResult.imageUrl);
    if (verification.valid && verification.dataUrl) {
      slide.visual = {
        type: verification.format === "svg+xml" ? "diagram" : "picture",
        concept,
        caption: slide.visual?.caption || `Visual: ${concept}`,
        imageUrl: verification.dataUrl,
        imagePrompt: prompt,
      };
      if (slide.layout === "content" || slide.layout === "agenda") {
        slide.layout = "text-visual";
      }
      // Clear cached manual elements ONLY on this slide so the new verified visual renders cleanly
      slide.elements = undefined;
    } else {
      console.warn(`[ImageVerifier] Regenerated image failed verification: ${verification.error}`);
    }
  }

  // Re-generate PPTX file on disk
  try {
    const fileSize = await generatePptxFile(session, session.filePath);
    session.fileSize = fileSize;
  } catch (err) {
    console.warn("Failed to re-render PPTX file after visual regeneration:", err);
  }

  activeSessions.set(sessionId, session);
  return session;
}

/**
 * Deterministic local slide redesign fallback grounded strictly in the slide's real content
 */
function applyLocalSlideRedesign(slide: SlideItem, instruction: string): void {
  const lower = instruction.toLowerCase();
  const realBullets = (slide.bullets || []).filter(Boolean);
  slide.elements = undefined;

  if (lower.includes("bento") || lower.includes("4-card") || lower.includes("grid")) {
    slide.layout = "bento-grid";
    const candidates = [...realBullets];
    if (candidates.length < 4 && slide.subtitle && !candidates.includes(slide.subtitle)) {
      candidates.push(slide.subtitle);
    }
    for (const b of realBullets) {
      if (candidates.length >= 4) break;
      const parts = b.split(/[,;]|\s+and\s+/i).map((p) => p.trim()).filter((p) => p.length > 6);
      for (const part of parts) {
        if (candidates.length < 4 && !candidates.includes(part)) candidates.push(part);
      }
    }
    const labels = ["Core Aspect", "Implementation", "Key Considerations", "Outcome"];
    while (candidates.length < 4) {
      const idx = candidates.length;
      candidates.push(`${labels[idx % labels.length]}: ${slide.title}`);
    }
    slide.bentoGrid = candidates
      .slice(0, 4)
      .map((b, idx) => buildCrispCardFromPoint(b, "Factor", idx, Boolean(slide.isRtl)));
  } else if (
    lower.includes("hero") ||
    lower.includes("split") ||
    lower.includes("attractive") ||
    lower.includes("punchy") ||
    lower.includes("modern")
  ) {
    slide.layout = "hero-split";
    const headlineCandidate = realBullets[0] || slide.subtitle || "Core Concept Overview";
    slide.heroSplit = {
      headline:
        headlineCandidate.toLowerCase() === slide.title.toLowerCase()
          ? "Key Conceptual Highlights"
          : headlineCandidate,
      highlight: slide.subtitle || realBullets[0] || slide.title,
      details: realBullets.slice(0, 3),
    };
  } else if (lower.includes("diagram") || lower.includes("visual") || lower.includes("concept") || lower.includes("chart")) {
    slide.layout = "diagram-explainer";
    const diagramData = buildSlideDiagramData({
      title: slide.title,
      subtitle: slide.subtitle,
      bullets: realBullets,
      cards: slide.cards || slide.bentoGrid,
      metrics: slide.metrics,
    });
    const svg = renderDiagramDataToSvg({ diagram: diagramData, isDark: false, isRtl: slide.isRtl });
    slide.diagramData = diagramData;
    slide.visual = {
      type: diagramData.kind === "bar-chart" ? "chart" : "diagram",
      concept: slide.title,
      caption: slide.subtitle || slide.title,
      imageUrl: svg.dataUrl,
      svgContent: svg.svgContent,
    };
  } else if (lower.includes("comparison") || lower.includes("two-column") || lower.includes("compare")) {
    slide.layout = "two-column";
    const half = Math.ceil(realBullets.length / 2);
    slide.leftColumn = {
      title: "Primary Dimension",
      bullets: realBullets.slice(0, Math.max(1, half)),
    };
    slide.rightColumn = {
      title: "Contrasting Perspective",
      bullets: realBullets.slice(half).length > 0 ? realBullets.slice(half) : [slide.subtitle || slide.title],
    };
  } else if (lower.includes("process") || lower.includes("step") || lower.includes("workflow")) {
    slide.layout = "process";
    slide.processSteps = (realBullets.length >= 2 ? realBullets : [slide.title, slide.subtitle || "Execution"])
      .slice(0, 4)
      .map((b, idx) => {
        const card = buildCrispCardFromPoint(b, "Stage", idx, Boolean(slide.isRtl));
        return { stepNumber: idx + 1, title: card.title, description: card.description };
      });
  } else if (lower.includes("metric") || lower.includes("number") || lower.includes("data")) {
    const extracted = extractRealMetrics(`${slide.title}\n${slide.subtitle || ""}\n${realBullets.join("\n")}`);
    if (extracted.length >= 2) {
      slide.layout = "metrics";
      slide.metrics = extracted.slice(0, 4).map((m) => ({
        label: m.label,
        value: m.value,
        description: m.context,
      }));
    } else {
      slide.layout = "three-card";
      slide.cards = realBullets
        .slice(0, 3)
        .map((b, idx) => buildCrispCardFromPoint(b, "Highlight", idx, Boolean(slide.isRtl)));
    }
  }
}

/**
 * Redesigns and rewrites a specific slide using natural language AI instructions
 * (e.g., "Make this slide more visually attractive", "Add a diagram explaining this concept", "Use a 4-card bento grid").
 */
export async function regenerateSlideWithAI(
  sessionId: string,
  slideIndex: number,
  instruction: string,
  apiKey?: string,
): Promise<PresentationSession | null> {
  const session = activeSessions.get(sessionId);
  if (!session || !session.slides[slideIndex]) return null;

  const currentSlide = session.slides[slideIndex]!;

  // 1. EXAONE: Dedicated primary engine for Presentation Maker slide redesign
  const exaoneKey = getExaoneApiKey();
  if (exaoneKey && instruction && instruction.trim().length > 0) {
    try {
      const exaoneSlide = await redesignSlideWithExaone(currentSlide, instruction, {
        title: session.title,
        slideCount: session.slides.length,
      });
      if (exaoneSlide) {
        session.slides[slideIndex] = { ...exaoneSlide, elements: undefined };
        await generatePptxFile(session, session.filePath);
        return session;
      }
    } catch (err) {
      console.warn("[Presentation Maker] EXAONE slide redesign fallback:", err);
    }
  }

  const effectiveKey = apiKey || getEffectiveGeminiApiKey() || ENV.GEMINI_API_KEY;

  if (effectiveKey && instruction && instruction.trim().length > 0) {
    try {
      const prompt = `You are DocuMind's Senior Presentation Architect & Creative Director.
You are tasked with redesigning and rewriting Slide ${slideIndex + 1} of a presentation entitled "${session.title}".
Presentation Purpose: "${session.purpose}"
Presentation Theme: "${session.theme.name}" (${session.theme.kind})

CURRENT SLIDE CONTENT:
${JSON.stringify(currentSlide, null, 2)}

USER DESIGN & EDITING INSTRUCTION:
"${instruction}"

INSTRUCTIONS:
1. Strictly follow the user's instruction to transform this slide.
2. Select the optimal layout that fulfills the instruction:
   - "hero-split": Modern split-screen layout with left hero container and right detail cards.
   - "bento-grid": 4-card quadrant matrix (2x2 grid) with tags and descriptions.
   - "headline-hero": Bold high-impact statement banner + 2-3 supporting takeaway cards.
   - "two-column": Comparative examination (In-Scope vs Out-of-Scope, Before vs After).
   - "three-card": 3 distinct pillar cards with tags.
   - "metrics": KPI telemetry and quantitative performance indicators.
   - "timeline": Chronological phases or milestones.
   - "process": Sequential numbered execution workflow.
   - "quote": Standout editorial takeaway.
   - "diagram-explainer" or "text-visual": Conceptual visual or vector diagram + side explanation.
   - "image-led": Visual-first presentation slide.
   - "content": Structured dual-column or focused content card.
3. If the user asks for a diagram or visual, include a "visual" object with "type", "concept", "caption", and a rich "imagePrompt".
4. Ensure content is punchy, high-impact, professional, and directly relevant.

Respond strictly in valid JSON matching this schema:
{
  "layout": "string",
  "title": "string",
  "subtitle": "string",
  "categoryTag": "string",
  "bullets": ["string"],
  "bentoGrid": [{"title": "string", "description": "string", "tag": "string"}],
  "heroSplit": {"headline": "string", "highlight": "string", "details": ["string"]},
  "statCallout": {"stat": "string", "label": "string", "context": "string", "bullets": ["string"]},
  "leftColumn": {"title": "string", "bullets": ["string"]},
  "rightColumn": {"title": "string", "bullets": ["string"]},
  "cards": [{"title": "string", "description": "string", "tag": "string"}],
  "metrics": [{"label": "string", "value": "string", "description": "string"}],
  "timeline": [{"phase": "string", "title": "string", "description": "string"}],
  "processSteps": [{"stepNumber": 1, "title": "string", "description": "string"}],
  "quote": {"text": "string", "author": "string", "role": "string"},
  "visual": {
    "type": "diagram"|"picture"|"chart",
    "concept": "string",
    "caption": "string",
    "imagePrompt": "string"
  },
  "notes": "string"
}`;

      const timeoutMs = process.env.NODE_ENV === "test" || process.env.VITEST ? 1200 : 14000;
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${effectiveKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
          signal: AbortSignal.timeout(timeoutMs),
        },
      );

      if (res.ok) {
        const data = (await res.json()) as any;
        const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawJson) {
          const parsed = JSON.parse(rawJson);
          const updatedSlide: SlideItem = {
            ...currentSlide,
            ...parsed,
            id: currentSlide.id,
            slideNumber: currentSlide.slideNumber,
            elements: undefined,
          };

          // If the redesigned slide requested visual imagery or diagram, generate it
          if (
            (updatedSlide.layout === "text-visual" ||
              updatedSlide.layout === "diagram-explainer" ||
              updatedSlide.layout === "image-led" ||
              updatedSlide.visual?.imagePrompt) &&
            (!updatedSlide.visual?.imageUrl || updatedSlide.visual?.imagePrompt)
          ) {
            try {
              const vPrompt =
                updatedSlide.visual?.imagePrompt ||
                `A clean, professional 16:9 presentation visual illustration: ${updatedSlide.title}. ${updatedSlide.subtitle || ""}. Minimalist modern style, high clarity.`;
              const concept = updatedSlide.visual?.concept || updatedSlide.title;
              const imgRes = await imageProviderManager.generateImage({
                source: "presentation_maker",
                prompt: vPrompt,
                slideTitle: updatedSlide.title,
                concept,
                aspectRatio: "16:9",
              });
              if (imgRes && imgRes.imageUrl) {
                const verification = await verifyAndSanitizeImage(imgRes.imageUrl);
                if (verification.valid && verification.dataUrl) {
                  updatedSlide.visual = {
                    type: verification.format === "svg+xml" ? "diagram" : "picture",
                    concept,
                    caption: updatedSlide.subtitle || `Visual: ${concept}`,
                    imageUrl: verification.dataUrl,
                    imagePrompt: vPrompt,
                  };
                } else {
                  console.warn(`[ImageVerifier] AI slide visual failed verification: ${verification.error}`);
                  if (updatedSlide.layout === "text-visual" || updatedSlide.layout === "image-led") {
                    updatedSlide.layout = "bento-grid";
                  }
                  updatedSlide.visual = undefined;
                }
              }
            } catch (err) {
              console.warn("Image generation fallback for AI slide redesign:", err);
            }
          }

          session.slides[slideIndex] = updatedSlide;
        }
      }
    } catch (err) {
      console.warn("AI slide regeneration error, applying local semantic redesign:", err);
      applyLocalSlideRedesign(currentSlide, instruction);
    }
  } else {
    applyLocalSlideRedesign(currentSlide, instruction);
  }

  // Re-generate PPTX file on disk
  try {
    const fileSize = await generatePptxFile(session, session.filePath);
    session.fileSize = fileSize;
  } catch (err) {
    console.warn("Failed to re-render PPTX file for session:", sessionId, err);
  }

  activeSessions.set(sessionId, session);
  return session;
}

/**
 * Reorders slides in an active presentation session and updates slide numbers
 */
export async function reorderSessionSlides(
  sessionId: string,
  newOrder: number[],
): Promise<PresentationSession | null> {
  const session = activeSessions.get(sessionId);
  if (!session) return null;
  if (!Array.isArray(newOrder) || newOrder.length !== session.slides.length) return null;

  const reordered: SlideItem[] = [];
  for (const idx of newOrder) {
    if (idx < 0 || idx >= session.slides.length) return null;
    reordered.push(session.slides[idx]!);
  }

  session.slides = reordered.map((s, idx) => ({
    ...s,
    slideNumber: idx + 1,
    id: `slide-${idx + 1}`,
  }));

  try {
    const fileSize = await generatePptxFile(session, session.filePath);
    session.fileSize = fileSize;
  } catch (err) {
    console.warn("Failed to re-render PPTX file for session:", sessionId, err);
  }

  activeSessions.set(sessionId, session);
  return session;
}

/**
 * Adds a new slide into the session at target position
 */
export async function addSessionSlide(
  sessionId: string,
  afterIndex: number,
  newSlideData?: Partial<SlideItem>,
): Promise<PresentationSession | null> {
  const session = activeSessions.get(sessionId);
  if (!session) return null;

  const targetIdx = Math.max(0, Math.min(session.slides.length, afterIndex + 1));
  const newSlide: SlideItem = {
    id: `slide-${Date.now()}`,
    slideNumber: targetIdx + 1,
    layout: newSlideData?.layout || "hero-split",
    title: newSlideData?.title || "New Strategic Slide",
    subtitle: newSlideData?.subtitle || "Key analytical takeaway and operational deliverables",
    categoryTag: newSlideData?.categoryTag || session.purpose,
    bullets: newSlideData?.bullets || [
      "Core operational deliverable verified across checkpoints.",
      "Strategic milestone readiness confirmed for release gates.",
    ],
    notes: newSlideData?.notes || "Present key takeaway and engage audience.",
  };

  session.slides.splice(targetIdx, 0, newSlide);
  session.slides = session.slides.map((s, idx) => ({
    ...s,
    slideNumber: idx + 1,
    id: `slide-${idx + 1}`,
  }));
  session.slideCount = session.slides.length;

  try {
    const fileSize = await generatePptxFile(session, session.filePath);
    session.fileSize = fileSize;
  } catch (err) {
    console.warn("Failed to re-render PPTX file for session:", sessionId, err);
  }

  activeSessions.set(sessionId, session);
  return session;
}

/**
 * Deletes a slide from the session and re-indexes remaining slides
 */
export async function deleteSessionSlide(
  sessionId: string,
  slideIndex: number,
): Promise<PresentationSession | null> {
  const session = activeSessions.get(sessionId);
  if (!session || !session.slides[slideIndex]) return null;
  if (session.slides.length <= 2) return null; // preserve at least 2 slides

  session.slides.splice(slideIndex, 1);
  session.slides = session.slides.map((s, idx) => ({
    ...s,
    slideNumber: idx + 1,
    id: `slide-${idx + 1}`,
  }));
  session.slideCount = session.slides.length;

  try {
    const fileSize = await generatePptxFile(session, session.filePath);
    session.fileSize = fileSize;
  } catch (err) {
    console.warn("Failed to re-render PPTX file for session:", sessionId, err);
  }

  activeSessions.set(sessionId, session);
  return session;
}

setInterval(cleanupExpiredSessions, 30_000);
