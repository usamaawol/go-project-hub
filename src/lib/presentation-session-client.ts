import PptxGenJS from "pptxgenjs";

export type SlideLayoutType =
  "title" | "agenda" | "content" | "two-column" | "metrics" | "conclusion";

export interface SlidePreviewItem {
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

export interface PresentationSessionData {
  id: string;
  title: string;
  purpose: string;
  density: "concise" | "balanced" | "detailed";
  theme: {
    id: string;
    name: string;
    category: string;
    kind: string;
    colors: { primary: string; accent: string; bg: string };
    fonts: string;
    tier: "free" | "pro";
  };
  typography: {
    fontFamily: string;
    fontSizePreset: "compact" | "standard" | "large" | "extra-large";
  };
  slideCount: number;
  slides: SlidePreviewItem[];
  fileSize: number;
  createdAt: number;
  expiresAt: number;
  secondsRemaining: number;
}

const STORAGE_PREFIX = "documind_presentation_session_";

/**
 * Builds structured slide items deterministically from text content and user settings.
 * Pure logic compatible with both browser and Node runtime.
 */
export function buildSlideDeckContent(
  title: string,
  rawContent: string,
  slideCount: number,
  density: "concise" | "balanced" | "detailed",
  purpose: string,
): SlidePreviewItem[] {
  const slides: SlidePreviewItem[] = [];
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

// In-memory fallback if sessionStorage is unavailable (e.g. during SSR)
const memoryStore = new Map<string, PresentationSessionData>();

export function saveClientSession(session: PresentationSessionData): void {
  memoryStore.set(session.id, session);
  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      window.sessionStorage.setItem(`${STORAGE_PREFIX}${session.id}`, JSON.stringify(session));
    } catch (e) {
      console.warn("Could not save presentation to sessionStorage:", e);
    }
  }
}

export function getClientSession(sessionId: string): PresentationSessionData | null {
  if (memoryStore.has(sessionId)) {
    const item = memoryStore.get(sessionId)!;
    if (Date.now() > item.expiresAt) {
      memoryStore.delete(sessionId);
      return null;
    }
    return item;
  }

  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      const stored = window.sessionStorage.getItem(`${STORAGE_PREFIX}${sessionId}`);
      if (!stored) return null;
      const parsed: PresentationSessionData = JSON.parse(stored);
      if (Date.now() > parsed.expiresAt) {
        window.sessionStorage.removeItem(`${STORAGE_PREFIX}${sessionId}`);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  return null;
}

export function removeClientSession(sessionId: string): void {
  memoryStore.delete(sessionId);
  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      window.sessionStorage.removeItem(`${STORAGE_PREFIX}${sessionId}`);
    } catch {
      // ignore
    }
  }
}

/**
 * Compiles and downloads a PowerPoint file directly inside the browser using PptxGenJS.
 * Guarantees downloads work even when backend server is unavailable (e.g. on Vercel).
 */
