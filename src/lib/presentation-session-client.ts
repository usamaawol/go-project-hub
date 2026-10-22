import { type SlideLayoutType, computeThemeTokens, type RawThemeInput } from "./presentation-theme";
import { renderSlideDeckToPptx } from "./presentation-renderer";
import { buildContextualVisual } from "./presentation-visual-generator";

export type { SlideLayoutType };

export interface SlidePreviewItem {
  id: string;
  slideNumber: number;
  layout: SlideLayoutType;
  title: string;
  subtitle?: string;
  categoryTag?: string;
  bullets?: string[];
  // Comparison & Two-column
  leftColumn?: { title: string; bullets: string[] };
  rightColumn?: { title: string; bullets: string[] };
  // Three Pillar Cards
  cards?: Array<{ title: string; description: string; tag?: string }>;
  // Metrics & KPI telemetry
  metrics?: Array<{ label: string; value: string; description?: string }>;
  // Timeline & Phases
  timeline?: Array<{ phase: string; title: string; description: string }>;
  // Process & Steps
  processSteps?: Array<{ stepNumber: number; title: string; description: string }>;
  // Quote & Standout Takeaway
  quote?: { text: string; author?: string; role?: string };
  // Table / Matrix
  table?: {
    headers: string[];
    rows: string[][];
  };
  // Visual Asset / Diagram / Graph / Picture
  visual?: {
    type: "diagram" | "illustration" | "chart" | "image" | "picture" | "graph";
    concept: string;
    diagramType?: "architecture" | "flowchart" | "layers" | "metrics-bars" | "venn";
    imagePrompt?: string;
    imageUrl?: string;
    svgContent?: string;
    caption?: string;
  };
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
 * Detects a clean, presentation-ready title from raw input text.
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
  cards?: Array<{ title: string; description: string; tag?: string }>;
  timeline?: Array<{ phase: string; title: string; description: string }>;
  processSteps?: Array<{ stepNumber: number; title: string; description: string }>;
  quote?: { text: string; author?: string; role?: string };
  visual?: SlidePreviewItem["visual"];
}

/**
 * Intelligently decomposes text into cohesive thematic sections.
 * Handles single-topic notes, multi-page documents, and structured outlines.
 */
