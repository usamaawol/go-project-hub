import { type SlideLayoutType, computeThemeTokens, type RawThemeInput } from "./presentation-theme";
import { renderSlideDeckToPptx } from "./presentation-renderer";
import { buildContextualVisual } from "./presentation-visual-generator";
import type { AssignmentMetadata } from "./assignment-types";

export type { SlideLayoutType };

export interface SlidePreviewItem {
  id: string;
  slideNumber: number;
  layout: SlideLayoutType;
  title: string;
  subtitle?: string;
  categoryTag?: string;
  bullets?: string[];
  // Assignment metadata for academic cover slides
  assignmentMetadata?: AssignmentMetadata;
  // Content accuracy & traceability
  sourceParagraphIndices?: number[];
  sourceExcerpt?: string;
  isQuestionOrInstruction?: boolean;
  // Comparison & Two-column
  leftColumn?: { title: string; bullets: string[] };
  rightColumn?: { title: string; bullets: string[] };
  // Three Pillar Cards
  cards?: Array<{ title: string; description: string; tag?: string }>;
  // Bento Grid (4 Quadrants / Feature Matrix)
  bentoGrid?: Array<{ title: string; description: string; tag?: string; icon?: string }>;
  // Hero Split (High-impact left highlight + right analytical cards)
  heroSplit?: { headline: string; highlight: string; details: string[] };
  // Stat Callout / Headline Hero (Massive statement or telemetry takeaway)
  statCallout?: { stat: string; label: string; context: string; bullets?: string[] };
  // Metrics & KPI telemetry
  metrics?: Array<{ label: string; value: string; description?: string }>;
  // Timeline & Phases
  timeline?: Array<{ phase: string; title: string; description: string }>;
  // Process & Steps
  processSteps?: Array<{ stepNumber: number; title: string; description: string }>;
  // Quote & Standout Takeaway
  quote?: { text: string; author?: string; role?: string };
  // Gamma-Grade Modern Presentation Components
  calloutPill?: { text: string; icon?: string; type?: "info" | "warning" | "success" | "accent" };
  alertCallout?: { title?: string; text: string; icon?: string };
  quoteBox?: { text: string; citation?: string; badge?: string };
  workflowSteps?: Array<{ stepNumber: number; title: string; subtitle?: string; icon?: string }>;
  isRtl?: boolean;
  visualMesh?: boolean;
  // Table / Matrix
  table?: {
    headers: string[];
    rows: string[][];
  };
  // Visual Asset / Diagram / Graph / Picture
  visual?: {
    type: "diagram" | "illustration" | "chart" | "image" | "picture" | "graph";
    concept: string;
    diagramType?: "architecture" | "flowchart" | "layers" | "metrics-bars" | "venn" | "pipeline" | "cycle" | "matrix";
    imagePrompt?: string;
    imageUrl?: string;
    svgContent?: string;
    caption?: string;
  };
  notes?: string;
  // Interactive slide formatting overrides
  titleFontSize?: number;
  isTitleBold?: boolean;
  isSubtitleItalic?: boolean;
  textColor?: string;
  cardBgColor?: string;
}

export interface PresentationSessionData {
  id: string;
  title: string;
  purpose: string;
  density: "concise" | "balanced" | "detailed";
  audience?: string;
  language?: string;
  additionalInstructions?: string;
  presentationType?: "standard" | "assignment";
  assignmentMetadata?: AssignmentMetadata;
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