export async function generateAndDownloadClientPptx(
  session: PresentationSessionData,
): Promise<string> {
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
      slide.addShape(pptx.ShapeType.rect, {
        x: 1.0,
        y: 1.2,
        w: 1.2,
        h: 0.08,
        fill: { color: accentHex },
      });

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

      slide.addText(
        `DocuMind Intelligent Paper Studio  |  ${session.theme.name}  |  ${session.typography.fontFamily}`,
        {
          x: 1.0,
          y: 6.4,
          w: 9.0,
          h: 0.4,
          fontSize: sizes.header,
          color: "94A3B8",
          fontFace,
        },
      );
    } else if (s.layout === "agenda") {
      slide.addText("AGENDA & STRATEGY", {
        x: 1.0,
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
        x: 1.0,
        y: 1.2,
        w: 10.0,
        h: 0.8,
        fontSize: sizes.title,
        bold: true,
        color: primaryHex,
        fontFace,
      });

      if (s.bullets && s.bullets.length > 0) {
        const bulletObjects = s.bullets.map((b) => ({
          text: b,
          options: { breakLine: true },
        }));
        slide.addText(bulletObjects, {
          x: 1.0,
          y: 2.2,
          w: 9.5,
          h: 4.0,
          fontSize: sizes.body + 2,
          color: "334155",
          fontFace,
          bullet: true,
          lineSpacing: 34,
        });
      }
    } else if (s.layout === "metrics") {
      slide.addText("PERFORMANCE INDICATORS", {
        x: 1.0,
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
        x: 1.0,
        y: 1.2,
        w: 10.0,
        h: 0.8,
        fontSize: sizes.title,
        bold: true,
        color: primaryHex,
        fontFace,
      });

      if (s.metrics && s.metrics.length > 0) {
        const count = s.metrics.length;
        const boxWidth = 9.5 / count - 0.2;
        s.metrics.forEach((m, idx) => {
          const xPos = 1.0 + idx * (boxWidth + 0.2);
          slide.addShape(pptx.ShapeType.roundRect, {
            x: xPos,
            y: 2.5,
            w: boxWidth,
            h: 3.0,
            fill: { color: "F8FAFC" },
            line: { color: accentHex, width: 1 },
          });

          slide.addText(m.value, {
            x: xPos + 0.2,
            y: 2.8,
            w: boxWidth - 0.4,
            h: 1.0,
            fontSize: sizes.title + 8,
            bold: true,
            color: accentHex,
            fontFace,
            align: "center",
          });

          slide.addText(m.label, {
            x: xPos + 0.2,
            y: 3.9,
            w: boxWidth - 0.4,
            h: 0.6,
            fontSize: sizes.body,
            bold: true,
            color: primaryHex,
            fontFace,
            align: "center",
          });

          if (m.description) {
            slide.addText(m.description, {
              x: xPos + 0.2,
              y: 4.6,
              w: boxWidth - 0.4,
              h: 0.6,
              fontSize: sizes.header,
              color: "64748B",
              fontFace,
              align: "center",
            });
          }
        });
      }
    } else if (s.layout === "two-column") {
      slide.addText("COMPARATIVE ANALYSIS", {
        x: 1.0,
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
        x: 1.0,
        y: 1.2,
        w: 10.0,
        h: 0.8,
        fontSize: sizes.title,
        bold: true,
        color: primaryHex,
        fontFace,
      });

      // Left Column
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 1.0,
        y: 2.3,
        w: 4.6,
        h: 3.8,
        fill: { color: "F1F5F9" },
        line: { color: "CBD5E1", width: 1 },
      });

      slide.addText(s.leftColumn?.title || "Perspective A", {
        x: 1.2,
        y: 2.5,
        w: 4.2,
        h: 0.4,
        fontSize: sizes.subtitle + 2,
        bold: true,
        color: primaryHex,
        fontFace,
      });

      if (s.leftColumn?.bullets) {
        slide.addText(
          s.leftColumn.bullets.map((b) => ({ text: b, options: { breakLine: true } })),
          {
            x: 1.2,
            y: 3.0,
            w: 4.2,
            h: 2.8,
            fontSize: sizes.body,
            color: "334155",
            fontFace,
            bullet: true,
            lineSpacing: 24,
          },
        );
      }

      // Right Column
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 5.9,
        y: 2.3,
        w: 4.6,
        h: 3.8,
        fill: { color: "F8FAFC" },
        line: { color: accentHex, width: 1 },
      });

      slide.addText(s.rightColumn?.title || "Perspective B", {
        x: 6.1,
        y: 2.5,
        w: 4.2,
        h: 0.4,
        fontSize: sizes.subtitle + 2,
        bold: true,
        color: accentHex,
        fontFace,
      });

      if (s.rightColumn?.bullets) {
        slide.addText(
          s.rightColumn.bullets.map((b) => ({ text: b, options: { breakLine: true } })),
          {
            x: 6.1,
            y: 3.0,
            w: 4.2,
            h: 2.8,
            fontSize: sizes.body,
            color: "334155",
            fontFace,
            bullet: true,
            lineSpacing: 24,
          },
        );
      }
    } else if (s.layout === "conclusion") {
      slide.background = { color: primaryHex };

      slide.addText("DECISIVE ACTION & TAKEAWAYS", {
        x: 1.0,
        y: 1.2,
        w: 9.0,
        h: 0.3,
        fontSize: sizes.header,
        bold: true,
        color: accentHex,
        fontFace,
        charSpacing: 2,
      });

      slide.addText(s.title, {
        x: 1.0,
        y: 1.6,
        w: 10.0,
        h: 1.0,
        fontSize: sizes.title + 2,
        bold: true,
        color: "FFFFFF",
        fontFace,
      });

      if (s.bullets && s.bullets.length > 0) {
        slide.addText(
          s.bullets.map((b) => ({ text: b, options: { breakLine: true } })),
          {
            x: 1.0,
            y: 2.8,
            w: 9.5,
            h: 3.0,
            fontSize: sizes.body + 2,
            color: "E2E8F0",
            fontFace,
            bullet: true,
            lineSpacing: 30,
          },
        );
      }

      slide.addText("Generated with DocuMind The Intelligent Paper Studio", {
        x: 1.0,
        y: 6.2,
        w: 9.5,
        h: 0.4,
        fontSize: sizes.header,
        color: "94A3B8",
        fontFace,
      });
    } else {
      // Standard content layout
      slide.addText(s.subtitle || "SECTION OVERVIEW", {
        x: 1.0,
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
        x: 1.0,
        y: 1.2,
        w: 10.0,
        h: 0.8,
        fontSize: sizes.title,
        bold: true,
        color: primaryHex,
        fontFace,
      });

      if (s.bullets && s.bullets.length > 0) {
        slide.addText(
          s.bullets.map((b) => ({ text: b, options: { breakLine: true } })),
          {
            x: 1.0,
            y: 2.2,
            w: 9.5,
            h: 4.0,
            fontSize: sizes.body,
            color: "334155",
            fontFace,
            bullet: true,
            lineSpacing: 28,
          },
        );
      }
    }
  }

  const fileName = `${session.title.replace(/[^a-zA-Z0-9_-]/g, "_") || "presentation"}.pptx`;
  await pptx.writeFile({ fileName });
  return fileName;
}