function parseContentIntoSections(
  rawContent: string,
  targetCount: number,
  density: "concise" | "balanced" | "detailed",
  defaultTitle: string,
): ParsedSection[] {
  const bulletLimit = density === "concise" ? 3 : density === "detailed" ? 5 : 4;
  const lines = rawContent
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // If input is minimal, produce structured analytical sections around the title
  if (lines.length === 0) {
    const defaultSections: ParsedSection[] = [];
    for (let i = 0; i < targetCount; i++) {
      defaultSections.push({
        title: `Section 0${i + 1} — Core Analysis`,
        subtitle: `Exploration of key dimensions for ${defaultTitle}`,
        bullets: [
          `Primary scope and analytical framework for ${defaultTitle}`,
          `Implementation criteria and architectural considerations`,
          `Operational milestones and verification metrics`,
        ].slice(0, bulletLimit),
      });
    }
    return defaultSections;
  }

  // 1. Group content into raw thematic sections by headings, numbers, or blank lines
  const rawSections: Array<{ header: string; items: string[] }> = [];
  let currentHeader = "";
  let currentItems: string[] = [];

  const isSubHeadingLine = (line: string): boolean => {
    return /^(design characteristics|characteristics|features|key features|attributes|specifications|requirements|details|notes|creative direction|visual direction|style guide|parameters):?$/i.test(
      line.trim(),
    );
  };

  const isLeadInClause = (line: string): boolean => {
    const trimmed = line.trim().toLowerCase();
    return (
      /^(these tasks can include|these include|this includes|tasks include|can include|for example|such as|at a high level|in general|in summary|as follows|specifically|to illustrate|for instance|in particular|namely|e\.g\.|i\.e\.|including the following)/i.test(
        trimmed,
      ) ||
      /(can include|includes|following|follow|such as|for example|consists of|are as follows):?$/i.test(
        trimmed,
      )
    );
  };

  const isHeadingLine = (line: string): boolean => {
    if (isSubHeadingLine(line)) return false;
    if (isLeadInClause(line)) return false;
    if (line.startsWith("#")) return true;
    if (line.endsWith(":") && line.length < 80) return true;
    if (/^\d+[.)]\s+[A-Z]/.test(line) && line.length < 80) return true;
    if (/^phase\s+\d+/i.test(line) && line.length < 80) return true;
    if (/^concept\s+\d+/i.test(line) && line.length < 80) return true;
    if (
      /^(Introduction|Overview|Executive Summary|Background|Problem|Methodology|Analysis|Results|Findings|Key Indicators|Challenges|Solutions|Architecture|Implementation|Roadmap|Timeline|Conclusion|Summary|Next Steps|Scope|Boundaries)/i.test(
        line,
      ) &&
      line.length < 75
    ) {
      return true;
    }
    if (line === line.toUpperCase() && line.length > 3 && line.length < 60 && !line.includes(".")) {
      return true;
    }
    return false;
  };

  for (const line of lines) {
    if (isSubHeadingLine(line)) {
      // Sub-heading belongs to parent section; don't split
      currentItems.push(line.replace(/:$/, "").trim() + ":");
    } else if (isHeadingLine(line)) {
      if (currentHeader || currentItems.length > 0) {
        rawSections.push({
          header: currentHeader || currentItems[0] || "Overview",
          items: currentHeader ? currentItems : currentItems.slice(1),
        });
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
    rawSections.push({
      header: currentHeader || currentItems[0] || "Synthesis & Overview",
      items: currentHeader ? currentItems : currentItems.slice(1),
    });
  }

  // If document had no explicit headings, partition paragraphs or line chunks
  if (rawSections.length === 1 && rawSections[0]!.items.length > 3) {
    const single = rawSections[0]!;
    const allLines = [single.header, ...single.items].filter(Boolean);
    const chunkSize = Math.max(2, Math.ceil(allLines.length / targetCount));
    rawSections.length = 0;

    for (let i = 0; i < allLines.length; i += chunkSize) {
      const slice = allLines.slice(i, i + chunkSize);
      const header =
        slice[0]?.replace(/^[-#*>\d.\s]+/, "").slice(0, 60) || `Topic ${rawSections.length + 1}`;
      const items = slice.slice(1);
      rawSections.push({
        header,
        items: items.length > 0 ? items : [slice[0]!],
      });
    }
  }

  // Balance section count to targetCount
  while (rawSections.length < targetCount) {
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
        items: [`Continuous synthesis and verification for ${defaultTitle}`],
      });
    }
  }

  while (rawSections.length > targetCount) {
    const last = rawSections.pop()!;
    if (rawSections.length > 0) {
      rawSections[rawSections.length - 1]!.items.push(...last.items);
    }
  }

  // Helper: Cleans sentence fragments into professional presentation headings
  function cleanSlideTitle(rawHeader: string): string {
    let t = (rawHeader || "")
      .replace(/^[-#*>\d.\s]+/, "")
      .replace(/[:.]+$/, "")
      .trim();

    const lower = t.toLowerCase();
    if (lower === "data or input" || lower === "data and input" || lower === "input or data" || lower === "data") {
      return "Data Ingestion & Multimodal Inputs";
    }
    if (lower === "model or ai system" || lower === "model or ai" || lower === "ai model" || lower === "model") {
      return "Core AI Model & Inference Architecture";
    }
    if (lower.startsWith("at a high level")) {
      return "High-Level System Architecture & Flow";
    }
    if (lower.includes("these tasks can include") || lower.includes("tasks include")) {
      return "Key Capabilities & Core AI Tasks";
    }
    if (lower === "output or result" || lower === "outputs" || lower === "output") {
      return "Generated Outputs & Practical Synthesis";
    }
    if (lower.startsWith("part 1") || lower.startsWith("part 2") || lower.startsWith("part 3")) {
      return t;
    }

    t = t.replace(/^(and|or|so|but|yet|then|also|additionally)\s+/i, "");

    if (t.length > 0 && t === t.toLowerCase()) {
      t = t
        .split(" ")
        .map((w) => (w.length > 3 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
        .join(" ");
    }
    return t.slice(0, 75) || defaultTitle || "Executive Overview";
  }

  // Helper: Enriches sparse single-bullet lists into well-balanced structured points
  function enrichSectionBullets(rawList: string[], sectionTitle: string): string[] {
    const list: string[] = [];
    for (const b of rawList) {
      const trimmed = b.trim();
      if (!trimmed) continue;

      if (trimmed.includes(",") && trimmed.length > 25 && rawList.length <= 2) {
        const parts = trimmed
          .replace(/^(examples include|such as|for example|e\.g\.|examples)?:?\s*/i, "")
          .split(/,\s*(?:or\s+|and\s+)?|\s+(?:or|and)\s+/)
          .map((p) => p.trim())
          .filter((p) => p.length > 2);

        if (parts.length >= 3) {
          list.push(
            `Primary Input Modalities: ${parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(", ")}`,
          );
          list.push(
            `Quantitative & Sensor Signals: ${parts.slice(2, 4).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(", ")}`,
          );
          if (parts.length > 4) {
            list.push(
              `Contextual Inquiries & Prompts: ${parts.slice(4).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(", ")}`,
            );
          }
          continue;
        }
      }

      if (trimmed.length > 130 && trimmed.includes(". ")) {
        const sentences = trimmed.split(/(?<=\.)\s+/).filter((s) => s.length > 10);
        list.push(...sentences);
      } else {
        list.push(trimmed);
      }
    }

    if (list.length === 1) {
      list.push(`Operational Workflow: Structured ingestion and validation pipeline for ${sectionTitle.toLowerCase()}`);
      list.push(`Architectural Impact: Ensures high-fidelity data flow and reliable downstream execution`);
    } else if (list.length === 0) {
      list.push(`Core analytical scope and strategic considerations for ${sectionTitle}`);
      list.push(`Execution framework and implementation milestones`);
    }

    return list;
  }

  // 2. Synthesize rich ParsedSection structures
  const result: ParsedSection[] = [];

  for (let idx = 0; idx < rawSections.length; idx++) {
    const raw = rawSections[idx]!;
    const title = cleanSlideTitle(raw.header);
    const rawBullets = raw.items.map((b) => b.trim()).filter(Boolean);
    const bullets = enrichSectionBullets(rawBullets, title);

    // A. Detect Metrics (Numbers, percentages, currency, units)
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
            description: textItem.slice(0, 70),
          });
        }
      }
    }

    // B. Detect Scope & Guardrails (In-Scope vs Out-of-Scope / Frontend-only)
    const isScopeOrGuardrails =
      /\b(frontend-only|front-end only|scope|boundaries|guardrails|do not build|out-of-scope|in-scope)\b/i.test(
        title + " " + bullets.join(" "),
      );

    // C. Detect Comparison (vs, versus, compared to, pros/cons)
    const isComparison =
      /\b(vs\.?|versus|compared to|on the other hand|pros and cons|difference between|advantages)\b/i.test(
        title,
      ) || bullets.some((b) => /\b(vs\.?|versus)\b/i.test(b));

    // D. Detect Process / Sequence (step 1, step 2, phase 1, phase 2)
    const isProcessOrTimeline =
      /\b(step|phase|stage|milestone|quarter|timeline|roadmap|process)\b/i.test(title) ||
      bullets.some((b) => /^(step|phase|stage|\d+[.)])/i.test(b));

    // E. Detect 3 Pillars / Key themes / Modular concepts
    const isThreePillars =
      (bullets.length === 3 && title.toLowerCase().includes("pillar")) ||
      (bullets.length >= 3 && idx % 3 === 2 && !title.toLowerCase().includes("concept"));

    // F. Detect Quotes or Standout Takeaways
    const isQuote =
      title.toLowerCase().includes("quote") ||
      title.toLowerCase().includes("takeaway") ||
      bullets.some((b) => b.startsWith('"') || b.startsWith("“"));

    // G. Detect Concept deep dive (e.g. Concept 1, Concept 2)
    const isConceptSlide =
      title.toLowerCase().includes("concept") ||
      title.toLowerCase().includes("showcase") ||
      title.toLowerCase().includes("design direction");

    const hasMetricContext =
      rawContent.toLowerCase().includes("metric") ||
      rawContent.toLowerCase().includes("indicator") ||
      rawContent.toLowerCase().includes("performance") ||
      rawContent.toLowerCase().includes("growth") ||
      rawContent.toLowerCase().includes("kpi");

    // Helper for context-aware dynamic subtitles
    const getContextualSubtitle = (t: string, b: string[]): string => {
      const lower = (t + " " + b.join(" ")).toLowerCase();
      if (lower.includes("concept")) return "Creative Direction & Aesthetic Language";
      if (lower.includes("scope") || lower.includes("guardrail")) return "Technical Boundaries & Project Scoping";
      if (lower.includes("phase") || lower.includes("showcase")) return "Multi-Directional UI/UX Architecture";
      if (lower.includes("photosynthesis") || lower.includes("biology") || lower.includes("reaction")) return "Biochemical Dynamics & Cellular Synthesis";
      if (lower.includes("architecture") || lower.includes("infrastructure")) return "System Topology & Architectural Foundations";
      if (lower.includes("design") || lower.includes("ui") || lower.includes("frontend")) return "User Experience & Visual Interface Strategy";
      if (lower.includes("metric") || lower.includes("growth") || lower.includes("kpi")) return "Key Performance Indicators & Quantitative Telemetry";
      return `${t} — Strategic Analysis & Core Dimensions`;
    };

    if (
      detectedMetrics.length >= 2 ||
      (detectedMetrics.length >= 1 && (idx === 1 || hasMetricContext || rawSections.length <= 2))
    ) {
      result.push({
        title,
        subtitle: "Key Performance Indicators & Quantitative Telemetry",
        bullets: bullets.slice(0, bulletLimit),
        metrics: detectedMetrics.slice(0, 4),
      });
    } else if (isScopeOrGuardrails && bullets.length >= 2) {
      const inScope: string[] = [];
      const outOfScope: string[] = [];
      for (const b of bullets) {
        if (/\b(do not|don't|no backend|no database|no auth|out of scope|exclude|postponed)\b/i.test(b)) {
          outOfScope.push(b.replace(/^(do not build|do not|no)\s*/i, "Out of Scope: ").trim());
        } else {
          inScope.push(b.replace(/^(important:\s*)/i, "").trim());
        }
      }
      result.push({
        title,
        subtitle: "Technical Boundaries & Architecture Guardrails",
        bullets: bullets.slice(0, bulletLimit),
        leftColumn: {
          title: "In-Scope Objectives",
          bullets: (inScope.length > 0 ? inScope : bullets.slice(0, 2)).slice(0, bulletLimit),
        },
        rightColumn: {
          title: "Phase Guardrails & Constraints",
          bullets: (outOfScope.length > 0 ? outOfScope : ["Strict Phase 1 prototype boundaries", "Zero backend or database integrations"]).slice(0, bulletLimit),
        },
      });
    } else if (isComparison && bullets.length >= 2) {
      const mid = Math.ceil(bullets.length / 2);
      result.push({
        title,
        subtitle: "Comparative Examination & Distinctions",
        bullets: bullets.slice(0, bulletLimit),
        leftColumn: {
          title: "Primary Assessment",
          bullets: bullets.slice(0, mid),
        },
        rightColumn: {
          title: "Contrasting Factors",
          bullets: bullets.slice(mid, mid * 2),
        },
      });
    } else if (isConceptSlide) {
      const vis = buildContextualVisual({
        title,
        subtitle: getContextualSubtitle(title, bullets),
        bullets,
        concept: title,
      });
      result.push({
        title,
        subtitle: getContextualSubtitle(title, bullets),
        bullets: bullets.slice(0, bulletLimit),
        visual: {
          type: "picture",
          concept: title,
          caption: `Visual direction and design topology for ${title}`,
          imageUrl: vis.imageUrl,
          svgContent: vis.svgContent,
        },
      });
    } else if (isProcessOrTimeline && bullets.length >= 3) {
      if (title.toLowerCase().includes("timeline") || title.toLowerCase().includes("roadmap")) {
        result.push({
          title,
          subtitle: "Sequential Phases & Milestones",
          bullets: bullets.slice(0, bulletLimit),
          timeline: bullets.slice(0, 4).map((b, bIdx) => ({
            phase: `Phase 0${bIdx + 1}`,
            title: b.split(/[:.-]/)[0]?.slice(0, 30) || `Milestone ${bIdx + 1}`,
            description: b.slice(0, 80),
          })),
        });
      } else {
        result.push({
          title,
          subtitle: "Operational Workflow & Execution Steps",
          bullets: bullets.slice(0, bulletLimit),
          processSteps: bullets.slice(0, 4).map((b, bIdx) => ({
            stepNumber: bIdx + 1,
            title: b.split(/[:.-]/)[0]?.slice(0, 30) || `Step ${bIdx + 1}`,
            description: b.slice(0, 80),
          })),
        });
      }
    } else if (isThreePillars) {
      result.push({
        title,
        subtitle: "Core Strategic Pillars & Fundamental Principles",
        bullets: bullets.slice(0, bulletLimit),
        cards: bullets.slice(0, 3).map((b, bIdx) => ({
          title: b.split(/[:.-]/)[0]?.slice(0, 28) || `Pillar 0${bIdx + 1}`,
          description: b.slice(0, 110),
          tag: `PILLAR 0${bIdx + 1}`,
        })),
      });
    } else if (isQuote) {
      result.push({
        title,
        subtitle: "Standout Insight & Thesis Statement",
        bullets: bullets.slice(0, bulletLimit),
        quote: {
          text: bullets[0]?.replace(/^["“]|["”]$/g, "") || title,
          author: defaultTitle,
          role: "Core Analytical Thesis",
        },
      });
    } else if (
      idx % 2 === 1 ||
      title.toLowerCase().includes("architecture") ||
      title.toLowerCase().includes("model") ||
      title.toLowerCase().includes("biology") ||
      title.toLowerCase().includes("photosynthesis")
    ) {
      const vis = buildContextualVisual({
        title,
        subtitle: getContextualSubtitle(title, bullets),
        bullets,
        concept: title,
      });
      result.push({
        title,
        subtitle: getContextualSubtitle(title, bullets),
        bullets: bullets.length > 0 ? bullets.slice(0, bulletLimit) : [`Key insights for ${title}`],
        visual: {
          type: vis.type,
          concept: title,
          diagramType: vis.type === "chart" ? "metrics-bars" : "architecture",
          caption: vis.caption,
          imageUrl: vis.imageUrl,
          svgContent: vis.svgContent,
        },
      });
    } else {
      result.push({
        title,
        subtitle: getContextualSubtitle(title, bullets),
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

  let cleanTitle = (title || "").trim();
  const detected = detectTitleFromText(rawContent);

  const isGenericPlaceholder =
    !cleanTitle ||
    cleanTitle.toLowerCase() === "untitled presentation" ||
    cleanTitle.toLowerCase() === "presentation" ||
    cleanTitle === "Strategic Operations & Knowledge Review";

  if (isGenericPlaceholder && detected) {
    cleanTitle = detected;
  }

  // Slide 1: Title / Cover
  slides.push({
    id: "slide-1",
    slideNumber: 1,
    layout: "title",
    title: cleanTitle,
    subtitle: `${purpose.toUpperCase()}  //  Synthesized with DocuMind`,
    categoryTag: purpose,
    notes: `Welcome the audience and introduce the core thesis of ${cleanTitle}.`,
  });

  const totalSlots = Math.min(20, Math.max(3, slideCount));
  const hasConclusion = totalSlots >= 4;
  const contentSlotCount = Math.max(1, totalSlots - (hasConclusion ? 3 : 2));

  // 2. Parse rawContent into structured sections
  const sections = parseContentIntoSections(rawContent, contentSlotCount, density, cleanTitle);

  // 3. Slide 2: Agenda
  const agendaTopics = sections.map((s) => s.title);
  if (hasConclusion) {
    agendaTopics.push("Conclusion & Next Steps");
  }

  slides.push({
    id: "slide-2",
    slideNumber: 2,
    layout: "agenda",
    title: "Agenda & Structural Roadmap",
    subtitle: "Core topics and analytical checkpoints covered in this deck",
    categoryTag: "AGENDA",
    bullets: agendaTopics.slice(0, 6),
    notes: `Briefly outline the presentation roadmap for ${cleanTitle}.`,
  });

  // 4. Intermediate Content Slides
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
        categoryTag: "TELEMETRY",
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
        categoryTag: "COMPARISON",
        leftColumn: s.leftColumn,
        rightColumn: s.rightColumn,
        notes: `Compare the key dimensions of ${s.title}.`,
      });
    } else if (s.cards && s.cards.length >= 2) {
      slides.push({
        id: `slide-${slideNumber}`,
        slideNumber,
        layout: "three-card",
        title: s.title,
        subtitle: s.subtitle || "Core pillars and architectural foundations",
        categoryTag: "FOUNDATIONS",
        cards: s.cards,
        notes: `Elaborate on each pillar supporting ${s.title}.`,
      });
    } else if (s.timeline && s.timeline.length >= 2) {
      slides.push({
        id: `slide-${slideNumber}`,
        slideNumber,
        layout: "timeline",
        title: s.title,
        subtitle: s.subtitle || "Chronological roadmap and target milestones",
        categoryTag: "ROADMAP",
        timeline: s.timeline,
        notes: `Walk through the chronological progression of ${s.title}.`,
      });
    } else if (s.processSteps && s.processSteps.length >= 2) {
      slides.push({
        id: `slide-${slideNumber}`,
        slideNumber,
        layout: "process",
        title: s.title,
        subtitle: s.subtitle || "Sequential execution workflow",
        categoryTag: "WORKFLOW",
        processSteps: s.processSteps,
        notes: `Explain each operational step for ${s.title}.`,
      });
    } else if (s.quote) {
      slides.push({
        id: `slide-${slideNumber}`,
        slideNumber,
        layout: "quote",
        title: s.title,
        subtitle: s.subtitle || "Core takeaway and decisive premise",
        categoryTag: "INSIGHT",
        quote: s.quote,
        notes: `Emphasize the central takeaway for ${s.title}.`,
      });
    } else if (s.visual) {
      slides.push({
        id: `slide-${slideNumber}`,
        slideNumber,
        layout: "text-visual",
        title: s.title,
        subtitle: s.subtitle || "Conceptual architecture and interaction flow",
        categoryTag: "ARCHITECTURE",
        bullets: s.bullets,
        visual: s.visual,
        notes: `Discuss the structural topology of ${s.title}.`,
      });
    } else {
      slides.push({
        id: `slide-${slideNumber}`,
        slideNumber,
        layout: "content",
        title: s.title,
        subtitle: s.subtitle || `Section 0${i + 1} — Core Analysis`,
        categoryTag: "ANALYSIS",
        bullets: s.bullets,
        notes: `Elaborate on ${s.title} with supporting context.`,
      });
    }
  }

  // 5. Conclusion Slide
  if (hasConclusion) {
    const lastSection = sections[sections.length - 1];
    const conclusionBullets =
      lastSection && lastSection.bullets.length > 0
        ? lastSection.bullets.slice(0, 4)
        : [
            `Decisive insights synthesized from ${cleanTitle}.`,
            `Key actionable recommendations and operational alignment.`,
            `Strategic roadmap and milestones for deployment.`,
            `Immediate next steps and governance checklist.`,
          ];

    slides.push({
      id: `slide-${totalSlots}`,
      slideNumber: totalSlots,
      layout: "conclusion",
      title: "Key Takeaways & Conclusion",
      subtitle: `Strategic synthesis and forward actions for ${cleanTitle}`,
      categoryTag: "CONCLUSION",
      bullets: conclusionBullets,
      notes: `Summarize the decisive conclusions and invite questions.`,
    });
  }

  return slides;
}

// In-memory fallback if sessionStorage is unavailable
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
      // Ignored
    }
  }
}

/**
 * Generates and triggers browser download of the genuine PowerPoint (.pptx) file.
 * Uses unified design tokens and strict widescreen layout.
 */
export async function generateAndDownloadClientPptx(
  session: PresentationSessionData,
): Promise<string> {
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

  const cleanFilename = `${session.title.replace(/[^a-zA-Z0-9_-]/g, "_") || "presentation"}.pptx`;
  await pptx.writeFile({ fileName: cleanFilename });
  return cleanFilename;
}