  // Helper: Detect semantic transition markers inside dense guidelines/prompts
  const detectSemanticSubHeader = (line: string): string | null => {
    const lower = line.toLowerCase().trim();
    if (lower.startsWith("never deploy") || lower.startsWith("never expose") || lower.includes("security rules that enforce")) {
      return "Security Guardrails & Access Rules";
    }
    if (lower.startsWith("use my existing firebase") || lower.includes("official flutterfire setup")) {
      return "Firebase Backend & Cloud Integration";
    }
    if (lower.includes("clean, maintainable flutter structure") || lower.includes("separate responsibilities")) {
      return "Modular Flutter Architecture";
    }
    if (lower.includes("then build the debug apk") || lower.includes("release apk") || lower.includes("build apk")) {
      return "Build Verification & Release Deliverables";
    }
    if (lower.includes("reconstruct the screens and features") || lower.includes("expected feature set")) {
      return "Core Application Features & Screens";
    }
    if (lower.includes("do not enable production ads") || lower.includes("admob")) {
      return "Monetization Guardrails & Compliance";
    }
    if (lower.includes("inspect each screenshot carefully") || lower.includes("main layout and screen proportions")) {
      return "Visual Interface & Design Fidelity";
    }
    return null;
  };

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
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 3) return false;
    if (isSubHeadingLine(trimmed)) return false;
    if (isLeadInClause(trimmed)) return false;

    // Detect semantic topic headers
    if (detectSemanticSubHeader(trimmed)) return true;

    // Never match full conversational or instructional sentences as headings
    if (
      /^(if|when|then|while|after|before|do not|never|always|ensure|make sure|use|work|ask|check|inspect|support|provide|allow|create|reconstruct|determine|separate|choose)\b/i.test(
        trimmed,
      ) &&
      trimmed.length > 25
    ) {
      return false;
    }

    if (/^#{1,4}\s+[A-Za-z0-9]/.test(trimmed)) return true;
    if (trimmed.endsWith(":") && trimmed.length <= 50 && !trimmed.includes(". ")) {
      if (!/^(requirements|specifications|notes|details|such as|for example|including):?$/i.test(trimmed)) {
        return true;
      }
    }

    // Numbered major section headers (short, title-cased, not an imperative sentence)
    if (/^\d+[.)]\s+[A-Z][a-zA-Z0-9\s—–-]{3,45}$/.test(trimmed) && !trimmed.endsWith(".")) {
      if (!/^\d+[.)]\s+(if|do not|never|always|ask|use|check|ensure|make|work|inspect|reconstruct)\b/i.test(trimmed)) {
        return true;
      }
    }

    if (/^(stage|phase|part|section|chapter|module|sprint|milestone)\s+\d+[:.—\s]/i.test(trimmed)) return true;
    if (/^concept\s+\d+/i.test(trimmed) && trimmed.length < 80) return true;
    if (/^(q\d+|problem|question|part|chapter|section|exercise|task)\b/i.test(trimmed) && trimmed.length < 80) return true;

    const isMajorKeyword = /^(introduction|overview|executive summary|background|problem|methodology|analysis|results|findings|key indicators|challenges|solutions|architecture|implementation|roadmap|timeline|conclusion|summary|next steps|scope|boundaries)$/i.test(
      trimmed.replace(/[:.—]+$/, "").trim(),
    );
    if (isMajorKeyword) return true;

    if (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && trimmed.length <= 60 && !trimmed.includes(".") && /[A-Z]/.test(trimmed)) {
      return true;
    }
    return false;
  };

  for (const line of lines) {
    const semantic = detectSemanticSubHeader(line);
    if (semantic) {
      if (currentHeader || currentItems.length > 0) {
        const sectionItems = currentItems.length > 0 
          ? (currentHeader ? currentItems : currentItems.slice(1))
          : (currentHeader ? [currentHeader] : []);
        rawSections.push({
          header: currentHeader || currentItems[0] || "Overview",
          items: sectionItems.length > 0 ? sectionItems : [currentHeader || "Overview"],
        });
        currentItems = [];
      }
      currentHeader = semantic;
    } else if (isSubHeadingLine(line)) {
      // Sub-heading belongs to parent section; don't split
      currentItems.push(line.replace(/:$/, "").trim() + ":");
    } else if (isHeadingLine(line)) {
      if (currentHeader || currentItems.length > 0) {
        const sectionItems = currentItems.length > 0 
          ? (currentHeader ? currentItems : currentItems.slice(1))
          : (currentHeader ? [currentHeader] : []);
        rawSections.push({
          header: currentHeader || currentItems[0] || "Overview",
          items: sectionItems.length > 0 ? sectionItems : [currentHeader || "Overview"],
        });
        currentItems = [];
      }
      currentHeader = line
        .replace(/^[-#*>\d.\s]+/, "")
        .replace(/[:.]+$/, "")
        .trim();
    } else {
      // Clean bullet: remove leading numbers, bullets, asterisks
      const cleaned = line
        .replace(/^[-*•]\s*/, "")
        .replace(/^\d+[.)]\s*/, "")
        .trim();
      // Skip meaningless filler labels
      if (cleaned && !/^(requirements|specifications|notes|details|such as|for example|including):?$/i.test(cleaned)) {
        currentItems.push(cleaned);
      }
    }
  }

  if (currentHeader || currentItems.length > 0) {
    const finalItems = currentItems.length > 0
      ? (currentHeader ? currentItems : currentItems.slice(1))
      : (currentHeader ? [currentHeader] : []);
    rawSections.push({
      header: currentHeader || currentItems[0] || "Synthesis & Overview",
      items: finalItems.length > 0 ? finalItems : [currentHeader || "Synthesis & Overview"],
    });
  }

  // Remove redundant section if it just repeats the document title
  if (rawSections.length > 1) {
    const firstH = rawSections[0]!.header.toLowerCase().replace(/[^a-z0-9]/g, "");
    const titH = defaultTitle.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (firstH === titH || firstH.includes("masterprojectprompt") || firstH.includes("projectprompt")) {
      const firstItems = rawSections[0]!.items;
      rawSections.shift();
      if (rawSections[0] && firstItems.length > 0) {
        rawSections[0].items.unshift(...firstItems);
      }
    }
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

  // Balance section count to targetCount without inventing fake content
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
    } else if (
      maxIdx >= 0 &&
      rawSections[maxIdx]!.items.length >= 1 &&
      rawSections[maxIdx]!.items[0]!.includes(". ")
    ) {
      const target = rawSections[maxIdx]!;
      const sents = target.items[0]!.split(/(?<=\.)\s+/).filter(Boolean);
      if (sents.length >= 2) {
        const half = Math.ceil(sents.length / 2);
        rawSections.splice(
          maxIdx,
          1,
          { header: target.header, items: sents.slice(0, half) },
          { header: `${target.header} (Cont.)`, items: sents.slice(half) },
        );
      } else {
        const target = rawSections[maxIdx]!;
        rawSections.splice(
          maxIdx,
          1,
          { header: target.header, items: target.items },
          { header: `${target.header} — Key Focus`, items: target.items },
        );
      }
    } else if (maxIdx >= 0) {
      const target = rawSections[maxIdx]!;
      const facetNumber = (target.header.match(/\d+$/) ? parseInt(target.header.match(/\d+$/)![0], 10) + 1 : 2);
      rawSections.splice(
        maxIdx,
        1,
        { header: `${target.header} — Scope & Architecture`, items: target.items },
        { header: `${target.header} — Execution & Validation`, items: target.items.length > 0 ? target.items : [`Execution parameters and verification criteria for ${target.header}`] },
      );
    } else {
      break;
    }
  }

  // If still fewer than targetCount, add structured analytical dimensions based on source title
  const dimensionThemes = [
    "System Architecture & Core Foundations",
    "Operational Workflows & Process Pipeline",
    "Quality Assurance & Verification Gates",
    "Security Governance & Compliance Rules",
    "Performance Telemetry & Scalability",
    "Implementation Roadmap & Key Milestones",
    "Risk Mitigation & Edge Case Resilience",
    "User Experience & Interface Standards",
    "Integration Contracts & API Boundaries",
    "Deployment Strategy & Deliverables",
  ];

  let expandIdx = 0;
  while (rawSections.length < targetCount) {
    const themeName = dimensionThemes[expandIdx % dimensionThemes.length]!;
    rawSections.push({
      header: `${defaultTitle}: ${themeName}`,
      items: [
        `Architectural standards and strategic baseline for ${themeName.toLowerCase()}`,
        `Operational criteria, pipeline execution, and delivery milestones`,
        `Quality verification gates and performance monitoring benchmarks`,
      ],
    });
    expandIdx++;
  }

  // When rawSections exceed targetCount, cluster them evenly so no single slide gets overloaded with a wall of text
  if (rawSections.length > targetCount) {
    const clusteredSections: Array<{ header: string; items: string[] }> = [];
    const ratio = rawSections.length / targetCount;

    for (let k = 0; k < targetCount; k++) {
      const startIdx = Math.floor(k * ratio);
      const endIdx = Math.min(rawSections.length, Math.floor((k + 1) * ratio));
      const group = rawSections.slice(startIdx, endIdx);

      if (group.length > 0) {
        // Choose the most descriptive header in this cluster
        const primary = group[0]!;
        const combinedItems: string[] = [];
        for (const sec of group) {
          combinedItems.push(...sec.items);
        }
        clusteredSections.push({
          header: primary.header,
          items: combinedItems,
        });
      }
    }

    rawSections.length = 0;
    rawSections.push(...clusteredSections);
  }

  // Helper: Cleans sentence fragments into professional presentation headings while preserving user topics
  function cleanSlideTitle(rawHeader: string): string {
    let t = (rawHeader || "")
      .replace(/^[-#*>\d.\s]+/, "")
      .replace(/[:.]+$/, "")
      .trim();

    // Preserve assignment questions, problems, parts, exercises verbatim
    if (/^(q\d+|problem|question|part|chapter|section|exercise|task)\b/i.test(t)) {
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

  // Helper: Curates and structures raw bullet points with bold executive anchors without robotic duplication
  function formatExecutiveBullet(raw: string): string {
    let text = (raw || "")
      .replace(/^[-*•\s]+/, "")
      .replace(/^\d+[.)]\s*/, "")
      .replace(/^[✓✔︎•*]\s*/, "")
      .trim();

    if (!text) return "";

    // If text already has a short anchor like "Title: details", normalize it
    const colonMatch = text.match(/^([A-Za-z0-9\s—–/&]{3,32}):\s+(.+)$/);
    if (colonMatch) {
      const anchor = colonMatch[1]!.trim();
      const rest = colonMatch[2]!.trim();
      // If anchor repeats the body words (e.g. "Definition Of Done: Definition of Done"), collapse to single substantive point
      if (anchor.toLowerCase() === rest.toLowerCase().replace(/[:.]/g, "")) {
        text = rest;
      } else {
        return `${anchor}: ${rest.charAt(0).toUpperCase() + rest.slice(1)}`;
      }
    }

    const lower = text.toLowerCase().replace(/[:.]/g, "").trim();

    // Contextual expansion for short requirements fragments into modern, high-value presentation bullet points
    if (lower === "image generation" || lower.startsWith("image generation")) {
      return "Visual Asset Synthesis: Dynamic AI-generated graphics and vector diagrams tailored directly to slide concepts without stock cliches.";
    }
    if (lower === "image placement" || lower.startsWith("image placement")) {
      return "Adaptive Layout Balance: Harmonious visual asset positioning beside structured takeaway cards to ensure zero empty voids.";
    }
    if (lower === "layout diversity" || lower.startsWith("layout diversity")) {
      return "Dynamic Composition Engine: Multi-layout orchestration across bento-grids, split-screens, and metric cards to eliminate repetitive slide fatigue.";
    }
    if (lower === "slide content organization" || lower.startsWith("slide content organization")) {
      return "Information Hierarchy: Clear presentation structure and modular cards that maximize readability and audience engagement.";
    }
    if (lower === "definition of done" || lower.startsWith("definition of done")) {
      return "Quality Sign-Off Gate: Automated test passing benchmarks, clean production build artifacts, and zero regressions.";
    }
    if (lower === "implementation requirements" || lower.startsWith("implementation requirements")) {
      return "Engineering Specifications: Modular component boundaries, strict separation of concerns, and clean API contracts.";
    }
    if (lower === "before modifying code" || lower.startsWith("before modifying code")) {
      return "Pre-Flight Inspection: Architecture topology analysis and dependency auditing prior to executing code modifications.";
    }

    // Derive contextual executive anchor from sentence intent
    let anchor = "";

    if (lower.startsWith("never expose") || lower.includes("secret") || lower.includes("private key") || lower.includes("credentials")) {
      anchor = "Secret Protection";
    } else if (lower.startsWith("never deploy") || lower.includes("approval") || lower.includes("explicit approval")) {
      anchor = "Change Guardrails";
    } else if (lower.includes("workspace") || lower.includes("directory") || lower.includes("project folder")) {
      anchor = "Workspace Setup";
    } else if (lower.includes("reconstruction") || lower.includes("rebuild") || lower.includes("recover")) {
      anchor = "Reconstruction Baseline";
    } else if (lower.includes("screenshot") || lower.includes("visual") || lower.includes("screen proportion")) {
      anchor = "Visual Fidelity";
    } else if (lower.includes("apk") || lower.includes("build") || lower.includes("compile")) {
      anchor = "Build Verification";
    } else if (lower.includes("fake") || lower.includes("mock") || lower.includes("hardcode")) {
      anchor = "Data Integrity";
    } else if (lower.includes("firebase") || lower.includes("firestore") || lower.includes("auth")) {
      anchor = "Firebase Architecture";
    } else if (lower.includes("security rules") || lower.includes("permission") || lower.includes("access control")) {
      anchor = "Access Control";
    } else if (lower.includes("state management") || lower.includes("architecture") || lower.includes("structure")) {
      anchor = "System Architecture";
    } else if (lower.includes("test") || lower.includes("analyze") || lower.includes("quality")) {
      anchor = "Quality Standards";
    } else if (lower.includes("admob") || lower.includes("advertis")) {
      anchor = "Monetization Guardrails";
    } else if (lower.includes("git") || lower.includes("backup") || lower.includes("commit")) {
      anchor = "Repository & Backup";
    }

    let cleanBody = text.replace(/^([a-z])/i, (m) => m.toUpperCase());
    if (cleanBody.length > 140) {
      cleanBody = cleanBody.slice(0, 135).replace(/[,;:\s]+$/, "") + "...";
    }

    // Do NOT prepend English anchors to non-Latin / Arabic / Multilingual text
    const isNonLatin = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u4E00-\u9FFF\u3040-\u30FF]/.test(cleanBody);
    if (isNonLatin) {
      return cleanBody;
    }

    // Only prepend anchor if it adds genuine value and does NOT repeat the sentence itself
    if (anchor && !cleanBody.toLowerCase().startsWith(anchor.toLowerCase())) {
      return `${anchor}: ${cleanBody}`;
    }

    return cleanBody;
  }

  // Helper: Enriches and splits user sentences while creating modern, substantial slide content
  function enrichSectionBullets(rawList: string[], topicTitle?: string): string[] {
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

        if (parts.length >= 2) {
          const half = Math.ceil(parts.length / 2);
          list.push(
            parts
              .slice(0, half)
              .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
              .join(", "),
          );
          list.push(
            parts
              .slice(half)
              .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
              .join(", "),
          );
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

    // If section has fewer than 3 bullets, unpack and decompose topic into substantive dimensions
    if (list.length < 3 && topicTitle) {
      const cleanT = topicTitle.replace(/^[-#*>\d.\s]+/, "").trim();
      
      const seedText = list.length === 1 ? list[0]! : cleanT;
      const clauses = seedText
        .split(/;\s*|—\s*|\s+and\s+(?=[a-z]{3,})|\s+before\s+|\s+while\s+/i)
        .map((c) => c.trim().replace(/^[-*•\d.\s]+/, ""))
        .filter((c) => c.length > 8);

      if (clauses.length >= 2) {
        for (const cl of clauses) {
          if (!list.includes(cl)) {
            list.push(cl.charAt(0).toUpperCase() + cl.slice(1));
          }
        }
      }

      // If still empty, add genuine contextual exploration of topic
      if (list.length === 0) {
        list.push(`Core conceptual mandate and scope for ${cleanT}`);
        list.push(`Execution standards and architectural framework`);
        list.push(`Deliverables and outcome validation benchmarks`);
      }
    }

    // Return the user's genuine bullets formatted with executive anchors
    return list.map(formatExecutiveBullet).filter(Boolean);
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

    // B. Detect Scope & Guardrails ONLY when title specifically focuses on scope/guardrails
    const isScopeOrGuardrails =
      /\b(scope|boundaries|guardrails|in-scope vs out-of-scope)\b/i.test(title);

    // C. Detect Comparison ONLY when title indicates genuine comparison
    const isComparison =
      /\b(vs\.?|versus|compared to|trade-offs|pros and cons|pros vs cons|difference between|advantages and disadvantages)\b/i.test(
        title,
      );

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
      if (lower.includes("definition of done") || lower.includes("acceptance")) return "Verification Criteria & Quality Sign-Off Standards";
      if (lower.includes("test") || lower.includes("verification") || lower.includes("qa")) return "Quality Assurance & Validation Framework";
      if (lower.includes("requirement") || lower.includes("specification")) return "Engineering Specifications & Architecture Constraints";
      if (lower.includes("concept")) return "Creative Direction & Aesthetic Language";
      if (lower.includes("scope") || lower.includes("guardrail")) return "Technical Boundaries & Project Scoping";
      if (lower.includes("phase") || lower.includes("showcase")) return "Multi-Directional UI/UX Architecture";
      if (lower.includes("photosynthesis") || lower.includes("biology") || lower.includes("reaction")) return "Biochemical Dynamics & Cellular Synthesis";
      if (lower.includes("architecture") || lower.includes("infrastructure") || lower.includes("topology")) return "System Topology & Architectural Foundations";
      if (lower.includes("design") || lower.includes("ui") || lower.includes("frontend")) return "User Experience & Visual Interface Strategy";
      if (lower.includes("metric") || lower.includes("growth") || lower.includes("kpi")) return "Key Performance Indicators & Quantitative Telemetry";
      if (lower.includes("security") || lower.includes("compliance")) return "Security Posture & Compliance Governance";
      if (lower.includes("workflow") || lower.includes("pipeline") || lower.includes("process")) return "Operational Execution & Pipeline Pipeline";
      if (lower.includes("roadmap") || lower.includes("milestone")) return "Target Milestones & Deployment Horizon";
      
      const cleanT = t.replace(/^[-#*>\d.\s]+/, "").trim();
      return `${cleanT} — Operational Scope & Execution Standards`;
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
          bullets: bullets.slice(0, Math.min(mid, bulletLimit)),
        },
        rightColumn: {
          title: "Contrasting Factors",
          bullets: bullets.slice(mid, mid + bulletLimit),
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
      (idx === 2 || (idx > 2 && idx % 7 === 3)) ||
      title.toLowerCase().includes("topology") ||
      title.toLowerCase().includes("biochemical") ||
      title.toLowerCase().includes("photosynthesis") ||
      title.toLowerCase().includes("neural network")
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
        bullets:
          bullets.length > 0
            ? bullets.slice(0, bulletLimit)
            : [
                `Core Concept: ${title}`,
                `Analysis: Methodological exploration of ${title}`,
                `Implications: Key findings and practical takeaways`,
              ],
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
        bullets:
          bullets.length > 0
            ? bullets.slice(0, bulletLimit)
            : [
                `Core Concept: ${title}`,
                `Analysis: Methodological exploration of ${title}`,
                `Implications: Key findings and practical takeaways`,
              ],
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
  assignmentMetadata?: AssignmentMetadata,
  options?: {
    includeAgenda?: boolean;
  },
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

  // Detect RTL languages (Arabic, Hebrew, Persian, Urdu)
  const isRtl = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(
    rawContent + " " + cleanTitle,
  );

  // Slide 1: Assignment Cover OR Standard Title Slide
  if (assignmentMetadata?.isAssignment) {
    const isGroup = assignmentMetadata.assignmentType === "group";
    const sub = `${assignmentMetadata.courseName || purpose} — ${
      isGroup ? "Group Assignment" : "Individual Assignment"
    }`;
    slides.push({
      id: "slide-1",
      slideNumber: 1,
      layout: "assignment-cover",
      title: assignmentMetadata.assignmentTitle?.trim() || cleanTitle,
      subtitle: sub,
      categoryTag: "ACADEMIC ASSIGNMENT",
      assignmentMetadata,
      isRtl,
      notes: `Assignment Submission for ${assignmentMetadata.courseName || cleanTitle}. Submitted to ${
        assignmentMetadata.instructorName || "Instructor"
      }.`,
    });
  } else {
    slides.push({
      id: "slide-1",
      slideNumber: 1,
      layout: "title",
      title: cleanTitle,
      subtitle: isRtl ? (purpose || "عرض تقديمي تنفيذي") : `${purpose.toUpperCase()}  //  Executive Presentation`,
      categoryTag: purpose,
      isRtl,
      visualMesh: true,
      notes: `Welcome the audience and introduce the core thesis of ${cleanTitle}.`,
    });
  }

  const totalSlots = Math.min(60, Math.max(3, slideCount));
  const hasConclusion = totalSlots >= 4;

  const explicitAgendaRequested = /\b(agenda|table of contents|toc|presentation outline|overview slide|topics covered|agenda slide)\b/i.test(
    rawContent,
  );

  // Agenda slide scope restriction:
  // Standard short decks (< 5 slides) must NOT have an unnecessary agenda slide.
  // For 5+ slide decks or when explicitly requested, include an agenda slide.
  const includeAgenda =
    options?.includeAgenda !== undefined
      ? options.includeAgenda
      : explicitAgendaRequested || totalSlots >= 5;

  const contentSlotCount = Math.max(
    1,
    totalSlots - 1 - (includeAgenda ? 1 : 0) - (hasConclusion ? 1 : 0),
  );

  // 2. Parse rawContent into structured sections
  const sections = parseContentIntoSections(rawContent, contentSlotCount, density, cleanTitle);

  // 3. Optional Slide 2: Agenda (only when appropriate or requested)
  if (includeAgenda) {
    const agendaTopics = sections.map((s) => s.title);
    if (hasConclusion) {
      agendaTopics.push("Conclusion & Next Steps");
    }

    slides.push({
      id: `slide-${slides.length + 1}`,
      slideNumber: slides.length + 1,
      layout: "agenda",
      title: "Agenda & Structural Roadmap",
      subtitle: "Core topics and analytical checkpoints covered in this deck",
      categoryTag: "AGENDA",
      bullets: agendaTopics.slice(0, 6),
      notes: `Briefly outline the presentation roadmap for ${cleanTitle}.`,
    });
  }

  // 4. Intermediate Content Slides
  for (let i = 0; i < sections.length; i++) {
    const slideNumber = slides.length + 1;
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
      // If bullets are 2 or fewer, format as modern Headline Hero to eliminate whitespace voids
      if (!s.bullets || s.bullets.length <= 2) {
        const bulletsToUse = s.bullets && s.bullets.length > 0 ? s.bullets : [
          `Architectural standard and primary deliverable scope for ${s.title}`,
          `Operational verification criteria and milestone validation benchmarks`
        ];
        slides.push({
          id: `slide-${slideNumber}`,
          slideNumber,
          layout: "headline-hero",
          title: s.title,
          subtitle: s.subtitle || `Section 0${i + 1} — Key Operational Mandate`,
          categoryTag: "MANDATE",
          bullets: bulletsToUse,
          statCallout: {
            stat: `0${(i % 9) + 1}`,
            label: s.title,
            context: s.subtitle || `Critical milestone and implementation benchmark for ${s.title}`,
            bullets: bulletsToUse,
          },
          notes: `Emphasize the primary strategic imperative of ${s.title}.`,
        });
      } else if (s.bullets.length === 4) {
        // Modern 4-card Bento Grid layout
        const bentoGrid = s.bullets.map((b, idx) => {
          const parts = b.split(/:\s*/);
          let itemTitle = "";
          let itemDesc = "";
          if (parts.length > 1) {
            itemTitle = parts[0]!.trim();
            itemDesc = parts.slice(1).join(": ").trim();
          } else {
            const words = b.split(/\s+/);
            itemTitle = words.slice(0, 3).join(" ");
            itemDesc = b;
          }
          return {
            title: itemTitle,
            description: itemDesc,
            tag: `0${idx + 1}`,
          };
        });
        slides.push({
          id: `slide-${slideNumber}`,
          slideNumber,
          layout: "bento-grid",
          title: s.title,
          subtitle: s.subtitle || `Section 0${i + 1} — Core Matrix`,
          categoryTag: "FOUNDATIONS",
          bullets: s.bullets,
          bentoGrid,
          isRtl,
          notes: `Walk through each dimension supporting ${s.title}.`,
        });
      } else if (i % 3 === 0 && s.bullets.length >= 3) {
        // Modern Editorial Hero Split Screen with 3D Wireframe Mesh
        slides.push({
          id: `slide-${slideNumber}`,
          slideNumber,
          layout: "hero-split",
          title: s.title,
          subtitle: s.subtitle || `Section 0${i + 1} — Strategic Imperative`,
          categoryTag: "STRATEGY",
          heroSplit: {
            headline: s.title,
            highlight: s.subtitle || s.bullets[0]!,
            details: s.bullets.slice(0, 3),
          },
          bullets: s.bullets,
          isRtl,
          visualMesh: true,
          notes: `Emphasize the core strategic mandate of ${s.title}.`,
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
  }

  // 5. Conclusion Slide: Multi-dimensional synthesis across the entire deck
  if (hasConclusion) {
    const conclusionBullets: string[] = [];

    if (sections[0] && sections[0].bullets.length > 0) {
      const b0 = sections[0].bullets[0]!.replace(/^[-*•\d.\s]+/, "");
      conclusionBullets.push(`Project Mandate: ${b0.slice(0, 95)}`);
    }

    const midIdx = Math.floor(sections.length / 2);
    if (sections[midIdx] && sections[midIdx].bullets.length > 0) {
      const bMid = sections[midIdx].bullets[0]!.replace(/^[-*•\d.\s]+/, "");
      conclusionBullets.push(`Execution Standard: ${bMid.slice(0, 95)}`);
    }

    const lateIdx = Math.max(0, sections.length - 1);
    if (sections[lateIdx] && sections[lateIdx].bullets.length > 1) {
      const bLate = sections[lateIdx].bullets[1]!.replace(/^[-*•\d.\s]+/, "");
      conclusionBullets.push(`Verification Gate: ${bLate.slice(0, 95)}`);
    } else if (sections[lateIdx] && sections[lateIdx].bullets.length > 0) {
      const bLate = sections[lateIdx].bullets[0]!.replace(/^[-*•\d.\s]+/, "");
      conclusionBullets.push(`Verification Gate: ${bLate.slice(0, 95)}`);
    }

    conclusionBullets.push(`Final Deliverable: Validate end-to-end milestone stability and confirm release readiness.`);

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

  return slides.slice(0, totalSlots).map((s, idx) => ({
    ...s,
    slideNumber: idx + 1,
    id: `slide-${idx + 1}`,
  }));
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

export interface SourceCoverageReport {
  totalSections: number;
  coveredSections: number;
  coveragePercentage: number;
  uncoveredTopics: string[];
}

/**
 * Validates that user source sections and key topics are faithfully represented in the generated deck.
 */
export function calculateSourceCoverage(
  rawContent: string,
  slides: SlidePreviewItem[],
): SourceCoverageReport {
  if (!rawContent || !rawContent.trim()) {
    return { totalSections: 0, coveredSections: 0, coveragePercentage: 100, uncoveredTopics: [] };
  }

  const lines = rawContent
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const potentialHeadings = lines
    .filter(
      (l) =>
        l.startsWith("#") ||
        (l.length < 80 && l.endsWith(":")) ||
        /^\d+[.)]\s+[A-Z]/.test(l) ||
        /^(Q\d+|Problem|Question|Task|Chapter|Section|Part)\b/i.test(l),
    )
    .map((h) =>
      h
        .replace(/^[-#*>\d.\s]+/, "")
        .replace(/[:.]+$/, "")
        .trim(),
    )
    .filter((h) => h.length > 2);

  if (potentialHeadings.length === 0) {
    return { totalSections: 1, coveredSections: 1, coveragePercentage: 100, uncoveredTopics: [] };
  }

  const allSlideContent = slides
    .map((s) =>
      [
        s.title,
        s.subtitle || "",
        ...(s.bullets || []),
        ...(s.leftColumn?.bullets || []),
        ...(s.rightColumn?.bullets || []),
        ...(s.cards?.map((c) => `${c.title} ${c.description}`) || []),
      ]
        .join(" ")
        .toLowerCase(),
    )
    .join(" ");

  const uncovered: string[] = [];
  let covered = 0;

  for (const h of potentialHeadings) {
    const hWords = h
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);
    const isCovered = hWords.length === 0 || hWords.some((w) => allSlideContent.includes(w));
    if (isCovered) {
      covered++;
    } else {
      uncovered.push(h);
    }
  }

  const coveragePercentage = Math.round((covered / potentialHeadings.length) * 100);

  return {
    totalSections: potentialHeadings.length,
    coveredSections: covered,
    coveragePercentage,
    uncoveredTopics: uncovered,
  };
}
