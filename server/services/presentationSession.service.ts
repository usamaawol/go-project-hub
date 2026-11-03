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
 * Summarizes long source documents into an outline brief if document exceeds capacity,
 * dynamically scaling character limits and coverage according to target slide count.
 */
function prepareDocumentBrief(content: string, targetSlideCount: number = 8): string {
  const maxChars = targetSlideCount > 20 ? Math.min(45000, targetSlideCount * 1200) : 10000;
  if (content.length <= maxChars) return content;

  // Split into chunks across sections or paragraphs
  const chunks = content.split(/\n\s*\n/).filter((c) => c.trim().length > 0);
  if (chunks.length <= 4) {
    return content.slice(0, maxChars);
  }

  // Preserve introduction, intermediate sections, and conclusion proportionally
  const introCount = Math.max(2, Math.floor(targetSlideCount / 5));
  const intro = chunks.slice(0, introCount).join("\n\n");
  const middleIndices = Math.floor(chunks.length / 2);
  const middleSpan = Math.max(3, Math.floor(targetSlideCount / 4));
  const middleStart = Math.max(introCount, middleIndices - Math.floor(middleSpan / 2));
  const middleEnd = Math.min(chunks.length - 2, middleStart + middleSpan);
  const middle = chunks.slice(middleStart, middleEnd).join("\n\n");
  const conclusionCount = Math.max(2, Math.floor(targetSlideCount / 8));
  const conclusion = chunks.slice(-conclusionCount).join("\n\n");

  return `EXECUTIVE SUMMARY & INTRO:\n${intro}\n\nCORE BODY & ANALYSIS:\n${middle}\n\nCONCLUSIONS & METRICS:\n${conclusion}`.slice(
    0,
    maxChars,
  );
}

