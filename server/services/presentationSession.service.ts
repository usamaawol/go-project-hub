import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import {
  buildSlideDeckContent,
  type SlidePreviewItem,
} from "../../src/lib/presentation-session-client";
import {
  computeThemeTokens,
  type RawThemeInput,
  type SlideLayoutType,
} from "../../src/lib/presentation-theme";
import { renderSlideDeckToPptx } from "../../src/lib/presentation-renderer";
import { generateSlideVisual } from "./geminiVisual.service";
import { imageProviderManager } from "./imageProviders/imageProviderManager";
import {
  getEffectiveGeminiApiKey,
  getEffectiveOpenAIApiKey,
  getActiveProvider,
} from "./adminSettings.service";
import { ENV } from "../config/env";
import type { AssignmentMetadata } from "../../src/lib/assignment-types";

export type { SlideLayoutType };
export type SlideData = SlidePreviewItem;

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
  geminiApiKey?: string;
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
 * Summarizes long source documents into an outline brief if document exceeds 8,000 characters
 */
function prepareDocumentBrief(content: string): string {
  if (content.length <= 8000) return content;

  // Split into chunks across sections or paragraphs
  const chunks = content.split(/\n\s*\n/).filter((c) => c.trim().length > 0);
  if (chunks.length <= 4) {
    return content.slice(0, 8000);
  }

  // Preserve introduction, intermediate sections, and conclusion
  const intro = chunks.slice(0, 2).join("\n\n");
  const middleIndices = Math.floor(chunks.length / 2);
  const middle = chunks.slice(middleIndices - 1, middleIndices + 2).join("\n\n");
  const conclusion = chunks.slice(-2).join("\n\n");

  return `EXECUTIVE SUMMARY & INTRO:\n${intro}\n\nCORE BODY & ANALYSIS:\n${middle}\n\nCONCLUSIONS & METRICS:\n${conclusion}`.slice(
    0,
    9000,
  );
}

/**
 * Synthesizes dynamic slide content using Gemini Flash if API key is provided
 */
