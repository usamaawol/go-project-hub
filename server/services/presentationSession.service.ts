import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import PptxGenJS from "pptxgenjs";
import { buildSlideDeckContent } from "../../src/lib/presentation-session-client";
import { ENV } from "../config/env";

export type SlideLayoutType =
  "title" | "agenda" | "content" | "two-column" | "metrics" | "conclusion";

export interface SlideData {
  id: string;
  slideNumber: number;
  layout: SlideLayoutType;
  title: string;
  subtitle?: string;
  bullets?: string[];
  leftColumn?: { title: string; bullets: string[] };
  rightColumn?: { title: string; bullets: string[] };
  metrics?: Array<{ label: string; value: string; description?: string }>;
  notes?: string;
}

export interface PresentationSession {
  id: string;
  title: string;
  purpose: string;
  density: "concise" | "balanced" | "detailed";
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
}

// 10 Minutes in milliseconds
const SESSION_TTL_MS = 10 * 60 * 1000;

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
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = "DocuMind";
  pptx.company = "DocuMind — The Intelligent Paper Studio";
  pptx.title = session.title;

  const primaryHex = (session.theme?.colors?.primary || "#0F172A").replace("#", "");
  const accentHex = (session.theme?.colors?.accent || "#2563EB").replace("#", "");
  const bgHex = (session.theme?.colors?.bg || "#FFFFFF").replace("#", "");

  const fontFace = session.typography?.fontFamily || "Calibri";
  const sizePreset = session.typography?.fontSizePreset || "standard";

  // Sizing scale according to preset
  const sizeMultipliers = {
    compact: { title: 28, subtitle: 13, body: 13, header: 9 },
    standard: { title: 34, subtitle: 15, body: 15, header: 10 },
    large: { title: 40, subtitle: 17, body: 17, header: 11 },
    "extra-large": { title: 46, subtitle: 20, body: 19, header: 12 },
  };
  const sizes = sizeMultipliers[sizePreset] || sizeMultipliers.standard;

  for (const s of session.slides) {
    const slide = pptx.addSlide();
    slide.background = { color: bgHex };

    if (s.layout === "title") {
      // Top accent bar
      slide.addShape(pptx.ShapeType.rect, {
        x: 1.0,
        y: 1.2,
        w: 1.2,
        h: 0.08,
        fill: { color: accentHex },
      });

      // Purpose tag
      slide.addText((session.purpose || "PRESENTATION").toUpperCase(), {
        x: 1.0,
        y: 1.5,
        w: 9.0,
        h: 0.4,
        fontSize: sizes.header,
        bold: true,
        color: accentHex,
        fontFace,
        charSpacing: 2,
      });

      // Big Title
      slide.addText(s.title, {
        x: 1.0,
        y: 2.2,
        w: 10.0,
        h: 2.0,
        fontSize: sizes.title + 6,
        bold: true,
        color: primaryHex,
        fontFace,
      });

      // Subtitle
      if (s.subtitle) {
        slide.addText(s.subtitle, {
          x: 1.0,
          y: 4.4,
          w: 9.5,
          h: 0.6,
          fontSize: sizes.subtitle,
          color: "666666",
          fontFace,
        });
      }

      // Footer
      slide.addText(
        `Theme: ${session.theme.name}  |  Font: ${fontFace}  |  DocuMind Ephemeral Studio`,
        {
          x: 1.0,
          y: 6.2,
          w: 10.0,
          h: 0.3,
          fontSize: 9,
          color: "888888",
          fontFace,
        },
      );
    } else if (s.layout === "metrics" && s.metrics) {
      // Section tag
      slide.addText(`SLIDE 0${s.slideNumber} // METRICS`, {
        x: 0.8,
        y: 0.8,
        w: 6.0,
        h: 0.3,
        fontSize: sizes.header,
        bold: true,
        color: accentHex,
        fontFace,
        charSpacing: 2,
      });

      slide.addText(s.title, {
        x: 0.8,
        y: 1.2,
        w: 10.0,
        h: 0.8,
        fontSize: sizes.title,
        bold: true,
        color: primaryHex,
        fontFace,
      });

      // 3 metric cards
      const cardWidth = 3.2;
      for (const [mIdx, metric] of s.metrics.entries()) {
        const xPos = 0.8 + mIdx * (cardWidth + 0.4);

        slide.addShape(pptx.ShapeType.roundRect, {
          x: xPos,
          y: 2.4,
          w: cardWidth,
          h: 2.6,
          fill: { color: "F8FAFC" },
          line: { color: "E2E8F0", width: 1 },
        });

        slide.addText(metric.value, {
          x: xPos + 0.2,
          y: 2.7,
          w: cardWidth - 0.4,
          h: 0.9,
          fontSize: 32,
          bold: true,
          color: accentHex,
          fontFace,
        });

        slide.addText(metric.label, {
          x: xPos + 0.2,
          y: 3.7,
          w: cardWidth - 0.4,
          h: 0.5,
          fontSize: sizes.body,
          bold: true,
          color: primaryHex,
          fontFace,
        });

        if (metric.description) {
          slide.addText(metric.description, {
            x: xPos + 0.2,
            y: 4.3,
            w: cardWidth - 0.4,
            h: 0.5,
            fontSize: sizes.subtitle - 2,
            color: "666666",
            fontFace,
          });
        }
      }
    } else if (s.layout === "two-column" && s.leftColumn && s.rightColumn) {
      // Section tag
      slide.addText(`SLIDE 0${s.slideNumber} // COMPARISON`, {
        x: 0.8,
        y: 0.8,
        w: 6.0,
        h: 0.3,
        fontSize: sizes.header,
        bold: true,
        color: accentHex,
        fontFace,
        charSpacing: 2,
      });

      slide.addText(s.title, {
        x: 0.8,
        y: 1.2,
        w: 10.0,
        h: 0.8,
        fontSize: sizes.title,
        bold: true,
        color: primaryHex,
        fontFace,
      });

      // Left Box
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8,
        y: 2.3,
        w: 4.8,
        h: 3.8,
        fill: { color: "F8FAFC" },
        line: { color: "E2E8F0", width: 1 },
      });
      slide.addText(s.leftColumn.title, {
        x: 1.1,
        y: 2.5,
        w: 4.2,
        h: 0.4,
        fontSize: sizes.body,
        bold: true,
        color: primaryHex,
        fontFace,
      });
      const leftItems = s.leftColumn.bullets.map((b) => ({
        text: b,
        options: { breakLine: true },
      }));
      slide.addText(leftItems, {
        x: 1.1,
        y: 3.0,
        w: 4.2,
        h: 2.8,
        fontSize: sizes.body - 1,
        color: "444444",
        bullet: true,
        lineSpacing: 24,
        fontFace,
      });

      // Right Box
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 6.0,
        y: 2.3,
        w: 4.8,
        h: 3.8,
        fill: { color: "F8FAFC" },
        line: { color: accentHex, width: 1.5 },
      });
      slide.addText(s.rightColumn.title, {
        x: 6.3,
        y: 2.5,
        w: 4.2,
        h: 0.4,
        fontSize: sizes.body,
        bold: true,
        color: accentHex,
        fontFace,
      });
      const rightItems = s.rightColumn.bullets.map((b) => ({
        text: b,
        options: { breakLine: true },
      }));
      slide.addText(rightItems, {
        x: 6.3,
        y: 3.0,
        w: 4.2,
        h: 2.8,
        fontSize: sizes.body - 1,
        color: "444444",
        bullet: true,
        lineSpacing: 24,
        fontFace,
      });
    } else {
      // Content / Agenda / Conclusion slide
      slide.addText(`SLIDE 0${s.slideNumber} // ${s.layout.toUpperCase()}`, {
        x: 0.8,
        y: 0.8,
        w: 6.0,
        h: 0.3,
        fontSize: sizes.header,
        bold: true,
        color: accentHex,
        fontFace,
        charSpacing: 2,
      });

      slide.addText(s.title, {
        x: 0.8,
        y: 1.2,
        w: 10.0,
        h: 0.8,
        fontSize: sizes.title,
        bold: true,
        color: primaryHex,
        fontFace,
      });

      if (s.subtitle) {
        slide.addText(s.subtitle, {
          x: 0.8,
          y: 2.0,
          w: 9.5,
          h: 0.4,
          fontSize: sizes.subtitle,
          color: "666666",
          italic: true,
          fontFace,
        });
      }

      if (s.bullets && s.bullets.length > 0) {
        const bulletItems = s.bullets.map((b) => ({
          text: b,
          options: { breakLine: true },
        }));
        slide.addText(bulletItems, {
          x: 0.8,
          y: 2.6,
          w: 9.5,
          h: 3.5,
          fontSize: sizes.body,
          color: "333333",
          bullet: true,
          lineSpacing: 28,
          fontFace,
        });
      }
    }
  }

  // Write physical file to isolated temp path
  const rawData = await pptx.write({ outputType: "nodebuffer" });
  const buffer = Buffer.isBuffer(rawData) ? rawData : Buffer.from(rawData as ArrayBuffer);
  fs.writeFileSync(destPath, buffer);
  return buffer.length;
}