/**
 * Synthesizes dynamic AI presentation slide design using Gemini 2.5 Flash
 * with deep content analysis and rich, unconstrained layout orchestration.
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
  },
): Promise<SlideData[] | null> {
  const activeKey = apiKey || ENV.GEMINI_API_KEY;
  if (!activeKey || !content || content.trim().length < 20) return null;

  try {
    const documentBrief = prepareDocumentBrief(content, slideCount);
    const isAssignment = Boolean(options?.assignmentMetadata?.isAssignment);
    const audience =
      options?.audience ||
      (isAssignment
        ? "Academic Professors, Evaluators & Department Faculty"
        : "Executive Decision Makers, Clients & Stakeholders");
    const language = options?.language || "English";
    const additionalInstructions = options?.additionalInstructions || "";

    const prompt = `You are DocuMind's Senior Presentation Architect & Elite Creative Director.
Your task is to transform the provided source document into a visually compelling, professionally designed, modern ${slideCount}-slide presentation deck.

PRESENTATION PARAMETERS:
- Requested Title: "${title || "Detect optimal executive title from source"}"
- Target Slide Count: Exactly ${slideCount} slides
- Presentation Type: ${isAssignment ? "ACADEMIC ASSIGNMENT PRESENTATION" : "STANDARD MODERN PRESENTATION"}
- Primary Purpose: "${purpose}"
- Target Audience: "${audience}"
- Presentation Language: "${language}"
- Content Density: "${density}"
${additionalInstructions ? `- User Design & Content Directives: "${additionalInstructions}"` : ""}

${
  isAssignment
    ? `ACADEMIC ASSIGNMENT RIGOR:
- Maintain academic precision, theoretical models, methodology, and citations if present.
- Follow logical academic progression: Problem Statement/Thesis, Literature Context, Methodology, Empirical Data & Analysis, Critical Discussion, Key Conclusions & Recommendations.
- Respect course and subject boundaries without inventing false empirical data.`
    : `STANDARD PRESENTATION NARRATIVE:
- Create a compelling narrative arc: Executive Opening, Problem Landscape, Core Architecture/Pillars, Deep Dives, Strategic Telemetry/Milestones, Synthesis & Call to Action.
- Focus on clarity, punchy articulation, modern typography, and information design.`
}

SOURCE MATERIAL TO ANALYZE AND TRANSFORM:
"""
${documentBrief}
"""

DESIGN INSTRUCTIONS — NO BORING OR REPETITIVE SLIDES:
1. NEVER use the same layout consecutively. Produce a dynamic, varied visual rhythm.
2. Select the optimal layout for each individual slide from this rich palette:
   - "title": Presentation hero cover (Slide 1).
   - "agenda": Structural roadmap (Slide 2).
   - "hero-split": Modern split-screen layout with a prominent left hero container (bold headline + highlight) and 2-3 structured right takeaway cards. Best for decisive mandates or architectural foundations.
   - "bento-grid": 4-quadrant feature matrix (2x2 grid) with distinct titles, tags, and concise descriptions. Fills the slide perfectly with zero empty space. Best for 4 pillars or modular systems.
   - "headline-hero": Large high-impact statement banner + 2-3 supporting takeaway cards below. Best for central insights, key facts, or major takeaways.
   - "two-column": Comparative analysis (In-scope vs out-of-scope, Before vs After, Pros vs Cons).
   - "three-card": 3 distinct vertical pillar cards with tags and descriptions.
   - "metrics": KPI telemetry and quantitative performance indicators with numeric values and labels.
   - "timeline": Chronological phases, milestones, or evolution steps.
   - "process": Sequential numbered workflow steps.
   - "quote": Powerful executive takeaway or decisive quote.
   - "diagram-explainer": Deep technical specification with labeled components and side explanation.
   - "text-visual": Content combined with an AI-generated image or vector diagram.
   - "image-led": High-impact visual-first slide with image prompt.
   - "conclusion": Final synthesis and forward roadmap (Last slide).
3. INTELLIGENT WHITESPACE USAGE:
   - Eliminate accidental, empty, or unbalanced whitespace.
   - Distribute content into structured cards, metrics, or split-screen layouts rather than leaving vast blank areas.
4. AI VISUAL ASSET GENERATION:
   - Identify at least one slide (and up to 3 slides for longer decks) that would strongly benefit from visual explanation (e.g. diagrams, illustrations, charts, topology).
   - For these slides, use layout "text-visual", "diagram-explainer", or "image-led", and provide a vivid "imagePrompt" in the "visual" field:
     "visual": {
       "type": "picture"|"diagram"|"chart",
       "concept": "concise concept title",
       "caption": "explanatory caption",
       "imagePrompt": "Detailed prompt describing a clean, modern, professional 16:9 presentation visual asset: minimal aesthetic, vibrant accents, studio lighting, no text watermarks."
     }
5. Return exactly ${slideCount} slides with slide numbers from 1 to ${slideCount}.

Respond in JSON adhering strictly to this schema:
{
  "title": "string",
  "slides": [
    {
      "slideNumber": 1,
      "layout": "title",
      "title": "string",
      "subtitle": "string",
      "categoryTag": "string",
      "notes": "string"
    },
    ...
  ]
}`;

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
      heroSplit?: { headline: string; highlight: string; details: string[] };
      bentoGrid?: Array<{ title: string; description: string; tag?: string }>;
      statCallout?: { stat: string; label: string; context: string; bullets?: string[] };
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

  const sessionId = crypto.randomUUID();
  const sessionDir = path.join(BASE_TEMP_DIR, sessionId);

  fs.mkdirSync(sessionDir, { recursive: true });

  const slideCount = Math.min(60, Math.max(3, input.slideCount || 8));
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
        {
          audience: input.audience,
          language: input.language,
          additionalInstructions: input.additionalInstructions,
          assignmentMetadata: input.assignmentMetadata,
        },
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

/**
 * Deterministic local slide redesign fallback based on natural language keywords
 */