async function generateSlidesWithGemini(
  title: string,
  content: string,
  slideCount: number,
  density: "concise" | "balanced" | "detailed",
  purpose: string,
  apiKey?: string,
): Promise<SlideData[] | null> {
  const activeKey = apiKey || ENV.GEMINI_API_KEY;
  if (!activeKey || !content || content.trim().length < 20) return null;

  try {
    const documentBrief = prepareDocumentBrief(content);

    const prompt = `You are DocuMind's elite presentation engine.
Analyze the following source document/notes and generate a cohesive, professional presentation of exactly ${slideCount} slides with purpose "${purpose}" and content density "${density}".
The user's requested title is "${title || "Detect best title from text"}".

SOURCE TEXT:
"""
${documentBrief}
"""

Respond in JSON adhering strictly to this schema:
{
  "title": "string",
  "slides": [
    {
      "slideNumber": 1,
      "layout": "title",
      "title": "string (under 50 chars)",
      "subtitle": "string (under 75 chars)",
      "categoryTag": "string",
      "notes": "string"
    },
    {
      "slideNumber": 2,
      "layout": "agenda",
      "title": "Agenda & Structural Roadmap",
      "subtitle": "Core topics and analytical checkpoints",
      "categoryTag": "AGENDA",
      "bullets": ["topic 1", "topic 2", "topic 3"]
    },
    ... (intermediate slides using varied layouts: "two-column", "three-card", "metrics", "timeline", "process", "quote", "text-visual", or "image-led")
    {
      "slideNumber": ${slideCount},
      "layout": "conclusion",
      "title": "Key Takeaways & Conclusion",
      "subtitle": "Synthesis and forward actions",
      "categoryTag": "CONCLUSION",
      "bullets": ["takeaway 1", "takeaway 2", "takeaway 3", "action item"]
    }
  ]
}

STRICT REQUIREMENTS FOR MODERN SLIDE DECKS:
1. Every slide title, bullet point, metric, comparison, and pillar MUST be derived directly from the source text.
2. DO NOT use generic corporate filler or repeated "Core Analysis" bullet points.
3. Modern Layout Variety: Never repeat the same layout consecutively.
4. For visual concepts, creative directions, brand identities, or scientific processes:
   - Use layout "text-visual" or "image-led".
   - Include a "visual" object: { "type": "picture"|"graph"|"diagram"|"chart", "concept": "short title", "caption": "brief explanation", "imagePrompt": "vivid detailed prompt describing the picture or vector graph to generate" }.
5. For scope, boundaries, frontend-only rules, or comparisons: Use layout "two-column" with "leftColumn" (In-Scope) and "rightColumn" (Out-of-Scope / Constraints).
6. For multi-concept choices or 3 pillars: Use layout "three-card" with "cards" array.
7. For metrics or numbers: Use layout "metrics" with "metrics" array.
8. For workflows or milestones: Use layout "timeline" or "process".
9. Keep slide titles punchy and under 48 characters to prevent text overflow and overlapping.
10. Return exactly ${slideCount} slides with slide numbers from 1 to ${slideCount}.`;

    const timeoutMs = process.env.NODE_ENV === "test" || process.env.VITEST ? 800 : 14000;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeKey}`,
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

    interface GeminiSlideOutput {
      layout?: SlideLayoutType;
      title?: string;
      subtitle?: string;
      categoryTag?: string;
      bullets?: string[];
      leftColumn?: { title: string; bullets: string[] };
      rightColumn?: { title: string; bullets: string[] };
      cards?: Array<{ title: string; description: string; tag?: string }>;
      metrics?: Array<{ label: string; value: string; description?: string }>;
      timeline?: Array<{ phase: string; title: string; description: string }>;
      processSteps?: Array<{ stepNumber: number; title: string; description: string }>;
      quote?: { text: string; author?: string; role?: string };
      visual?: SlidePreviewItem["visual"];
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
            leftColumn: s.leftColumn,
            rightColumn: s.rightColumn,
            cards: s.cards,
            metrics: Array.isArray(s.metrics) ? s.metrics : undefined,
            timeline: s.timeline,
            processSteps: s.processSteps,
            quote: s.quote,
            visual: s.visual,
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
    const brief = prepareDocumentBrief(content);
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
  const sessionId = crypto.randomUUID();
  const sessionDir = path.join(BASE_TEMP_DIR, sessionId);

  fs.mkdirSync(sessionDir, { recursive: true });

  const slideCount = Math.min(20, Math.max(3, input.slideCount || 8));
  const density = input.density || "balanced";
  const purpose = input.purpose || "Business & Strategy";
  const fontFamily = input.typography?.fontFamily || "Inter";
  const fontSizePreset = input.typography?.fontSizePreset || "standard";

  const activeProvider = getActiveProvider();
  const effectiveApiKey = input.geminiApiKey || getEffectiveGeminiApiKey() || ENV.GEMINI_API_KEY;
  const effectiveOpenAiKey = getEffectiveOpenAIApiKey();

  let slides: SlideData[] = [];

  // 1. If provider is set to offline or zero external APIs
  if (activeProvider === "offline") {
    slides = buildSlideDeckContent(
      input.title,
      input.content,
      slideCount,
      density,
      purpose,
      input.assignmentMetadata,
    );
  }
  // 2. If provider is set to OpenAI
  else if (activeProvider === "openai" && effectiveOpenAiKey) {
    const oSlides = await generateSlidesWithOpenAI(
      input.title,
      input.content,
      slideCount,
      density,
      purpose,
      effectiveOpenAiKey,
    );
    if (oSlides && oSlides.length === slideCount) {
      slides = oSlides;
    } else {
      slides = buildSlideDeckContent(
        input.title,
        input.content,
        slideCount,
        density,
        purpose,
        input.assignmentMetadata,
      );
    }
  }
  // 3. Default: Gemini provider with automatic deterministic fallback
  else {
    if (effectiveApiKey) {
      const aiSlides = await generateSlidesWithGemini(
        input.title,
        input.content,
        slideCount,
        density,
        purpose,
        effectiveApiKey,
      );
      if (aiSlides && aiSlides.length === slideCount) {
        slides = aiSlides;
      }
    }
    if (slides.length === 0) {
      slides = buildSlideDeckContent(
        input.title,
        input.content,
        slideCount,
        density,
        purpose,
        input.assignmentMetadata,
      );
    }
  }

  // If this is an academic assignment, guarantee Slide 1 is the official assignment cover
  if (input.assignmentMetadata?.isAssignment && slides.length > 0) {
    const isGroup = input.assignmentMetadata.assignmentType === "group";
    const sub = `${input.assignmentMetadata.courseName || purpose} — ${
      isGroup ? "Group Assignment" : "Individual Assignment"
    }`;
    slides[0] = {
      id: "slide-1",
      slideNumber: 1,
      layout: "assignment-cover",
      title: input.assignmentMetadata.assignmentTitle?.trim() || input.title,
      subtitle: sub,
      categoryTag: "ACADEMIC ASSIGNMENT",
      assignmentMetadata: input.assignmentMetadata,
      notes: `Assignment Submission for ${input.assignmentMetadata.courseName || input.title}. Submitted to ${
        input.assignmentMetadata.instructorName || "Instructor"
      }.`,
    };
  }

  // Generate contextual visuals (pictures, graphs, diagrams) for visual-led slides
  const defaultTheme: CreatePresentationSessionInput["theme"] = {
    id: "executive-brief",
    name: "Executive Brief",
    category: "Business",
    kind: "business",
    colors: { primary: "#0F172A", accent: "#2563EB", bg: "#FFFFFF" },
    fonts: "Inter / Roboto",
    tier: "free",
  };
  const theme = input.theme || defaultTheme;
  const themeTokens = computeThemeTokens(theme, input.typography);

  // Guarantee at least one relevant visual per presentation when eligible
  const hasExistingVisual = slides.some((s) => s.visual?.imageUrl || s.layout === "text-visual" || s.layout === "image-led");
  if (!hasExistingVisual && slides.length >= 3) {
    // Select an intermediate slide that explains a key concept
    const targetIdx = slides.length >= 4 ? 2 : 1;
    const targetSlide = slides[targetIdx];
    if (targetSlide && targetSlide.layout !== "assignment-cover" && targetSlide.layout !== "title") {
      targetSlide.layout = "text-visual";
      targetSlide.visual = {
        type: "picture",
        concept: targetSlide.title,
        caption: targetSlide.subtitle || `Visual topology: ${targetSlide.title}`,
        imagePrompt: `A professional, clean, educational 16:9 presentation illustration of: ${targetSlide.title}. High clarity, minimal clutter, modern aesthetic.`,
      };
    }
  }

  for (const s of slides) {
    if (
      s.layout === "text-visual" ||
      s.layout === "image-led" ||
      s.visual?.concept ||
      s.visual?.imagePrompt
    ) {
      if (!s.visual?.imageUrl) {
        try {
          const prompt =
            s.visual?.imagePrompt ||
            `A modern high-end 16:9 presentation visual: ${s.title}. ${s.subtitle || ""}. Professional aesthetic, clean studio lighting, vibrant colors, no watermarks, no cluttered text.`;
          const concept = s.visual?.concept || s.title;

          // Attempt multi-provider AI image generation (strictly for Presentation Maker)
          const imgRes = await imageProviderManager.generateImage({
            source: "presentation_maker",
            prompt,
            slideTitle: s.title,
            concept,
            aspectRatio: "16:9",
          });

          if (imgRes && imgRes.imageUrl) {
            s.visual = {
              type: imgRes.format === "svg+xml" ? "diagram" : "picture",
              concept,
              caption: s.subtitle || `Visual illustration: ${concept}`,
              imageUrl: imgRes.imageUrl,
            };
          }
        } catch (visErr) {
          console.warn("Multi-provider image generation fallback for slide:", s.title, visErr);
          try {
            const vis = await generateSlideVisual({
              title: s.title,
              subtitle: s.subtitle,
              bullets: s.bullets,
              visualPrompt: s.visual?.imagePrompt || s.visual?.concept,
              visualType: (s.visual?.type as any) || "diagram",
              concept: s.visual?.concept || s.title,
              apiKey: effectiveApiKey,
              accentColor: theme.colors.accent,
              isDark: themeTokens.isDark,
            });
            s.visual = {
              type: vis.type,
              concept: vis.concept,
              caption: vis.caption,
              imageUrl: vis.imageUrl,
              svgContent: vis.svgContent,
            };
          } catch (innerErr) {
            console.warn("Visual generation fallback failed:", innerErr);
          }
        }
      }
    }
  }

  const derivedTitle = input.title.trim() || slides[0]?.title || "Presentation";
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
  const mergedSlide: SlideItem = {
    ...currentSlide,
    ...updatedData,
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
): Promise<PresentationSession | null> {
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

  slide.visual = {
    type: imgResult.format === "svg+xml" ? "diagram" : "picture",
    concept,
    caption: slide.visual?.caption || `Visual: ${concept}`,
    imageUrl: imgResult.imageUrl,
    imagePrompt: prompt,
  };

  // Ensure slide has text-visual layout if it was standard content
  if (slide.layout === "content" || slide.layout === "agenda") {
    slide.layout = "text-visual";
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

setInterval(cleanupExpiredSessions, 30_000);
