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
/**
 * Detects a clean, presentation-ready title from text.
 */
export function detectTitleFromText(text: string): string {
  if (!text || !text.trim()) return "";
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    const clean = line.replace(/^[#*->\d.\s]+/, "").trim();
    if (clean.length >= 3 && clean.length <= 80 && !clean.endsWith(".")) {
      return clean;
    }
  }

  if (lines[0]) {
    const firstClean = lines[0].replace(/^[#*->\d.\s]+/, "").trim();
    return firstClean.length > 80 ? firstClean.slice(0, 75).trim() + "..." : firstClean;
  }
  return "";
}

interface ParsedSection {
  title: string;
  subtitle?: string;
  bullets: string[];
  metrics?: Array<{ label: string; value: string; description?: string }>;
  leftColumn?: { title: string; bullets: string[] };
  rightColumn?: { title: string; bullets: string[] };
}

/**
 * Parses user text into rich structured presentation sections without any dummy corporate text.
 */
function parseContentIntoSections(
  rawContent: string,
  targetSectionCount: number,
  density: "concise" | "balanced" | "detailed",
  defaultTitle: string,
): ParsedSection[] {
  const bulletLimit = density === "concise" ? 3 : density === "detailed" ? 5 : 4;
  const lines = rawContent
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // If no content is supplied, build a clean structure around the title
  if (lines.length === 0) {
    const sections: ParsedSection[] = [];
    for (let i = 0; i < targetSectionCount; i++) {
      sections.push({
        title: `Section 0${i + 1} — Core Analysis`,
        subtitle: `Strategic exploration of ${defaultTitle}`,
        bullets: [
          `Primary premise and scope for ${defaultTitle}`,
          `Methodological approach and implementation criteria`,
          `Operational checkpoint and key milestone`,
        ].slice(0, bulletLimit),
      });
    }
    return sections;
  }

  // 1. Detect headings and group lines into raw section groups
  const rawSections: Array<{ header: string; items: string[] }> = [];
  let currentHeader = "";
  let currentItems: string[] = [];

  const isHeadingLine = (line: string): boolean => {
    if (line.startsWith("#")) return true;
    if (line.endsWith(":") && line.length < 80) return true;
    if (/^\d+[.)]\s+[A-Z]/.test(line) && line.length < 80) return true;
    if (
      /^(Introduction|Overview|Background|Problem|Methodology|Analysis|Results|Findings|Challenges|Solutions|Architecture|Implementation|Conclusion|Summary|Next Steps|Roadmap)/i.test(
        line,
      ) &&
      line.length < 70
    ) {
      return true;
    }
    if (line === line.toUpperCase() && line.length > 3 && line.length < 60 && !line.includes(".")) {
      return true;
    }
    return false;
  };

  for (const line of lines) {
    if (isHeadingLine(line)) {
      if (currentHeader || currentItems.length > 0) {
        if (currentHeader) {
          rawSections.push({ header: currentHeader, items: currentItems });
        } else if (currentItems.length === 1) {
          rawSections.push({
            header: "Key Performance & Metrics",
            items: currentItems,
          });
        } else {
          rawSections.push({
            header: currentItems[0] || "Topic Overview",
            items: currentItems.slice(1),
          });
        }
        currentItems = [];
      }
      currentHeader = line
        .replace(/^[-#*>\d.\s]+/, "")
        .replace(/:$/, "")
        .trim();
    } else {
      currentItems.push(line.replace(/^[-*•]\s*/, "").trim());
    }
  }

  if (currentHeader || currentItems.length > 0) {
    if (currentHeader) {
      rawSections.push({
        header: currentHeader,
        items: currentItems,
      });
    } else if (currentItems.length === 1) {
      rawSections.push({
        header: "Key Performance & Metrics",
        items: currentItems,
      });
    } else {
      rawSections.push({
        header: currentItems[0] || "Topic Overview",
        items: currentItems.slice(1),
      });
    }
  }

  // 2. If no headings were detected, split by paragraphs or chunk lines
  if (rawSections.length === 1 && rawSections[0]!.items.length > 4) {
    const single = rawSections[0]!;
    const allLines = [single.header, ...single.items].filter(Boolean);
    const chunkSize = Math.max(2, Math.ceil(allLines.length / targetSectionCount));
    rawSections.length = 0;

    for (let i = 0; i < allLines.length; i += chunkSize) {
      const slice = allLines.slice(i, i + chunkSize);
      const header =
        slice[0]?.replace(/^[-#*>\d.\s]+/, "").slice(0, 50) || `Section 0${rawSections.length + 1}`;
      const items = slice.slice(1);
      rawSections.push({
        header,
        items: items.length > 0 ? items : [slice[0]!],
      });
    }
  }

  // 3. Balance sections to match targetSectionCount
  while (rawSections.length < targetSectionCount) {
    let maxIdx = -1;
    let maxCount = -1;
    for (let i = 0; i < rawSections.length; i++) {
      if (rawSections[i]!.items.length > maxCount) {
        maxCount = rawSections[i]!.items.length;
        maxIdx = i;
      }
    }

    if (maxIdx >= 0 && maxCount >= 2) {
      const target = rawSections[maxIdx]!;
      const half = Math.ceil(target.items.length / 2);
      const part1 = target.items.slice(0, half);
      const part2 = target.items.slice(half);

      rawSections.splice(
        maxIdx,
        1,
        { header: target.header, items: part1 },
        { header: `${target.header} (Cont.)`, items: part2 },
      );
    } else {
      rawSections.push({
        header: `Strategic Alignment & Focus`,
        items: rawSections[0]?.items.slice(0, 3) || [`Exploration of ${defaultTitle}`],
      });
    }
  }

  while (rawSections.length > targetSectionCount) {
    const last = rawSections.pop()!;
    if (rawSections.length > 0) {
      rawSections[rawSections.length - 1]!.items.push(...last.items);
    }
  }

  // 4. Transform into rich ParsedSection items with automatic layout detection
  const result: ParsedSection[] = [];

  for (let idx = 0; idx < rawSections.length; idx++) {
    const raw = rawSections[idx]!;
    const title = raw.header.slice(0, 70);
    const rawBullets = raw.items.map((b) => b.trim()).filter(Boolean);

    const bullets: string[] = [];
    for (const b of rawBullets) {
      if (b.length > 120 && b.includes(". ")) {
        const sentences = b.split(/(?<=\.)\s+/).filter((s) => s.length > 10);
        bullets.push(...sentences);
      } else {
        bullets.push(b);
      }
    }

    // A. Detect Metrics in this section across both title and bullets
    const metricPattern =
      /(?:\$?\d+(?:\.\d+)?%|\$\d+(?:\.\d+)?[kKmMbB]?|\b\d+(?:\.\d+)?\s*(?:MB|GB|ms|users|tons|kg|billion|million|x)\b|\b\d+x\b)/gi;
    const detectedMetrics: Array<{ label: string; value: string; description?: string }> = [];

    const textSources = [title, ...bullets];
    for (const textItem of textSources) {
      const match = textItem.match(metricPattern);
      if (match && match[0]) {
        const val = match[0];
        const labelText = textItem
          .replace(val, "")
          .replace(/^[-:\s,]+|[-:\s,]+$/g, "")
          .trim();
        const shortLabel = labelText.split(/[,.;]/)[0]?.slice(0, 28) || "Metric Indicator";
        if (shortLabel.length > 2 && !detectedMetrics.some((m) => m.value === val)) {
          detectedMetrics.push({
            value: val,
            label: shortLabel,
            description: textItem.slice(0, 60),
          });
        }
      }
    }

    // B. Detect Comparison in this section
    const isComparison =
      /\b(vs\.?|versus|compared to|on the other hand|pros and cons|difference between)\b/i.test(
        title,
      ) || bullets.some((b) => /\b(vs\.?|versus)\b/i.test(b));

    if (
      detectedMetrics.length >= 1 &&
      (idx === 1 ||
        detectedMetrics.length >= 2 ||
        rawContent.toLowerCase().includes("metric") ||
        rawContent.toLowerCase().includes("indicator") ||
        rawContent.toLowerCase().includes("performance"))
    ) {
      result.push({
        title,
        subtitle: `Key Metrics & Quantitative Analysis`,
        bullets: bullets.slice(0, bulletLimit),
        metrics: detectedMetrics.slice(0, 3),
      });
    } else if (isComparison && bullets.length >= 2) {
      const mid = Math.ceil(bullets.length / 2);
      result.push({
        title,
        subtitle: "Comparative Analysis & Key Distinctions",
        bullets: bullets.slice(0, bulletLimit),
        leftColumn: {
          title: "Primary Perspective",
          bullets: bullets.slice(0, mid),
        },
        rightColumn: {
          title: "Contrasting Factors",
          bullets: bullets.slice(mid, mid * 2),
        },
      });
    } else {
      result.push({
        title,
        subtitle: `Section 0${idx + 1} — Core Analysis`,
        bullets: bullets.length > 0 ? bullets.slice(0, bulletLimit) : [`Key insights for ${title}`],
      });
    }
  }

  return result;
}

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

  // 1. Title detection: If title is empty or generic, detect from rawContent
  let cleanTitle = (title || "").trim();
  if (
    !cleanTitle ||
    cleanTitle === "Strategic Operations & Knowledge Review" ||
    cleanTitle.toLowerCase() === "untitled presentation"
  ) {
    const detected = detectTitleFromText(rawContent);
    cleanTitle = detected || cleanTitle || "Document Presentation";
  }

  // Slide 1: Title / Cover
  slides.push({
    id: "slide-1",
    slideNumber: 1,
    layout: "title",
    title: cleanTitle,
    subtitle: `${purpose.toUpperCase()} // Prepared with DocuMind`,
    notes: `Welcome the audience and introduce the core thesis of ${cleanTitle}.`,
  });

  const totalSlots = Math.min(20, Math.max(3, slideCount));
  const hasConclusion = totalSlots >= 4;
  const contentSlotCount = Math.max(1, totalSlots - (hasConclusion ? 3 : 2));

  // 2. Parse rawContent into structured sections from the user's actual text
  const sections = parseContentIntoSections(rawContent, contentSlotCount, density, cleanTitle);

  // 3. Slide 2: Agenda
  // Agenda bullets are the real titles of the content slides generated from user text
  const agendaTopics = sections.map((s) => s.title);
  if (hasConclusion) {
    agendaTopics.push("Conclusion & Next Steps");
  }

  slides.push({
    id: "slide-2",
    slideNumber: 2,
    layout: "agenda",
    title: "Agenda & Structural Roadmap",
    subtitle: "Core topics covered in this presentation",
    bullets: agendaTopics.slice(0, 6),
    notes: `Briefly outline the presentation roadmap for ${cleanTitle}.`,
  });

  // 4. Intermediate Content Slides (Slide 3 to totalSlots - 1 or totalSlots)
  for (let i = 0; i < sections.length; i++) {
    const slideNumber = i + 3;
    const s = sections[i]!;

    if (s.metrics && s.metrics.length >= 1) {
      slides.push({
        id: `slide-${slideNumber}`,
        slideNumber,
        layout: "metrics",
        title: s.title,
        subtitle: s.subtitle || "Quantifiable indicators and telemetry",
        metrics: s.metrics,
        notes: `Highlight the quantitative data points for ${s.title}.`,
      });
    } else if (s.leftColumn && s.rightColumn) {
      slides.push({
        id: `slide-${slideNumber}`,
        slideNumber,
        layout: "two-column",
        title: s.title,
        subtitle: s.subtitle || "Comparative examination",
        leftColumn: s.leftColumn,
        rightColumn: s.rightColumn,
        notes: `Compare the key dimensions of ${s.title}.`,
      });
    } else {
      slides.push({
        id: `slide-${slideNumber}`,
        slideNumber,
        layout: "content",
        title: s.title,
        subtitle: s.subtitle || `Section 0${i + 1} — Core Analysis`,
        bullets: s.bullets,
        notes: `Elaborate on ${s.title} with supporting context.`,
      });
    }
  }

  // 5. Conclusion Slide (if slideCount >= 4)
  if (hasConclusion) {
    const lastSection = sections[sections.length - 1];
    const conclusionBullets =
      lastSection && lastSection.bullets.length > 0
        ? lastSection.bullets.slice(0, 3)
        : [
            `Summary of decisive insights from ${cleanTitle}.`,
            `Key actionable recommendations and operational alignment.`,
            `Strategic roadmap and milestones for deployment.`,
          ];

    slides.push({
      id: `slide-${totalSlots}`,
      slideNumber: totalSlots,
      layout: "conclusion",
      title: "Key Takeaways & Conclusion",
      subtitle: `Strategic synthesis for ${cleanTitle}`,
      bullets: conclusionBullets,
      notes: `Summarize the decisive conclusions and invite questions.`,
    });
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