function applyLocalSlideRedesign(slide: SlideItem, instruction: string): void {
  const lower = instruction.toLowerCase();
  if (lower.includes("bento") || lower.includes("4-card") || lower.includes("grid")) {
    slide.layout = "bento-grid";
    slide.bentoGrid = [
      {
        title: "Core Architecture",
        description: slide.bullets?.[0] || "Foundational operational service layer and interface boundaries.",
        tag: "FOUNDATION",
      },
      {
        title: "Strategic Workflow",
        description: slide.bullets?.[1] || "Continuous integration pipeline and automated verification gates.",
        tag: "WORKFLOW",
      },
      {
        title: "Telemetry & Metrics",
        description: slide.bullets?.[2] || "Real-time performance indicators and operational thresholds.",
        tag: "TELEMETRY",
      },
      {
        title: "Target Deliverable",
        description: slide.bullets?.[3] || "Production validation benchmarks and milestone release readiness.",
        tag: "DELIVERABLE",
      },
    ];
  } else if (
    lower.includes("hero") ||
    lower.includes("split") ||
    lower.includes("attractive") ||
    lower.includes("punchy") ||
    lower.includes("modern")
  ) {
    slide.layout = "hero-split";
    slide.heroSplit = {
      headline: slide.title,
      highlight: slide.subtitle || slide.bullets?.[0] || "Decisive strategic capability & architecture",
      details:
        slide.bullets && slide.bullets.length > 0
          ? slide.bullets.slice(0, 3)
          : [
              "Core operational milestone verified across execution gates.",
              "End-to-end architectural framework delivery confirmed.",
            ],
    };
  } else if (lower.includes("diagram") || lower.includes("visual") || lower.includes("concept") || lower.includes("chart")) {
    slide.layout = "text-visual";
    slide.visual = {
      type: "diagram",
      concept: slide.title,
      caption: `Conceptual architecture: ${slide.title}`,
      imageUrl: buildSlideDeckContent(slide.title, slide.bullets?.join("\n") || "", 4, "balanced", "Business Strategy")[1]?.visual?.imageUrl,
    };
  } else if (lower.includes("comparison") || lower.includes("two-column") || lower.includes("compare")) {
    slide.layout = "two-column";
    slide.leftColumn = {
      title: "In-Scope & Strengths",
      bullets: slide.bullets && slide.bullets.length >= 2 ? slide.bullets.slice(0, 2) : ["Strategic alignment", "Operational efficiency"],
    };
    slide.rightColumn = {
      title: "Constraints & Guardrails",
      bullets: slide.bullets && slide.bullets.length > 2 ? slide.bullets.slice(2, 4) : ["Zero regression tolerance", "Compliance validation"],
    };
  } else if (lower.includes("process") || lower.includes("step") || lower.includes("workflow")) {
    slide.layout = "process";
    slide.processSteps = [
      { stepNumber: 1, title: "Discovery & Analysis", description: slide.bullets?.[0] || "Define strategic parameters and scope." },
      { stepNumber: 2, title: "Architecture & Implementation", description: slide.bullets?.[1] || "Construct resilient modular components." },
      { stepNumber: 3, title: "Validation & Release", description: slide.bullets?.[2] || "Verify quality benchmarks and deployment gates." },
    ];
  } else if (lower.includes("metric") || lower.includes("number") || lower.includes("data")) {
    slide.layout = "metrics";
    slide.metrics = [
      { label: "Throughput", value: "99.8%", description: "Continuous service availability" },
      { label: "Adoption", value: "+45%", description: "Quarterly active workflow expansion" },
      { label: "Efficiency", value: "<15ms", description: "Average processing latency" },
    ];
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
                updatedSlide.visual = {
                  type: imgRes.format === "svg+xml" ? "diagram" : "picture",
                  concept,
                  caption: updatedSlide.subtitle || `Visual: ${concept}`,
                  imageUrl: imgRes.imageUrl,
                  imagePrompt: vPrompt,
                };
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
