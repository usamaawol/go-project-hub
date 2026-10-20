import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import PptxGenJS from "pptxgenjs";

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
 * Generate structured slide contents from input text and configuration
 */
function buildSlideDeckContent(
  title: string,
  rawContent: string,
  slideCount: number,
  density: "concise" | "balanced" | "detailed",
  purpose: string,
): SlideData[] {
  const slides: SlideData[] = [];
  const lines = rawContent
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const cleanTitle = title.trim() || "Strategic Operations & Knowledge Review";

  // Slide 1: Title / Cover
  slides.push({
    id: "slide-1",
    slideNumber: 1,
    layout: "title",
    title: cleanTitle,
    subtitle: `${purpose.toUpperCase()} // Prepared with DocuMind`,
    notes: "Welcome the audience and introduce the core thesis.",
  });

  // Slide 2: Agenda
  slides.push({
    id: "slide-2",
    slideNumber: 2,
    layout: "agenda",
    title: "Agenda & Structural Roadmap",
    subtitle: "Core topics covered in this presentation",
    bullets: [
      "Executive Summary & Current Landscape",
      "Detailed Analysis & Findings",
      "Strategic Solutions & Methodology",
      "Key Metrics & Performance Indicators",
      "Actionable Recommendations & Next Steps",
    ].slice(0, Math.min(5, Math.max(3, Math.floor(slideCount / 2)))),
    notes: "Briefly outline the sequence before diving into technical details.",
  });

  // Intermediate slides (3 to slideCount - 1)
  const remainingSlots = Math.max(1, slideCount - 2);

  // Group text lines into sections
  const contentChunks: string[][] = [];
  let currentChunk: string[] = [];
  for (const line of lines) {
    if (line.length > 2 && (line.endsWith(":") || line.startsWith("#") || line.startsWith("-"))) {
      if (currentChunk.length > 0) {
        contentChunks.push(currentChunk);
        currentChunk = [];
      }
    }
    currentChunk.push(line.replace(/^[#-]\s*/, ""));
    if (currentChunk.length >= 4) {
      contentChunks.push(currentChunk);
      currentChunk = [];
    }
  }
  if (currentChunk.length > 0) {
    contentChunks.push(currentChunk);
  }

  const defaultTopics = [
    {
      title: "Context & Market Dynamics",
      bullets: [
        "Rapid acceleration in digital document infrastructure",
        "Deterministic accuracy prioritized over stochastic approximations",
        "Zero-retention ephemeral privacy guarantees",
      ],
    },
    {
      title: "Key Performance & Metrics",
      layout: "metrics" as const,
      metrics: [
        { label: "Processing Latency", value: "<18ms", description: "Sub-second client rendering" },
        { label: "Storage Overhead", value: "0 MB", description: "Zero permanent data retention" },
        { label: "Theme Catalog", value: "110+", description: "Curated vector templates" },
      ],
    },
    {
      title: "Strategic Comparative Analysis",
      layout: "two-column" as const,
      leftColumn: {
        title: "Traditional Workflows",
        bullets: [
          "Manual slide formatting",
          "Permanent document tracking",
          "Watermarked free trials",
        ],
      },
      rightColumn: {
        title: "DocuMind Architecture",
        bullets: [
          "Automated vector generation",
          "10-minute ephemeral isolation",
          "50 100% free themes",
        ],
      },
    },
    {
      title: "Implementation Milestones",
      bullets: [
        "Phase 1: In-memory document parsing and font scaling",
        "Phase 2: Live interactive PowerPoint slide preview",
        "Phase 3: Clean vector PPTX export with zero telemetry leakage",
      ],
    },
  ];

  for (let i = 0; i < remainingSlots; i++) {
    const slideNumber = i + 3;
    const isLastContent = i === remainingSlots - 1;

    if (isLastContent && slideCount >= 4) {
      // Conclusion slide
      slides.push({
        id: `slide-${slideNumber}`,
        slideNumber,
        layout: "conclusion",
        title: "Key Takeaways & Conclusion",
        subtitle: "Summary of strategic insights and immediate actions",
        bullets: [
          "Clear document structure elevates communication and engagement.",
          "Vector-grade layouts ensure flawless display across PowerPoint and Keynote.",
          "Ephemeral processing ensures total privacy for sensitive materials.",
        ],
        notes: "Summarize the decisive conclusions and invite questions.",
      });
      break;
    }

    const fallbackIndex = i % defaultTopics.length;
    const fallback = defaultTopics[fallbackIndex]!;

    if (fallback.layout === "metrics") {
      slides.push({
        id: `slide-${slideNumber}`,
        slideNumber,
        layout: "metrics",
        title: fallback.title,
        subtitle: "Quantifiable impacts and system telemetry",
        metrics: fallback.metrics,
        notes: "Highlight the quantitative measurements.",
      });
    } else if (fallback.layout === "two-column") {
      slides.push({
        id: `slide-${slideNumber}`,
        slideNumber,
        layout: "two-column",
        title: fallback.title,
        subtitle: "Side-by-side architectural comparison",
        leftColumn: fallback.leftColumn,
        rightColumn: fallback.rightColumn,
        notes: "Walk through the contrasts between each perspective.",
      });
    } else {
      const chunk = contentChunks[i];
      const slideTitle = chunk && chunk[0] && chunk[0].length < 60 ? chunk[0] : fallback.title;
      const slideBullets =
        chunk && chunk.length > 1
          ? chunk.slice(1, density === "concise" ? 3 : density === "detailed" ? 5 : 4)
          : fallback.bullets;

      slides.push({
        id: `slide-${slideNumber}`,
        slideNumber,
        layout: "content",
        title: slideTitle,
        subtitle: `Section 0${i + 1} — Core Principles`,
        bullets: slideBullets,
        notes: "Elaborate on each bullet point with contextual examples.",
      });
    }
  }

  return slides;
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

  const slides = buildSlideDeckContent(input.title, input.content, slideCount, density, purpose);

  const pptxFilePath = path.join(sessionDir, "presentation.pptx");

  const defaultTheme: PresentationTheme = {
    id: "executive-brief",
    name: "Executive Brief",
    category: "Business",
    kind: "business",
    colors: { primary: "#0F172A", accent: "#2563EB", bg: "#FFFFFF" },
    fonts: "Inter / Roboto",
    tier: "free",
  };
  const theme = input.theme || defaultTheme;

  const session: PresentationSession = {
    id: sessionId,
    title: input.title.trim() || "Untitled Presentation",
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