/**
 * Synthesizes dynamic slide content using Gemini 2.5 Flash if available
 */
async function generateSlidesWithGemini(
  title: string,
  content: string,
  slideCount: number,
  density: "concise" | "balanced" | "detailed",
  purpose: string,
): Promise<SlideData[] | null> {
  if (!ENV.GEMINI_API_KEY || !content || content.trim().length < 20) return null;

  try {
    const prompt = `You are DocuMind's presentation engine.
Analyze the following source document/notes and generate a cohesive, professional presentation of exactly ${slideCount} slides with purpose "${purpose}" and content density "${density}".
The user's requested title is "${title || "Detect best title from text"}".

SOURCE TEXT:
"""
${content.slice(0, 10000)}
"""

Respond in JSON adhering strictly to this schema:
{
  "title": "string",
  "slides": [
    {
      "slideNumber": 1,
      "layout": "title",
      "title": "string",
      "subtitle": "string",
      "notes": "string"
    },
    {
      "slideNumber": 2,
      "layout": "agenda",
      "title": "Agenda & Topics",
      "subtitle": "Core topics covered in this presentation",
      "bullets": ["topic 1", "topic 2"]
    },
    ... (intermediate slides with layout 'content', 'two-column', or 'metrics')
    {
      "slideNumber": ${slideCount},
      "layout": "conclusion",
      "title": "Key Takeaways & Conclusion",
      "subtitle": "Summary of insights and forward actions",
      "bullets": ["conclusion 1", "conclusion 2"]
    }
  ]
}

STRICT REQUIREMENTS:
1. Every slide title, bullet point, metric, and comparison MUST be derived directly from the source text.
2. DO NOT use generic corporate filler or placeholder text.
3. Slide 2 Agenda bullets MUST list the actual topics covered in the subsequent slides.
4. Return exactly ${slideCount} slides.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${ENV.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
        signal: AbortSignal.timeout(12000),
      },
    );

    interface GeminiSlideOutput {
      layout?: SlideLayoutType;
      title?: string;
      subtitle?: string;
      bullets?: string[];
      leftColumn?: { title: string; bullets: string[] };
      rightColumn?: { title: string; bullets: string[] };
      metrics?: Array<{ label: string; value: string; description?: string }>;
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
                  : idx === parsed.slides.length - 1
                    ? "conclusion"
                    : "content"),
            title: s.title || `Slide ${idx + 1}`,
            subtitle: s.subtitle,
            bullets: Array.isArray(s.bullets) ? s.bullets : undefined,
            leftColumn: s.leftColumn,
            rightColumn: s.rightColumn,
            metrics: Array.isArray(s.metrics) ? s.metrics : undefined,
            notes: s.notes,
          }));
        }
      }
    }
  } catch (err) {
    console.warn(
      "Gemini slide synthesis unavailable or timed out, falling back to local semantic parser:",
      err,
    );
  }
  return null;
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

  // First attempt AI synthesis with Gemini 2.5 Flash if available, otherwise use deterministic semantic parser
  let slides: SlideData[] = [];
  const aiSlides = await generateSlidesWithGemini(
    input.title,
    input.content,
    slideCount,
    density,
    purpose,
  );
  if (aiSlides && aiSlides.length === slideCount) {
    slides = aiSlides;
  } else {
    slides = buildSlideDeckContent(input.title, input.content, slideCount, density, purpose);
  }

  const pptxFilePath = path.join(sessionDir, "presentation.pptx");

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

  const derivedTitle = input.title.trim() || slides[0]?.title || "Presentation";

  const session: PresentationSession = {
    id: sessionId,
    title: derivedTitle,
    purpose,
    density,
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
    // Purge expired session immediately
    deletePresentationSession(sessionId);
    return null;
  }

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

  // Also check disk for orphaned session directories older than 10 minutes
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
  } catch (e) {
    // Suppress disk scanning errors
  }

  return cleanedCount;
}

// Start recurring 30-second cleanup timer
setInterval(cleanupExpiredSessions, 30_000);
