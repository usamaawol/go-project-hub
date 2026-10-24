import { useState, useRef, useEffect } from "react";
import {
  FileText,
  Upload,
  Type,
  AlignLeft,
  BookOpen,
  Download,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  Info,
  Sliders,
  ChevronRight,
  ChevronLeft,
  Hash,
  ListOrdered,
  FileSpreadsheet,
  Printer,
  Copy,
  RefreshCw,
  Eye,
  FileCheck,
  Palette,
  Video,
  Volume2,
  Clock,
  ShieldCheck,
  Film,
  Layers,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { extractDocumentText } from "@/lib/api-client";


export interface FormattingConfig {
  // Document Layout Archetype
  layoutArchetype: "executive" | "tech-spec" | "academic" | "creative";

  // Cover Page
  hasCoverPage: boolean;
  coverStyle: "academic" | "modern" | "corporate" | "minimal";
  docTitle: string;
  docSubtitle: string;
  authorName: string;
  institution: string;
  dateStr: string;

  // Typography
  fontFamily: "serif" | "sans" | "mono";
  baseFontSize: "10pt" | "11pt" | "12pt";
  lineSpacing: "1.0" | "1.15" | "1.5" | "2.0";
  paragraphSpacing: "compact" | "normal" | "relaxed";

  // Headings Hierarchy
  headingNumbering: "decimal" | "roman" | "none"; // 1.0, 1.1 or I., II. or none
  headingCase: "title" | "sentence" | "upper";
  headingDivider: boolean;

  // Margins
  margins: "normal" | "narrow" | "academic" | "wide"; // 1 in, 0.5 in, 1.25 in gutter, 1.5 in

  // Headers & Footers
  headerText: string;
  headerAlign: "left" | "right" | "split";
  headerRule: boolean;

  // Page Numbering
  pageNumberPosition: "bottom-center" | "bottom-right" | "top-right";
  pageNumberFormat: "page-x-of-y" | "number-only" | "roman-prelim";
  firstPageUnnumbered: boolean;

  // Table of Contents
  includeToc: boolean;
  tocLevels: 2 | 3;
  tocDotLeaders: boolean;
}

export const sampleVideoBriefText = `DocuMind Promotional Video — Production Specification (Part 2)
Executive Brief, Continuity Guardrails, and Scene Storyboard

1.0 Introduction & Context
Create Part 2 of the DocuMind promotional video. Duration: exactly 30 seconds.
Target Audience: Enterprise research leads, academic institutions, and knowledge workers.

2.0 CRITICAL CONTINUITY REQUIREMENT
Continue directly from the final frame of Part 1 (DocuMind logo resolves with the tagline: "Research, accelerated. Mind, amplified.")
Maintain the identical color palette: Deep navy (#0A1128), electric cyan (#00E5FF), warm gold accent (#FFB703), clean off-white (#F8F9FA).
Deliverable Format: 4K UHD 60fps MP4 master with uncompressed stereo audio mix.

3.0 SCENE 1 — 0–10 SECONDS: THE FRICTION (THE OLD WAY)
Visual: Split-screen montage showing typical workflow frustration — cluttered desktop folders, corrupted citations, inconsistent PowerPoint margins, and manual document reformatting.
Audio / Voiceover: "Knowledge teams spend 68% of their time formatting documents instead of uncovering insights."
On-Screen Metric: 68% time wasted on formatting.

4.0 SCENE 2 — 10–20 SECONDS: THE BREAKTHROUGH (DOCUMIND ENGINE)
Visual: Rapid fluid transition into DocuMind interface. A raw unformatted research brief drops into the workspace; instant semantic parsing applies typography, citations, and executive visual themes in milliseconds.
Audio / Voiceover: "DocuMind unifies semantic document intelligence and executive presentation design into a single keystroke."

5.0 SCENE 3 — 20–30 SECONDS: RESOLUTION & CALL TO ACTION
Visual: Final camera pull-back showcasing publication-ready documents and stunning PowerPoint slides side-by-side.
Audio / Voiceover: "Research, accelerated. Mind, amplified. Get started today."`;

export const sampleTechSpecText = `Distributed Semantic Document Ingestion Architecture
RFC 409: High-Throughput Reflow and Typographic Normalization Protocol

1.0 Abstract & Architectural Scope
This specification defines the dual-stage processing architecture for DocuMind Document Studio, ensuring zero typographic divergence across arbitrary document inputs.

2.0 CRITICAL COMPLIANCE REQUIREMENTS
All parser implementations must maintain deterministic AST node ordering.
Memory footprint must not exceed 50MB per concurrent extraction pipeline.
Supported payload codecs: PDF/A-1b, OpenXML Strict, UTF-8 reflowable text.

3.0 Core Pipeline Stages
3.1 Token Boundary Recognition
Input byte streams are mapped to visual coordinates, detecting headings and section demarcations.
3.2 Design Token Normalization
Hexadecimal brand tokens (#0A1128, #00E5FF) are validated against contrast ratio WCAG 2.1 AAA.

4.0 Performance Benchmarks
P99 extraction latency: 120ms for 50-page manuscripts.
Memory efficiency: 94% reduction compared to unoptimized canvas renderers.`;

export const sampleDocumentText = `The Role of Generative Computation in Modern Document Workflows
A Comprehensive Analysis of Semantic Parsing and Automated Formatting

1. Executive Summary
Modern enterprise operations generate billions of digital documents weekly, ranging from brief memoranda to comprehensive technical specifications. However, an estimated 68% of knowledge worker time spent in document production is consumed not by ideation or analytical synthesis, but rather by repetitive typographic adjustments, margin correction, and formatting reconciliation.

2. Background and Problem Statement
The proliferation of competing digital formats—principally Portable Document Format (PDF) and Office Open XML (DOCX)—has produced an acute divergence in workflow mechanics:
- DOCX provides dynamic reflowability and native structural hierarchy, yet exhibits formatting instability across differing renderer engines.
- PDF delivers precise visual reproduction across platforms, but fundamentally treats textual content as unanchored absolute coordinate glyphs, impeding programmatic reflow.

3. Methodological Framework
To bridge this divergence, DocuMind employs a dual-stage heuristic pipeline:
3.1 Semantic Boundary Identification
Input documents are scanned using AST tokenization to identify syntactic breaks, header candidates, and numbered bullet sequences.
3.2 Typographic Hierarchy Normalization
Heading levels are deterministically mapped to predefined typographic scales (H1 at 1.75x base, H2 at 1.4x base, H3 at 1.15x base) enforcing uniform vertical rhythm.

4. Results and Operational Efficiency
Implementation benchmarks across 12,000 academic and enterprise documents indicate an 84% reduction in manual formatting time when automated styling rules are applied upfront.

5. Recommendations and Conclusion
Organizations should mandate standardized typographic blueprints for all external technical submissions to ensure cross-platform accessibility and archival longevity.`;

export interface DocColor {
  name: string;
  hex: string;
}

export interface DocSceneMeta {
  sceneNumber: string;
  timestamp: string;
  title: string;
  visual?: string;
  audio?: string;
  textOverlay?: string;
}

export interface DocBlock {
  type: "paragraph" | "lead" | "callout" | "parameter" | "palette" | "scene" | "list";
  content: string;
  calloutType?: "critical" | "warning" | "note" | "requirement";
  calloutTitle?: string;
  key?: string;
  value?: string;
  listItems?: string[];
  colors?: DocColor[];
  sceneMeta?: DocSceneMeta;
}

export interface DocSection {
  level: 1 | 2 | 3;
  numberStr: string;
  title: string;
  paragraphs: string[];
  blocks: DocBlock[];
}

export function renderRichInline(text: string) {
  if (!text) return null;
  // Splits by markdown bold (**...**), inline code (`...`), or italic (*...*)
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="font-mono text-xs px-1.5 py-0.5 rounded bg-stone-200/70 dark:bg-zinc-800 text-primary font-semibold"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={i} className="italic text-foreground/90">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}

export function deriveDocumentMetadata(text: string): {
  docTitle: string;
  docSubtitle: string;
  authorName?: string;
  institution?: string;
  dateStr?: string;
  recommendedArchetype?: "executive" | "tech-spec" | "academic" | "creative";
} {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const defaultMonthYear = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  if (lines.length === 0) {
    return {
      docTitle: "Executive Document",
      docSubtitle: "Executive Analysis and Implementation Report",
      authorName: "Author / Researcher",
      institution: "Academic / Professional Department",
      dateStr: defaultMonthYear,
      recommendedArchetype: "executive",
    };
  }

  // Scan lines for explicit key-value metadata
  let foundAuthor = "";
  let foundInstitution = "";
  let foundDate = "";
  let foundSubtitle = "";
  let foundTitle = "";

  for (const l of lines) {
    const authorM = l.match(/^(?:Author|Researcher|Prepared By|By)\s*[:]\s*(.*)$/i);
    if (authorM && authorM[1]) foundAuthor = authorM[1].trim();

    const instM = l.match(/^(?:Institution|Department|Organization|University|Affiliation)\s*[:]\s*(.*)$/i);
    if (instM && instM[1]) foundInstitution = instM[1].trim();

    const dateM = l.match(/^(?:Date|Published|Submission Date)\s*[:]\s*(.*)$/i);
    if (dateM && dateM[1]) foundDate = dateM[1].trim();

    const subM = l.match(/^(?:Subtitle|Series Subtitle)\s*[:]\s*(.*)$/i);
    if (subM && subM[1]) foundSubtitle = subM[1].trim();

    const titleM = l.match(/^(?:Title|Document Title)\s*[:]\s*(.*)$/i);
    if (titleM && titleM[1]) foundTitle = titleM[1].trim();
  }

  const lower = text.toLowerCase();
  const isVideo =
    lower.includes("promotional video") ||
    lower.includes("scene 1") ||
    lower.includes("storyboard");
  const isSpec =
    lower.includes("rfc") ||
    lower.includes("specification") ||
    lower.includes("architecture");
  const isAcademic =
    lower.includes("academic") ||
    lower.includes("abstract") ||
    lower.includes("methodological") ||
    lower.includes("hypothesis") ||
    lower.includes("et al.") ||
    lower.includes("research report");

  let recommendedArchetype: "executive" | "tech-spec" | "academic" | "creative" = "executive";
  if (isVideo) recommendedArchetype = "creative";
  else if (isSpec) recommendedArchetype = "tech-spec";
  else if (isAcademic) recommendedArchetype = "academic";

  if (isVideo && !foundTitle) {
    return {
      docTitle: "DocuMind Promotional Video — Production Brief",
      docSubtitle: foundSubtitle || "Continuity Requirements, Visual Storyboard & Technical Specification",
      authorName: foundAuthor || "Production & Creative Team",
      institution: foundInstitution || "DocuMind Studios",
      dateStr: foundDate || defaultMonthYear,
      recommendedArchetype: "creative",
    };
  }

  if (!foundTitle) {
    // Check if line is conversational or too long to be a document title
    const isConversationalOrLong = (l: string) => {
      if (l.length > 80) return true;
      if (
        /^(?:absolutely|before writing|let's create|let us|here is|here are|sure|please|note that|this document outlines|as requested)\b/i.test(
          l,
        )
      ) {
        return true;
      }
      // Multiple full sentences ending with periods
      if (l.split(/[.?!]\s+/).length > 2) return true;
      return false;
    };

    // Check markdown H1 first
    const h1Line = lines.find((l) => /^#\s+(.+)$/.test(l));
    if (h1Line) {
      foundTitle = h1Line.replace(/^#\s+/, "").trim();
    } else {
      // Find the first clean heading or subject candidate
      for (let i = 0; i < Math.min(lines.length, 10); i++) {
        const cur = lines[i]!;
        // Skip metadata lines
        if (/^(?:author|date|institution|by|title|subtitle):/i.test(cur)) continue;

        // Check for reference document intent pattern: e.g. "...reference document for the Eagle Technology company book..."
        const refMatch = cur.match(
          /reference document for (?:the )?([a-zA-Z0-9\s]+?)(?: company book|\.|$)/i,
        );
        if (refMatch && refMatch[1] && refMatch[1].length < 50) {
          foundTitle = `${refMatch[1].trim()} — Reference Guide`;
          break;
        }

        // Check if line is a clean concise heading
        if (!isConversationalOrLong(cur)) {
          const clean = cur
            .replace(/^(\d+(?:\.\d+)*|[A-Z]\.|\bSection\b|\bChapter\b|#+)\s*[:.]?\s*/i, "")
            .trim();
          if (clean.length > 2 && clean.length < 75 && !clean.endsWith(".")) {
            foundTitle = clean;
            break;
          }
        }
      }
    }

    if (!foundTitle) {
      // Check if text mentions a company or subject name
      const eagleMatch = text.match(/([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)*\s+Technology)/i);
      if (eagleMatch && eagleMatch[1]) {
        foundTitle = `${eagleMatch[1]} Reference Document`;
      } else {
        foundTitle = "Document Workspace";
      }
    }
  }

  return {
    docTitle: foundTitle || "Document Workspace",
    docSubtitle: foundSubtitle || "",
    authorName: foundAuthor || "",
    institution: foundInstitution || "",
    dateStr: foundDate || defaultMonthYear,
    recommendedArchetype,
  };
}

export function parseLinesToBlocks(
  lines: string[],
  sectionTitle: string,
  isSectionOne: boolean,
): DocBlock[] {
  const blocks: DocBlock[] = [];
  let pendingListItems: string[] = [];

  const flushList = () => {
    if (pendingListItems.length > 0) {
      blocks.push({
        type: "list",
        content: pendingListItems.join("\n"),
        listItems: [...pendingListItems],
      });
      pendingListItems = [];
    }
  };

  const isSceneSection =
    /^SCENE\s+\d+/i.test(sectionTitle) || /scene|storyboard/i.test(sectionTitle);
  const isCriticalSection =
    /critical|continuity|requirement|guardrail|compliance/i.test(sectionTitle);

  let sceneMeta: DocSceneMeta | null = null;
  if (isSceneSection) {
    const sceneMatch = sectionTitle.match(
      /^SCENE\s*(\d+)?\s*(?:[—–-]\s*(\d+[–-]\d+\s*(?:SECONDS?|SECS?|MINUTES?|MINS?)))?(?::?\s*(.*))?/i,
    );
    sceneMeta = {
      sceneNumber: sceneMatch?.[1] || "1",
      timestamp: sceneMatch?.[2] || "",
      title: sceneMatch?.[3]?.trim() || sectionTitle,
    };
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;

    // 1. Check for bullet list item:
    // Only concise bullet lines (< 120 chars) that start with explicit bullet symbols (- * •)
    // or short numbered items (< 70 chars, without terminal period)
    const isExplicitBullet = /^[-*•]\s+(.*)$/.exec(line);
    const isShortNumberedItem = /^\d+\.\s+([^.\n]{3,65})$/.exec(line);
    const isBulletList = isExplicitBullet || (isShortNumberedItem && lines.length > 2);

    if (isBulletList) {
      pendingListItems.push(isExplicitBullet ? isExplicitBullet[1]! : isShortNumberedItem![1]!);
      continue;
    } else {
      flushList();
    }

    // 2. Check for Color Palette with hex codes
    const hexRegex = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
    const hexMatches = line.match(hexRegex);
    if (
      hexMatches &&
      hexMatches.length > 0 &&
      (hexMatches.length >= 2 || /palette|color|theme/i.test(line))
    ) {
      const colorRegex =
        /(?:([A-Za-z0-9\s-]+?)\s*)?\((#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3}))\)|([A-Za-z0-9\s-]+?)\s*:\s*(#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3}))/g;
      const colors: DocColor[] = [];
      let m: RegExpExecArray | null;
      while ((m = colorRegex.exec(line)) !== null) {
        const name = (m[1] || m[3] || "Accent")
          .trim()
          .replace(/^(deep|electric|warm|clean|soft)\s*/i, (match) =>
            match.charAt(0).toUpperCase() + match.slice(1),
          );
        const hex = m[2] || m[4];
        if (hex && !colors.some((c) => c.hex.toLowerCase() === hex.toLowerCase())) {
          colors.push({ name: name || "Color Token", hex });
        }
      }
      for (const h of hexMatches) {
        if (!colors.some((c) => c.hex.toLowerCase() === h.toLowerCase())) {
          colors.push({ name: "Color Token", hex: h });
        }
      }

      blocks.push({
        type: "palette",
        content: line,
        colors,
      });
      continue;
    }

    // 3. Check for Visual / Audio / Text in Scene
    if (sceneMeta) {
      const visualMatch = line.match(
        /^(?:Visual\s*(?:\/\s*Video)?|Visual Cue|Video|Camera)\s*:\s*(.*)$/i,
      );
      const audioMatch = line.match(
        /^(?:Audio\s*(?:\/\s*Voiceover)?|Voiceover|VO|Dialogue|Soundtrack)\s*:\s*(.*)$/i,
      );
      const textMatch = line.match(
        /^(?:On-Screen Text|On-Screen Metric|Text|Overlay|Graphic)\s*:\s*(.*)$/i,
      );

      if (visualMatch) {
        sceneMeta.visual = visualMatch[1];
        continue;
      }
      if (audioMatch) {
        sceneMeta.audio = audioMatch[1];
        continue;
      }
      if (textMatch) {
        sceneMeta.textOverlay = textMatch[1];
        continue;
      }
    }

    // 4. Standalone Visual / Audio cues outside a scene
    const standaloneVisual = line.match(
      /^(?:Visual\s*(?:\/\s*Video)?|Visual Cue|Video|Camera)\s*:\s*(.*)$/i,
    );
    const standaloneAudio = line.match(
      /^(?:Audio\s*(?:\/\s*Voiceover)?|Voiceover|VO)\s*:\s*(.*)$/i,
    );
    if (standaloneVisual) {
      blocks.push({
        type: "parameter",
        content: line,
        key: "Visual Cue",
        value: standaloneVisual[1],
      });
      continue;
    }
    if (standaloneAudio) {
      blocks.push({
        type: "parameter",
        content: line,
        key: "Voiceover / Audio",
        value: standaloneAudio[1],
      });
      continue;
    }

    // 5. Critical / Requirement Callouts
    const calloutMatch = line.match(
      /^(?:CRITICAL|IMPORTANT|NOTE|WARNING|REQUIREMENT|CONTINUITY REQUIREMENT|GUARDRAIL)\s*[:.]?\s*(.*)$/i,
    );
    if (isCriticalSection || calloutMatch) {
      const isCritical =
        /critical|continuity|warning/i.test(sectionTitle) || /critical|warning/i.test(line);
      blocks.push({
        type: "callout",
        content: calloutMatch ? calloutMatch[1] || line : line,
        calloutType: isCritical ? "critical" : "requirement",
        calloutTitle: isCritical ? "Critical Continuity Guardrail" : "Requirement Specification",
      });
      continue;
    }

    // 6. Parameter Key: Value (standalone or embedded after sentence e.g. "Create Part 2... Duration: exactly 30 seconds.")
    const embeddedParamMatch = line.match(
      /(?:^|\.\s+)(Duration|Target Audience|Target|Format|Resolution|Pacing|Aspect Ratio|Deliverable Format|Deliverable|Deadline|Status|Priority|Budget)\s*:\s*([^.\n]+(?:\.|$))/i,
    );
    if (embeddedParamMatch && embeddedParamMatch[1] && embeddedParamMatch[2]) {
      const key = embeddedParamMatch[1].trim();
      const value = embeddedParamMatch[2].trim().replace(/\.$/, "");
      const remainingText = line.replace(embeddedParamMatch[0], "").trim();
      if (remainingText && remainingText.length > 10) {
        blocks.push({
          type: isSectionOne && blocks.length === 0 ? "lead" : "paragraph",
          content: remainingText,
        });
      }
      blocks.push({
        type: "parameter",
        content: line,
        key,
        value,
      });
      continue;
    }

    // 7. Lead paragraph or standard paragraph
    if (isSectionOne && blocks.length === 0 && line.length > 20) {
      blocks.push({
        type: "lead",
        content: line,
      });
    } else {
      blocks.push({
        type: "paragraph",
        content: line,
      });
    }
  }

  flushList();

  if (sceneMeta && (sceneMeta.visual || sceneMeta.audio || sceneMeta.textOverlay)) {
    blocks.unshift({
      type: "scene",
      content: sectionTitle,
      sceneMeta,
    });
  }

  return blocks;
}

export function parseDocumentSections(
  text: string,
  headingNumbering: "decimal" | "roman" | "none",
): DocSection[] {
  if (!text || !text.trim()) {
    return [
      {
        level: 1,
        numberStr:
          headingNumbering === "decimal" ? "1.0 " : headingNumbering === "roman" ? "I. " : "",
        title: "Overview & Objectives",
        paragraphs: ["Paste or upload your source text to preview formatted document sections."],
        blocks: [
          {
            type: "paragraph",
            content: "Paste or upload your source text to preview formatted document sections.",
          },
        ],
      },
    ];
  }

  const lines = text.split("\n").map((l) => l.trim());
  const sections: DocSection[] = [];
  let currentSec: {
    level: 1 | 2 | 3;
    numberStr: string;
    title: string;
    lines: string[];
  } | null = null;
  let sectionCounter = 0;
  let subSectionCounter = 0;
  let subSubCounter = 0;

  const isHeader = (line: string): { isHeader: boolean; level: 1 | 2 | 3; cleanTitle: string } => {
    if (!line || line.length > 120) return { isHeader: false, level: 1, cleanTitle: "" };

    // Markdown headers
    if (line.startsWith("###")) {
      return { isHeader: true, level: 3, cleanTitle: line.replace(/^###\s*/, "") };
    }
    if (line.startsWith("##")) {
      return { isHeader: true, level: 2, cleanTitle: line.replace(/^##\s*/, "") };
    }
    if (line.startsWith("#")) {
      return { isHeader: true, level: 1, cleanTitle: line.replace(/^#\s*/, "") };
    }

    // Numbered headings like "1.0 Title", "1. Title", "2.1 Subtitle", "2.1.1 Detail"
    const numMatch = line.match(/^(\d+(?:\.\d+)*)\s*[:.]?\s+(.*)$/);
    if (numMatch && numMatch[2] && numMatch[2].length > 2 && !numMatch[2].endsWith(".")) {
      const parts = numMatch[1].split(".");
      let lvl: 1 | 2 | 3 = 1;
      if (parts.length === 1 || (parts.length === 2 && parts[1] === "0")) {
        lvl = 1;
      } else if (parts.length === 2) {
        lvl = 2;
      } else {
        lvl = 3;
      }
      // Strip any nested numbering prefix so we NEVER duplicate e.g. "2.1 1. Purpose" -> "2.1 Purpose"
      const clean = numMatch[2].replace(/^(\d+[\s.)-]+\s*|[A-Z]\.[\s.)-]+\s*)/, "").trim();
      return { isHeader: true, level: lvl, cleanTitle: clean || numMatch[2].trim() };
    }

    // SCENE header format: "SCENE 1 — 0–10 SECONDS: THE FRICTION"
    if (/^SCENE\s+\d+/i.test(line)) {
      return { isHeader: true, level: 1, cleanTitle: line };
    }

    // Heading ending with colon e.g. "Background & Problem Statement:"
    if (
      line.endsWith(":") &&
      line.length < 55 &&
      !line.includes(",") &&
      !/^(visual|audio|format|duration|note|on-screen)/i.test(line)
    ) {
      return { isHeader: true, level: 2, cleanTitle: line.replace(/:$/, "") };
    }

    return { isHeader: false, level: 1, cleanTitle: "" };
  };

  const pushCurrentSec = () => {
    if (!currentSec) return;
    const isSecOne = sections.length === 0;
    const blocks = parseLinesToBlocks(currentSec.lines, currentSec.title, isSecOne);
    sections.push({
      level: currentSec.level,
      numberStr: currentSec.numberStr,
      title: currentSec.title,
      paragraphs: currentSec.lines.length > 0 ? currentSec.lines : [currentSec.title],
      blocks,
    });
  };

  // Preserve preamble lines before the first header into an introductory section if appropriate
  const firstHeaderIdx = lines.findIndex((l) => isHeader(l).isHeader);
  if (firstHeaderIdx > 0) {
    const isFirstHeaderMajor = lines[firstHeaderIdx] ? /^1(?:\.0)?\b/.test(lines[firstHeaderIdx]!) : false;
    if (!isFirstHeaderMajor) {
      const preamble = lines.slice(0, firstHeaderIdx).filter(Boolean);
      if (preamble.length > 0) {
        const pBlocks = parseLinesToBlocks(preamble, "Overview & Context", true);
        sections.push({
          level: 1,
          numberStr: headingNumbering === "decimal" ? "1.0 " : headingNumbering === "roman" ? "I. " : "",
          title: "Overview & Context",
          paragraphs: preamble,
          blocks: pBlocks,
        });
        sectionCounter = 1;
      }
    }
  }
  const startIdx = firstHeaderIdx >= 0 ? firstHeaderIdx : 0;

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const check = isHeader(line);
    if (check.isHeader) {
      pushCurrentSec();

      if (check.level === 1) {
        // If the header has an explicit number like "1.0" or "2.0", synchronize with it
        const explicitNum = line.match(/^(\d+)(?:\.0)?\b/);
        if (explicitNum && explicitNum[1]) {
          sectionCounter = parseInt(explicitNum[1], 10);
        } else {
          sectionCounter++;
        }
        subSectionCounter = 0;
        subSubCounter = 0;
      } else if (check.level === 2) {
        subSectionCounter++;
        subSubCounter = 0;
      } else {
        subSubCounter++;
      }

      const numStr =
        headingNumbering === "decimal"
          ? check.level === 1
            ? `${sectionCounter}.0 `
            : check.level === 2
              ? `${sectionCounter}.${subSectionCounter} `
              : `${sectionCounter}.${subSectionCounter}.${subSubCounter} `
          : headingNumbering === "roman"
            ? check.level === 1
              ? `${["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][sectionCounter - 1] || sectionCounter}. `
              : check.level === 2
                ? `${String.fromCharCode(64 + subSectionCounter)}. `
                : `${subSubCounter}. `
            : "";

      currentSec = {
        level: check.level,
        numberStr: numStr,
        title: check.cleanTitle,
        lines: [],
      };
    } else {
      if (!currentSec) {
        sectionCounter = 1;
        const numStr =
          headingNumbering === "decimal" ? "1.0 " : headingNumbering === "roman" ? "I. " : "";
        currentSec = {
          level: 1,
          numberStr: numStr,
          title: "Introduction & Context",
          lines: [],
        };
      }
      currentSec.lines.push(line);
    }
  }

  pushCurrentSec();

  return sections;
}

export function DocumentFormattingWorkflow({
  onSwitchToPresentation,
}: {
  onSwitchToPresentation?: () => void;
}) {
  // Step navigation: 1: Source Content, 2: Style & Layout Rules, 3: Preview & Download
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Content state
  const [inputMode, setInputMode] = useState<"paste" | "upload">("paste");
  const [rawText, setRawText] = useState(() => {
    if (typeof window !== "undefined" && window.sessionStorage) {
      const stored = window.sessionStorage.getItem("documind_template_doc_content");
      if (stored) return stored;
    }
    return "";
  });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [detectedFormat, setDetectedFormat] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lifecycle check for incoming document template
  useEffect(() => {
    if (typeof window !== "undefined" && window.sessionStorage) {
      const storedDoc = window.sessionStorage.getItem("documind_template_doc_content");
      const storedTitle = window.sessionStorage.getItem("documind_template_doc_title");
      if (storedDoc) {
        toast.success(`Template loaded: "${storedTitle || "Document Template"}"`, {
          description: "Structured sections and design tokens applied to Document Studio.",
        });
        window.sessionStorage.removeItem("documind_template_doc_content");
        window.sessionStorage.removeItem("documind_template_doc_title");
      }
    }
  }, []);

  // Configuration state
  const [config, setConfig] = useState<FormattingConfig>({
    layoutArchetype: "executive",
    hasCoverPage: false,
    coverStyle: "modern",
    docTitle: "Document Title",
    docSubtitle: "",
    authorName: "",
    institution: "",
    dateStr: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),

    fontFamily: "serif",
    baseFontSize: "11pt",
    lineSpacing: "1.5",
    paragraphSpacing: "normal",

    headingNumbering: "decimal",
    headingCase: "title",
    headingDivider: false,

    margins: "academic",

    headerText: "",
    headerAlign: "right",
    headerRule: false,

    pageNumberPosition: "bottom-center",
    pageNumberFormat: "page-x-of-y",
    firstPageUnnumbered: true,

    includeToc: true,
    tocLevels: 2,
    tocDotLeaders: true,
  });

  // Active preview tab in Step 3
  const [previewPage, setPreviewPage] = useState<"full" | "body" | "toc" | "cover">("full");
  const [paperMode, setPaperMode] = useState<"standard" | "dark">("standard");

  // File handling
  const handleFileUpload = async (file: File) => {
    setUploadedFile(file);
    const ext = file.name.split(".").pop()?.toLowerCase();
    setDetectedFormat(ext?.toUpperCase() || "UNKNOWN");

    if (ext === "txt") {
      const text = await file.text();
      setRawText(text);
      deriveTitleFromContent(text);
      toast.success(`Loaded "${file.name}" successfully.`);
      return;
    }

    if (ext === "pdf" || ext === "docx") {
      setExtracting(true);
      try {
        const res = await extractDocumentText(file);
        if (res.text) {
          setRawText(res.text);
          deriveTitleFromContent(res.text);
          toast.success(`Extracted ${res.wordCount || "text"} words from "${file.name}".`);
        } else {
          toast.info("Document loaded. You can refine the text before formatting.");
        }
      } catch (err) {
        console.warn("Extraction fallback:", err);
        toast.error("Could not extract full text. You can paste the content directly.");
      } finally {
        setExtracting(false);
      }
    } else {
      toast.error("Unsupported file format. Please upload PDF, DOCX, or TXT.");
    }
  };

  const deriveTitleFromContent = (text: string) => {
    const meta = deriveDocumentMetadata(text);
    setConfig((prev) => ({
      ...prev,
      docTitle: meta.docTitle || prev.docTitle,
      docSubtitle: meta.docSubtitle || "",
      authorName: meta.authorName || "",
      institution: meta.institution || "",
      dateStr: meta.dateStr || prev.dateStr,
      layoutArchetype: meta.recommendedArchetype || prev.layoutArchetype,
    }));
  };

  const autoPolishText = () => {
    if (!rawText.trim()) return;
    deriveTitleFromContent(rawText);
    toast.success("Document structure and editorial blueprint optimized!");
  };

  // Export handlers
  const handleExportDocx = () => {
    // Generate styled HTML/text payload packaged as clean downloadable HTML-based doc / rich text
    const htmlContent = generateFormattedHtml(rawText, config);
    const blob = new Blob([htmlContent], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const docName = `${config.docTitle.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 32) || "formatted_document"}.doc`;
    const a = document.createElement("a");
    a.href = url;
    a.download = docName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Document downloaded in editable Word-compatible format!");
  };

  const handlePrintPreview = () => {
    const htmlContent = generateFormattedHtml(rawText, config);
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocked. Please allow popups to print/save as PDF.");
      return;
    }
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const handleCopyFormattedText = () => {
    navigator.clipboard.writeText(rawText);
    toast.success("Document text copied to clipboard!");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Workflow Header Banner */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <BookOpen className="h-3.5 w-3.5" />
            <span>Document Styling & Academic Typography</span>
          </div>
          <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Document Formatting Studio
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            Format written documents with professional cover pages, precise heading hierarchies,
            standardized margins, running headers, and clean page numbers. Completely separate from
            PowerPoint slide decks.
          </p>
        </div>

        {onSwitchToPresentation && (
          <Button
            variant="glass"
            size="sm"
            onClick={onSwitchToPresentation}
            className="self-start md:self-auto gap-2 text-xs"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Switch to Presentation Maker
          </Button>
        )}
      </div>

      {/* Step Indicator Bar */}
      <div className="mb-8 grid grid-cols-3 gap-2 sm:gap-4">
        {[
          { num: 1, label: "1. Source Document", desc: "Paste or upload DOCX/PDF/TXT" },
          { num: 2, label: "2. Style & Typography", desc: "Cover, margins, fonts, headers" },
          { num: 3, label: "3. Preview & Export", desc: "Inspect pages & download doc" },
        ].map((s) => {
          const isActive = step === s.num;
          const isDone = step > s.num;
          return (
            <button
              key={s.num}
              onClick={() => {
                // allow navigating to previous steps
                if (s.num <= step || (step === 1 && rawText.trim())) {
                  setStep(s.num as 1 | 2 | 3);
                }
              }}
              className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-all ${
                isActive
                  ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20"
                  : isDone
                    ? "border-border bg-card hover:border-primary/40"
                    : "border-border/60 bg-surface-2/40 opacity-70 cursor-not-allowed"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                    isDone
                      ? "bg-emerald-600 text-white"
                      : isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.num}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    isActive ? "text-primary" : "text-foreground"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              <p className="mt-1 hidden sm:block text-[11px] text-muted-foreground">{s.desc}</p>
            </button>
          );
        })}
      </div>

      {/* IMPORTANT EDUCATIONAL BANNER: PDF Reconstruction Limits vs DOCX */}
      <div className="mb-8 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/70 dark:bg-blue-950/20 p-4 sm:p-5 text-foreground">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 shrink-0 text-primary mt-0.5" />
          <div className="text-xs space-y-1.5 leading-relaxed">
            <p className="font-semibold text-foreground text-sm">
              Understanding Document Formats: Native DOCX vs. Static PDF
            </p>
            <p className="text-foreground/80">
              <strong className="text-foreground">Editable Word (DOCX) & Plain Text (TXT):</strong>{" "}
              Provide complete reflowable structural styling. You can freely change margins, fonts,
              heading hierarchies, running headers, and page numbering with 100% typographic
              fidelity.
            </p>
            <p className="text-foreground/80">
              <strong className="text-foreground">Adobe PDF Documents:</strong> PDFs are
              fixed-coordinate visual files. DocuMind extracts the textual semantic structure to
              apply standardized rules. For complex multi-column brochures or scanned graphics,
              verify page boundaries in the live preview before exporting.
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* STEP 1: SOURCE DOCUMENT INPUT */}
      {/* ============================================================== */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-paper">
            {/* Input Mode Selector */}
            <div className="flex items-center justify-between border-b border-border pb-4 mb-5">
              <h2 className="font-serif text-lg font-bold text-foreground">
                Provide Document Content
              </h2>
              <div className="flex rounded-lg border border-border bg-surface-2 p-0.5">
                <button
                  type="button"
                  onClick={() => setInputMode("paste")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                    inputMode === "paste"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Type className="h-3.5 w-3.5" />
                  Paste Text Editor
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("upload")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                    inputMode === "upload"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload Document
                </button>
              </div>
            </div>

            {inputMode === "paste" ? (
              <div>
                <div className="mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Document Text (paste draft, production brief, thesis chapter, or technical notes)
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground hidden sm:inline mr-1">Presets:</span>
                    <Button
                      variant="glass"
                      size="sm"
                      className="text-[11px] h-7 gap-1"
                      onClick={() => {
                        setRawText(sampleVideoBriefText);
                        deriveTitleFromContent(sampleVideoBriefText);
                        toast.info("Loaded Video Production Brief Blueprint with Scene Breakdown.");
                      }}
                    >
                      <Film className="h-3 w-3 text-primary" />
                      Video Brief
                    </Button>
                    <Button
                      variant="glass"
                      size="sm"
                      className="text-[11px] h-7 gap-1"
                      onClick={() => {
                        setRawText(sampleDocumentText);
                        deriveTitleFromContent(sampleDocumentText);
                        toast.info("Loaded Academic Research Report Blueprint.");
                      }}
                    >
                      <BookOpen className="h-3 w-3 text-primary" />
                      Academic Report
                    </Button>
                    <Button
                      variant="glass"
                      size="sm"
                      className="text-[11px] h-7 gap-1"
                      onClick={() => {
                        setRawText(sampleTechSpecText);
                        deriveTitleFromContent(sampleTechSpecText);
                        toast.info("Loaded Technical System Spec Blueprint.");
                      }}
                    >
                      <Layers className="h-3 w-3 text-primary" />
                      Technical Spec
                    </Button>
                  </div>
                </div>
                <textarea
                  rows={12}
                  value={rawText}
                  onChange={(e) => {
                    setRawText(e.target.value);
                    deriveTitleFromContent(e.target.value);
                  }}
                  placeholder="Paste your unformatted report, manuscript, video prompt, or research notes here..."
                  className="w-full rounded-xl border border-border bg-background p-4 text-sm font-sans leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{rawText.trim().split(/\s+/).filter(Boolean).length} words</span>
                  <span>Supports numbered sections (`1.0`, `2.0`), scene markers (`SCENE 1`), and markdown (`#`, `##`)</span>
                </div>
              </div>
            ) : (
              <div>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-2/50 p-8 text-center transition-colors hover:border-primary hover:bg-surface-2 cursor-pointer"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Upload className="h-6 w-6" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-foreground">
                    {uploadedFile ? uploadedFile.name : "Click to select or drag & drop document"}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Supported formats: PDF, DOCX, TXT · Maximum file size: 50 MB
                  </p>
                  {detectedFormat && (
                    <span className="mt-3 rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                      Detected: {detectedFormat}
                    </span>
                  )}
                </div>

                {extracting && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-primary">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Extracting document text and detecting heading structure...</span>
                  </div>
                )}
              </div>
            )}

            {/* Semantic Analysis & Document Intelligence Overview */}
            {rawText.trim().length > 0 && (
              <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-primary/15 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-xs sm:text-sm text-foreground">
                      Document Intelligence & Semantic Extraction
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-surface-2 border border-border px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                      {rawText.trim().split(/\s+/).filter(Boolean).length} words
                    </span>
                    <span className="rounded-full bg-surface-2 border border-border px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                      ~{Math.max(1, Math.ceil(rawText.trim().split(/\s+/).filter(Boolean).length / 200))} min read
                    </span>
                    <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-primary">
                      {parseDocumentSections(rawText, config.headingNumbering).length} Sections Identified
                    </span>
                  </div>
                </div>

                {/* Key Highlights and Detected Tags */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {/critical|continuity|requirement|guardrail/i.test(rawText) && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                      <ShieldCheck className="h-3 w-3" />
                      Continuity / Guardrails Detected
                    </span>
                  )}
                  {/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/.test(rawText) && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 text-[11px] font-semibold text-cyan-600 dark:text-cyan-400">
                      <Palette className="h-3 w-3" />
                      Brand & Color Tokens Detected
                    </span>
                  )}
                  {/scene\s+\d+|storyboard|visual:/i.test(rawText) && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                      <Video className="h-3 w-3" />
                      Storyboard / Scene Timelines
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Reflowable Semantic Hierarchy
                  </span>
                </div>

                {/* Structured Document Outline Preview */}
                <div className="rounded-xl border border-border bg-card p-3 max-h-48 overflow-y-auto space-y-1.5 text-xs">
                  {parseDocumentSections(rawText, config.headingNumbering).map((sec, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-1 border-b border-border/40 last:border-none"
                    >
                      <div className="flex items-center gap-2 max-w-[70%] truncate">
                        <span className="font-mono text-primary font-bold text-[11px]">
                          {sec.numberStr.trim() || `0${idx + 1}`}
                        </span>
                        <span className="font-medium text-foreground truncate">{sec.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground shrink-0">
                        {sec.blocks.some((b) => b.type === "callout") && (
                          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 font-semibold text-amber-600 dark:text-amber-400">
                            Guardrail
                          </span>
                        )}
                        {sec.blocks.some((b) => b.type === "palette") && (
                          <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 font-semibold text-cyan-600 dark:text-cyan-400">
                            Colors
                          </span>
                        )}
                        {sec.blocks.some((b) => b.type === "scene") && (
                          <span className="rounded bg-purple-500/10 px-1.5 py-0.5 font-semibold text-purple-600 dark:text-purple-400">
                            Scene
                          </span>
                        )}
                        <span>{sec.paragraphs.length} paragraphs</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {rawText.trim().length > 0 ? (
              <Button
                variant="glass"
                size="sm"
                onClick={() => {
                  autoPolishText();
                  setStep(3);
                }}
                className="gap-1.5 text-xs text-primary"
              >
                <Wand2 className="h-3.5 w-3.5" /> Instant Executive Formatting (Preview Now)
              </Button>
            ) : <div />}

            <Button
              variant="hero"
              size="lg"
              disabled={!rawText.trim() || extracting}
              onClick={() => setStep(2)}
              className="gap-2 px-6"
            >
              Continue to Styling & Typography <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STEP 2: STYLING & TYPOGRAPHY CONFIGURATION */}
      {/* ============================================================== */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Document Layout Archetype Selector */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-paper">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="font-serif text-base font-bold text-foreground">
                  Document Layout Archetype
                </h2>
              </div>
              <span className="text-xs text-muted-foreground">
                Transforms plain text dumps into structured executive reports, cards, and callouts
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  id: "executive",
                  title: "Executive White Paper",
                  desc: "Modern corporate report with callout boxes, guardrail badges, and design tokens.",
                  badge: "Recommended",
                },
                {
                  id: "creative",
                  title: "Production Storyboard",
                  desc: "Scene timelines, visual/audio cue cards, and brand palette tokens.",
                  badge: "Media / Video",
                },
                {
                  id: "tech-spec",
                  title: "Technical System Spec",
                  desc: "Numbered clauses, monospace parameter tags, and RFC architecture.",
                  badge: "Engineering",
                },
                {
                  id: "academic",
                  title: "Academic Manuscript",
                  desc: "Traditional APA/IEEE formal manuscript with standard indented paragraphs.",
                  badge: "Journal",
                },
              ].map((arch) => (
                <button
                  key={arch.id}
                  type="button"
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      layoutArchetype: arch.id as FormattingConfig["layoutArchetype"],
                    }))
                  }
                  className={`rounded-xl border p-3.5 text-left transition-all ${
                    config.layoutArchetype === arch.id
                      ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20"
                      : "border-border bg-surface-2/40 hover:border-border/80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground">{arch.title}</span>
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                      {arch.badge}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
                    {arch.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Column A: Cover Page & Metadata */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-paper">
                <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h2 className="font-serif text-base font-bold text-foreground">
                      Cover Page & Metadata
                    </h2>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.hasCoverPage}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, hasCoverPage: e.target.checked }))
                      }
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    Generate Cover Page
                  </label>
                </div>

                {config.hasCoverPage ? (
                  <div className="space-y-3.5">
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Cover Page Style
                      </label>
                      <div className="mt-1.5 grid grid-cols-2 gap-2 text-xs">
                        {[
                          {
                            id: "academic",
                            label: "Academic Classic",
                            sub: "Institutional / Formal",
                          },
                          { id: "modern", label: "Modern Minimal", sub: "Clean Sans-Serif" },
                          { id: "corporate", label: "Corporate Formal", sub: "Executive Report" },
                          {
                            id: "minimal",
                            label: "Editorial Creative",
                            sub: "Distinctive Typography",
                          },
                        ].map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() =>
                              setConfig((prev) => ({
                                ...prev,
                                coverStyle: c.id as FormattingConfig["coverStyle"],
                              }))
                            }
                            className={`rounded-lg border p-2.5 text-left transition-all ${
                              config.coverStyle === c.id
                                ? "border-primary bg-primary/5 text-foreground font-semibold"
                                : "border-border bg-surface-2/40 text-muted-foreground hover:border-border/80"
                            }`}
                          >
                            <p className="text-xs">{c.label}</p>
                            <p className="text-[10px] text-muted-foreground">{c.sub}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-foreground">Document Title</label>
                      <input
                        type="text"
                        value={config.docTitle}
                        onChange={(e) =>
                          setConfig((prev) => ({ ...prev, docTitle: e.target.value }))
                        }
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-foreground">
                        Subtitle / Purpose
                      </label>
                      <input
                        type="text"
                        value={config.docSubtitle}
                        onChange={(e) =>
                          setConfig((prev) => ({ ...prev, docSubtitle: e.target.value }))
                        }
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-foreground">Author / By</label>
                        <input
                          type="text"
                          value={config.authorName}
                          onChange={(e) =>
                            setConfig((prev) => ({ ...prev, authorName: e.target.value }))
                          }
                          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-foreground">
                          Institution / Org
                        </label>
                        <input
                          type="text"
                          value={config.institution}
                          onChange={(e) =>
                            setConfig((prev) => ({ ...prev, institution: e.target.value }))
                          }
                          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-foreground">Date String</label>
                      <input
                        type="text"
                        value={config.dateStr}
                        onChange={(e) =>
                          setConfig((prev) => ({ ...prev, dateStr: e.target.value }))
                        }
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic py-4">
                    Cover page disabled. The document will begin directly with the first heading and
                    running header.
                  </p>
                )}
              </div>

              {/* Headings Hierarchy & Table of Contents */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-paper">
                <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
                  <ListOrdered className="h-4 w-4 text-primary" />
                  <h2 className="font-serif text-base font-bold text-foreground">
                    Headings Hierarchy & Table of Contents
                  </h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-foreground">
                      Section Numbering Style
                    </label>
                    <div className="mt-1.5 grid grid-cols-3 gap-2">
                      {[
                        { id: "decimal", label: "1.0, 1.1, 1.2", sub: "Scientific / IEEE" },
                        { id: "roman", label: "I., II., III.", sub: "Classic / Legal" },
                        { id: "none", label: "Unnumbered", sub: "Editorial / Essay" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            setConfig((prev) => ({
                              ...prev,
                              headingNumbering: item.id as FormattingConfig["headingNumbering"],
                            }))
                          }
                          className={`rounded-lg border p-2 text-center transition-all ${
                            config.headingNumbering === item.id
                              ? "border-primary bg-primary/5 text-foreground font-semibold"
                              : "border-border bg-surface-2/40 text-muted-foreground"
                          }`}
                        >
                          <p className="text-xs">{item.label}</p>
                          <p className="text-[10px] text-muted-foreground">{item.sub}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <div>
                      <p className="text-xs font-medium text-foreground">
                        Automatic Table of Contents
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Extracts headings into preliminary TOC with page references
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.includeToc}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, includeToc: e.target.checked }))
                      }
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                  </div>

                  {config.includeToc && (
                    <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface-2/30 p-3 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.tocDotLeaders}
                          onChange={(e) =>
                            setConfig((prev) => ({ ...prev, tocDotLeaders: e.target.checked }))
                          }
                          className="rounded border-border text-primary"
                        />
                        <span>Dot leaders (....... 1)</span>
                      </label>
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-muted-foreground">Depth:</span>
                        <button
                          type="button"
                          onClick={() => setConfig((prev) => ({ ...prev, tocLevels: 2 }))}
                          className={`rounded px-2 py-0.5 font-mono text-[11px] ${
                            config.tocLevels === 2 ? "bg-primary text-white font-bold" : "bg-muted"
                          }`}
                        >
                          H1-H2
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfig((prev) => ({ ...prev, tocLevels: 3 }))}
                          className={`rounded px-2 py-0.5 font-mono text-[11px] ${
                            config.tocLevels === 3 ? "bg-primary text-white font-bold" : "bg-muted"
                          }`}
                        >
                          H1-H3
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Column B: Typography, Margins, Headers/Footers, Page Numbers */}
            <div className="space-y-6">
              {/* Typography & Spacing */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-paper">
                <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
                  <Type className="h-4 w-4 text-primary" />
                  <h2 className="font-serif text-base font-bold text-foreground">
                    Typography & Layout Rules
                  </h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-foreground">
                      Primary Font Family
                    </label>
                    <div className="mt-1.5 grid grid-cols-3 gap-2 text-xs">
                      {[
                        { id: "serif", label: "Academic Serif", font: "Newsreader / Georgia" },
                        { id: "sans", label: "Modern Sans", font: "Manrope / Helvetica" },
                        { id: "mono", label: "Technical Mono", font: "JetBrains Mono" },
                      ].map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() =>
                            setConfig((prev) => ({
                              ...prev,
                              fontFamily: f.id as FormattingConfig["fontFamily"],
                            }))
                          }
                          className={`rounded-lg border p-2 text-left transition-all ${
                            config.fontFamily === f.id
                              ? "border-primary bg-primary/5 text-foreground font-semibold"
                              : "border-border bg-surface-2/40 text-muted-foreground"
                          }`}
                        >
                          <p className="text-xs">{f.label}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{f.font}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-foreground">Base Font Size</label>
                      <select
                        value={config.baseFontSize}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            baseFontSize: e.target.value as FormattingConfig["baseFontSize"],
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                      >
                        <option value="10pt">10 pt (Compact / Multi-column)</option>
                        <option value="11pt">11 pt (Standard Journal / Report)</option>
                        <option value="12pt">12 pt (Academic Manuscript / MLA)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-foreground">Line Spacing</label>
                      <select
                        value={config.lineSpacing}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            lineSpacing: e.target.value as FormattingConfig["lineSpacing"],
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                      >
                        <option value="1.0">1.0 (Single Spaced)</option>
                        <option value="1.15">1.15 (Contemporary Business)</option>
                        <option value="1.5">1.5 (Academic Standard)</option>
                        <option value="2.0">2.0 (Double Spaced / Review)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-foreground">Page Margins</label>
                    <div className="mt-1.5 grid grid-cols-4 gap-2 text-center text-xs">
                      {[
                        { id: "normal", label: "Normal", dim: "1.0 in (2.54cm)" },
                        { id: "narrow", label: "Narrow", dim: "0.5 in" },
                        { id: "academic", label: "Academic", dim: "1.25 in gutter" },
                        { id: "wide", label: "Wide", dim: "1.5 in" },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() =>
                            setConfig((prev) => ({
                              ...prev,
                              margins: m.id as FormattingConfig["margins"],
                            }))
                          }
                          className={`rounded-lg border p-2 transition-all ${
                            config.margins === m.id
                              ? "border-primary bg-primary/5 text-foreground font-semibold"
                              : "border-border bg-surface-2/40 text-muted-foreground"
                          }`}
                        >
                          <p className="text-xs">{m.label}</p>
                          <p className="text-[9px] text-muted-foreground">{m.dim}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Running Headers, Footers & Page Numbers */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-paper">
                <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
                  <Hash className="h-4 w-4 text-primary" />
                  <h2 className="font-serif text-base font-bold text-foreground">
                    Headers, Footers & Page Numbers
                  </h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-foreground">
                      Running Header Text
                    </label>
                    <input
                      type="text"
                      value={config.headerText}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, headerText: e.target.value }))
                      }
                      placeholder="e.g. DocuMind Technical Report Series"
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-foreground">
                        Header Alignment
                      </label>
                      <select
                        value={config.headerAlign}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            headerAlign: e.target.value as FormattingConfig["headerAlign"],
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                      >
                        <option value="right">Right Aligned</option>
                        <option value="left">Left Aligned</option>
                        <option value="split">Split Title / Chapter</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-foreground">
                        Page Number Position
                      </label>
                      <select
                        value={config.pageNumberPosition}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            pageNumberPosition: e.target
                              .value as FormattingConfig["pageNumberPosition"],
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                      >
                        <option value="bottom-center">Bottom Center (Standard)</option>
                        <option value="bottom-right">Bottom Right</option>
                        <option value="top-right">Top Right (MLA)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-border pt-3 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.firstPageUnnumbered}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            firstPageUnnumbered: e.target.checked,
                          }))
                        }
                        className="rounded border-border text-primary"
                      />
                      <span>First page / cover unnumbered</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.headerRule}
                        onChange={(e) =>
                          setConfig((prev) => ({ ...prev, headerRule: e.target.checked }))
                        }
                        className="rounded border-border text-primary"
                      />
                      <span>Subtle divider rule</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between border-t border-border pt-6">
            <Button variant="glass" onClick={() => setStep(1)} className="gap-2">
              <ChevronLeft className="h-4 w-4" /> Back to Content
            </Button>
            <Button variant="hero" size="lg" onClick={() => setStep(3)} className="gap-2 px-6">
              Generate Live Document Preview <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STEP 3: PREVIEW & DOWNLOAD */}
      {/* ============================================================== */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Top Control Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-paper">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <FileCheck className="h-4 w-4" />
              </span>
              <div>
                <h3 className="font-serif text-sm font-bold text-foreground">
                  Formatted Document Stage
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Typography applied: {config.fontFamily.toUpperCase()} · {config.baseFontSize} ·{" "}
                  {config.lineSpacing}x spacing · {config.margins} margins
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="glass" size="sm" onClick={() => setStep(2)} className="text-xs">
                <Sliders className="h-3.5 w-3.5 mr-1" /> Adjust Styles
              </Button>
              <Button variant="glass" size="sm" onClick={handlePrintPreview} className="text-xs">
                <Printer className="h-3.5 w-3.5 mr-1" /> Print / Save PDF
              </Button>
              <Button
                variant="hero"
                size="sm"
                onClick={handleExportDocx}
                className="text-xs gap-1.5"
              >
                <Download className="h-3.5 w-3.5" /> Download Editable (.DOC)
              </Button>
            </div>
          </div>

          {/* Preview Viewport Switcher & Paper Mode */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Document View Switcher */}
            <div className="flex rounded-lg border border-border bg-surface-2 p-1 text-xs font-medium">
              <button
                type="button"
                onClick={() => setPreviewPage("full")}
                className={`rounded-md px-3 py-1 transition-all ${
                  previewPage === "full"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Full Document
              </button>
              <button
                type="button"
                onClick={() => setPreviewPage("body")}
                className={`rounded-md px-3 py-1 transition-all ${
                  previewPage === "body"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Body Only
              </button>
              {config.includeToc && (
                <button
                  type="button"
                  onClick={() => setPreviewPage("toc")}
                  className={`rounded-md px-3 py-1 transition-all ${
                    previewPage === "toc"
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Table of Contents
                </button>
              )}
              {config.hasCoverPage && (
                <button
                  type="button"
                  onClick={() => setPreviewPage("cover")}
                  className={`rounded-md px-3 py-1 transition-all ${
                    previewPage === "cover"
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Cover Page
                </button>
              )}
            </div>

            {/* Layout Archetype Switcher on Preview Stage */}
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-border bg-surface-2 p-1 text-xs font-medium">
                {[
                  { id: "executive", label: "Executive Styled" },
                  { id: "creative", label: "Production Brief" },
                  { id: "academic", label: "Classic Academic" },
                ].map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        layoutArchetype: a.id as FormattingConfig["layoutArchetype"],
                      }))
                    }
                    className={`rounded-md px-2.5 py-1 transition-all ${
                      config.layoutArchetype === a.id
                        ? "bg-card text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>

              <div className="flex rounded-lg border border-border bg-surface-2 p-1 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setPaperMode("standard")}
                  className={`rounded-md px-2.5 py-1 transition-all ${
                    paperMode === "standard"
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Print White Paper
                </button>
                <button
                  type="button"
                  onClick={() => setPaperMode("dark")}
                  className={`rounded-md px-2.5 py-1 transition-all ${
                    paperMode === "dark"
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Dark Canvas
                </button>
              </div>

              <Button
                variant="glass"
                size="sm"
                onClick={autoPolishText}
                className="text-xs h-7 gap-1 text-primary"
                title="Optimize titles, headings, and hierarchy"
              >
                <Wand2 className="h-3 w-3" /> Auto-Polish
              </Button>
            </div>
          </div>

          {/* Fluid Modern Document Reading Canvas (Responsive, not rigid A4) */}
          <div className="flex justify-center py-2 bg-surface-2/30 rounded-2xl border border-border p-3 sm:p-6 lg:p-8">
            <div
              className={`w-full max-w-4xl min-h-0 rounded-2xl border border-border bg-card p-6 sm:p-10 md:p-14 shadow-paper flex flex-col justify-between transition-all ${
                paperMode === "dark"
                  ? "bg-zinc-900 border-zinc-700/60 text-zinc-100 shadow-black/50"
                  : "bg-white border-stone-200 text-stone-900 shadow-paper"
              } ${
                config.fontFamily === "serif"
                  ? "font-serif"
                  : config.fontFamily === "mono"
                    ? "font-mono"
                    : "font-sans"
              }`}
              style={{
                lineHeight: config.lineSpacing,
              }}
            >
              {/* ================= COVER PAGE PREVIEW ================= */}
              {previewPage === "cover" && (
                <div className="flex-1 flex flex-col justify-between py-8 text-center sm:text-left space-y-6">
                  <div className="space-y-3 pb-6">
                    {config.institution && config.institution !== "Academic / Professional Department" && (
                      <p className="text-xs uppercase tracking-widest font-sans font-semibold text-primary">
                        {config.institution}
                      </p>
                    )}
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight text-foreground">
                      {config.docTitle}
                    </h1>
                    {config.docSubtitle && (
                      <p className="text-base sm:text-lg font-normal italic mt-2 text-muted-foreground">
                        {config.docSubtitle}
                      </p>
                    )}
                  </div>

                  <div className="my-8 space-y-3">
                    <div className="inline-block rounded-lg border border-border bg-surface-2 px-4 py-2 font-mono text-xs text-muted-foreground">
                      Standardized Format Blueprint · {config.coverStyle.toUpperCase()} SPEC
                    </div>
                  </div>

                  <div className="pt-4 text-xs space-y-1.5 font-sans text-muted-foreground">
                    {config.authorName && config.authorName !== "Author / Researcher" && (
                      <p>
                        <strong className="text-foreground">Author:</strong> {config.authorName}
                      </p>
                    )}
                    {config.institution && config.institution !== "Academic / Professional Department" && (
                      <p>
                        <strong className="text-foreground">Institution:</strong> {config.institution}
                      </p>
                    )}
                    <p>
                      <strong className="text-foreground">Date:</strong> {config.dateStr}
                    </p>
                  </div>
                </div>
              )}

              {/* ================= TABLE OF CONTENTS PREVIEW ================= */}
              {previewPage === "toc" && (
                <div className="flex-1 flex flex-col">
                  {/* Running Header */}
                  {config.headerText && (
                    <div className="flex items-center justify-between text-[11px] pb-2 mb-6 font-sans text-muted-foreground">
                      <span>{config.headerText}</span>
                      <span>Preliminary Section</span>
                    </div>
                  )}

                  <h2 className="text-2xl font-bold mb-6 tracking-tight text-foreground">
                    Table of Contents
                  </h2>

                  <div className="space-y-3 text-sm">
                    {parseDocumentSections(rawText, config.headingNumbering)
                      .slice(0, 10)
                      .map((item, idx) => (
                        <div
                          key={idx}
                          className={`flex items-baseline justify-between ${
                            item.level > 1
                              ? "pl-6 text-xs text-muted-foreground"
                              : "font-semibold text-foreground"
                          }`}
                        >
                          <div className="flex items-baseline gap-2 max-w-[80%] truncate">
                            <span className="font-mono text-xs text-muted-foreground">
                              {item.numberStr.trim() || `0${idx + 1}`}
                            </span>
                            <span className="text-foreground">
                              {item.title}
                            </span>
                          </div>
                          {config.tocDotLeaders && (
                            <div className="flex-1 mx-3 border-b border-dotted border-border/40" />
                          )}
                          <span className="font-mono text-xs text-muted-foreground">
                            {3 + idx}
                          </span>
                        </div>
                      ))}
                  </div>

                  <div className="mt-auto pt-6 text-center font-mono text-xs text-muted-foreground">
                    ii
                  </div>
                </div>
              )}

              {/* ================= BODY & HEADINGS / FULL DOCUMENT PREVIEW ================= */}
              {(previewPage === "body" || previewPage === "full") && (
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    {/* Running Header */}
                    {config.headerText && (
                      <div className="flex items-center justify-between text-[11px] mb-6 font-sans text-muted-foreground">
                        <span className="truncate max-w-[60%]">{config.headerText}</span>
                        <span>
                          {config.layoutArchetype === "creative"
                            ? "Production Specification"
                            : config.layoutArchetype === "tech-spec"
                              ? "Architecture RFC"
                              : "Document Workspace"}
                        </span>
                      </div>
                    )}

                    {/* Document Header (Clean, modern, NO horizontal lines) */}
                    <div className="mb-8 space-y-3">
                      {config.institution &&
                        config.institution !== "Academic / Professional Department" && (
                          <div className="mb-2">
                            <span className="font-mono text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-primary/10 text-primary">
                              {config.institution}
                            </span>
                          </div>
                        )}

                      <h1 className="font-serif text-2xl sm:text-4xl font-bold tracking-tight leading-tight text-foreground">
                        {config.docTitle}
                      </h1>

                      {config.docSubtitle &&
                        config.docSubtitle !== "Executive Analysis and Implementation Report" && (
                          <p className="text-sm sm:text-base text-muted-foreground font-normal">
                            {config.docSubtitle}
                          </p>
                        )}

                      {/* Clean metadata chip row only if real author or date provided */}
                      {((config.authorName && config.authorName !== "Author / Researcher") ||
                        (config.dateStr && config.dateStr !== "October 2026")) && (
                        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground font-sans">
                          {config.authorName && config.authorName !== "Author / Researcher" && (
                            <span className="font-medium text-foreground">By {config.authorName}</span>
                          )}
                          {config.dateStr && <span>{config.dateStr}</span>}
                        </div>
                      )}
                    </div>

                    {/* Integrated Table of Contents in Full Document mode */}
                    {previewPage === "full" && config.includeToc && (
                      <div className="mb-8 rounded-xl bg-surface-2/40 border border-border/60 p-5 text-sm space-y-2.5">
                        <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                          Table of Contents
                        </span>
                        {parseDocumentSections(rawText, config.headingNumbering).map((sec, idx) => (
                          <div
                            key={idx}
                            className={`flex items-baseline justify-between ${
                              sec.level > 1
                                ? "pl-4 text-xs text-muted-foreground"
                                : "font-semibold text-foreground text-xs sm:text-sm"
                            }`}
                          >
                            <div className="flex items-baseline gap-2">
                              {sec.numberStr && (
                                <span className="font-mono text-xs text-primary font-bold">
                                  {sec.numberStr}
                                </span>
                              )}
                              <span>{sec.title}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Body content with heading hierarchy and executive editorial blocks */}
                    <div className="space-y-6">
                      {parseDocumentSections(rawText, config.headingNumbering).map((sec, sIdx) => (
                        <div key={sIdx} className="space-y-3">
                          {sec.level === 1 && (
                            <div className="pt-4 mb-2">
                              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-baseline gap-2">
                                {sec.numberStr && (
                                  <span className="font-mono text-base text-primary font-bold shrink-0">
                                    {sec.numberStr}
                                  </span>
                                )}
                                <span>{sec.title}</span>
                              </h2>
                            </div>
                          )}
                          {sec.level === 2 && (
                            <div className="pt-3 mb-1">
                              <h3 className="text-base sm:text-lg font-semibold tracking-tight text-foreground flex items-baseline gap-2">
                                {sec.numberStr && (
                                  <span className="font-mono text-xs sm:text-sm text-primary font-semibold shrink-0">
                                    {sec.numberStr}
                                  </span>
                                )}
                                <span>{sec.title}</span>
                              </h3>
                            </div>
                          )}
                          {sec.level === 3 && (
                            <div className="pt-2">
                              <h4 className="text-xs sm:text-sm font-semibold italic text-foreground/90 flex items-baseline gap-2">
                                {sec.numberStr && (
                                  <span className="font-mono text-xs text-muted-foreground shrink-0">
                                    {sec.numberStr}
                                  </span>
                                )}
                                <span>{sec.title}</span>
                              </h4>
                            </div>
                          )}

                          {/* Render styled blocks if in executive / creative / tech-spec mode */}
                          {config.layoutArchetype !== "academic" ? (
                            <div className="space-y-2.5">
                              {sec.blocks.map((block, bIdx) => (
                                <div key={bIdx}>
                                  {block.type === "lead" && (
                                    <p
                                      className={`text-sm sm:text-base font-medium leading-relaxed my-2 ${
                                        paperMode === "dark" ? "text-zinc-100" : "text-stone-900"
                                      }`}
                                    >
                                      {block.content}
                                    </p>
                                  )}

                                  {block.type === "callout" && (
                                    <div
                                      className={`my-3 rounded-xl border p-4 transition-all ${
                                        paperMode === "dark"
                                          ? block.calloutType === "critical"
                                            ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
                                            : "border-blue-500/40 bg-blue-500/10 text-blue-100"
                                          : block.calloutType === "critical"
                                            ? "border-amber-300 bg-amber-50/90 text-amber-950 shadow-xs"
                                            : "border-primary/20 bg-primary/5 text-foreground shadow-xs"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 mb-1.5 font-semibold text-xs uppercase tracking-wider">
                                        {block.calloutType === "critical" ? (
                                          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                        ) : (
                                          <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                                        )}
                                        <span>{block.calloutTitle || "Requirement Guardrail"}</span>
                                      </div>
                                      <p className="text-xs sm:text-sm leading-relaxed">{block.content}</p>
                                    </div>
                                  )}

                                  {block.type === "palette" && (
                                    <div
                                      className={`my-3 rounded-xl border p-4 ${
                                        paperMode === "dark"
                                          ? "border-zinc-800 bg-zinc-900/60"
                                          : "border-stone-200 bg-stone-50"
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
                                        <Palette className="h-3.5 w-3.5 text-primary" />
                                        <span>Brand & Design Color Tokens</span>
                                      </div>
                                      <div className="flex flex-wrap gap-2.5">
                                        {block.colors?.map((c, cIdx) => (
                                          <div
                                            key={cIdx}
                                            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-mono shadow-xs ${
                                              paperMode === "dark"
                                                ? "border-zinc-700 bg-zinc-800"
                                                : "border-stone-200 bg-white"
                                            }`}
                                          >
                                            <span
                                              className="h-4 w-4 rounded-full border border-black/20 shadow-xs shrink-0"
                                              style={{ backgroundColor: c.hex }}
                                            />
                                            <div className="flex flex-col text-left">
                                              <span className="font-sans font-semibold text-[11px] leading-tight text-foreground">
                                                {c.name}
                                              </span>
                                              <span className="text-[10px] text-muted-foreground">
                                                {c.hex}
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                      {block.content && (
                                        <p className="text-xs text-muted-foreground mt-2 italic">
                                          {block.content}
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  {block.type === "scene" && (
                                    <div
                                      className={`my-4 rounded-xl border overflow-hidden ${
                                        paperMode === "dark"
                                          ? "border-zinc-800 bg-zinc-900/80"
                                          : "border-stone-200 bg-white shadow-xs"
                                      }`}
                                    >
                                      <div
                                        className={`flex items-center justify-between px-4 py-2.5 border-b ${
                                          paperMode === "dark"
                                            ? "border-zinc-800 bg-zinc-800/50"
                                            : "border-stone-100 bg-stone-50/80"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="rounded-md bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 font-mono text-[10px] font-bold">
                                            SCENE {block.sceneMeta?.sceneNumber || "1"}
                                          </span>
                                          <span className="font-semibold text-xs sm:text-sm text-foreground">
                                            {block.sceneMeta?.title || "Storyboard Scene"}
                                          </span>
                                        </div>
                                        {block.sceneMeta?.timestamp && (
                                          <span className="rounded-full bg-surface-2 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground border border-border flex items-center gap-1">
                                            <Clock className="h-3 w-3 text-primary" />
                                            <span>{block.sceneMeta.timestamp}</span>
                                          </span>
                                        )}
                                      </div>
                                      <div className="p-4 space-y-3 text-xs sm:text-sm">
                                        {block.sceneMeta?.visual && (
                                          <div className="flex items-start gap-2.5">
                                            <span className="mt-0.5 rounded p-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                                              <Video className="h-3.5 w-3.5" />
                                            </span>
                                            <div>
                                              <strong className="text-foreground">Visual Cue: </strong>
                                              <span className="text-muted-foreground">
                                                {block.sceneMeta.visual}
                                              </span>
                                            </div>
                                          </div>
                                        )}
                                        {block.sceneMeta?.audio && (
                                          <div className="flex items-start gap-2.5">
                                            <span className="mt-0.5 rounded p-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                                              <Volume2 className="h-3.5 w-3.5" />
                                            </span>
                                            <div>
                                              <strong className="text-foreground">Audio / Voiceover: </strong>
                                              <span className="italic text-muted-foreground">
                                                "{block.sceneMeta.audio}"
                                              </span>
                                            </div>
                                          </div>
                                        )}
                                        {block.sceneMeta?.textOverlay && (
                                          <div className="flex items-start gap-2.5">
                                            <span className="mt-0.5 rounded p-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                                              <Type className="h-3.5 w-3.5" />
                                            </span>
                                            <div>
                                              <strong className="text-foreground">On-Screen Text: </strong>
                                              <span className="font-mono text-xs text-muted-foreground">
                                                {block.sceneMeta.textOverlay}
                                              </span>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {block.type === "parameter" && (
                                    <div
                                      className={`my-1.5 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs shadow-xs ${
                                        paperMode === "dark"
                                          ? "border-zinc-800 bg-zinc-800/60"
                                          : "border-stone-200 bg-stone-50"
                                      }`}
                                    >
                                      <span className="font-semibold text-primary">{block.key}:</span>
                                      <span className="text-foreground">{block.value}</span>
                                    </div>
                                  )}

                                  {block.type === "list" && (
                                    <ul className="my-2.5 space-y-1.5 pl-2">
                                      {block.listItems?.map((li, lIdx) => (
                                        <li key={lIdx} className="flex items-start gap-2 text-xs sm:text-sm">
                                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                                          <span className="leading-relaxed text-foreground">{li}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}

                                  {block.type === "paragraph" && (
                                    <p
                                      className={`text-sm leading-relaxed text-justify ${
                                        paperMode === "dark" ? "text-zinc-200" : "text-stone-800"
                                      }`}
                                    >
                                      {renderRichInline(block.content)}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            /* Academic manuscript mode: formatted standard paragraphs */
                            <div className="space-y-3">
                              {sec.paragraphs.map((p, pIdx) => (
                                <p
                                  key={pIdx}
                                  className={`text-sm leading-relaxed text-justify ${
                                    paperMode === "dark" ? "text-zinc-200" : "text-stone-800"
                                  }`}
                                >
                                  {renderRichInline(p)}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Document Footer (Clean, no horizontal line) */}
                  <div
                    className={`mt-10 pt-4 font-mono text-xs flex items-center justify-between ${
                      paperMode === "dark" ? "text-zinc-400" : "text-stone-500"
                    }`}
                  >
                    <span>DocuMind Studio · Formatted Document</span>
                    <span>
                      {config.pageNumberFormat === "page-x-of-y" ? "Continuous Reading View" : "1"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Export Action Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-paper flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-serif text-base font-bold text-foreground">
                Ready to download your formatted document?
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Export directly to editable Word (.doc) with full styling tokens or invoke print-to-PDF with clean vector typography.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="glass" onClick={handleCopyFormattedText} className="gap-1.5 text-xs">
                <Copy className="h-3.5 w-3.5" /> Copy Text
              </Button>
              <Button variant="hero" onClick={handleExportDocx} className="gap-2 text-xs">
                <Download className="h-4 w-4" /> Download Editable Document
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Generates clean, standalone styled HTML document suitable for Word or Print-to-PDF
 */
function generateFormattedHtml(rawText: string, config: FormattingConfig): string {
  const fontCss =
    config.fontFamily === "serif"
      ? "'Newsreader', 'Georgia', serif"
      : config.fontFamily === "mono"
        ? "'JetBrains Mono', monospace"
        : "'Manrope', 'Helvetica Neue', sans-serif";

  const sections = parseDocumentSections(rawText, config.headingNumbering);

  const bodyHtml = sections
    .map((sec) => {
      let secHtml = "";
      if (sec.level === 1) {
        secHtml += `<h1 style="font-size: 1.6rem; font-weight: bold; margin-top: 2rem; margin-bottom: 0.8rem; color: #0f172a;">${escapeHtml(sec.numberStr)}${escapeHtml(sec.title)}</h1>`;
      } else if (sec.level === 2) {
        secHtml += `<h2 style="font-size: 1.25rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.6rem; color: #1e293b;">${escapeHtml(sec.numberStr)}${escapeHtml(sec.title)}</h2>`;
      } else {
        secHtml += `<h3 style="font-size: 1.05rem; font-style: italic; margin-top: 1.2rem; margin-bottom: 0.4rem; color: #334155;">${escapeHtml(sec.numberStr)}${escapeHtml(sec.title)}</h3>`;
      }

      if (config.layoutArchetype === "academic") {
        for (const p of sec.paragraphs) {
          secHtml += `<p style="margin-bottom: 0.9rem; text-indent: 1.5em; text-align: justify; line-height: ${config.lineSpacing};">${escapeHtml(p)}</p>`;
        }
      } else {
        for (const block of sec.blocks) {
          if (block.type === "lead") {
            secHtml += `<p style="font-size: 1.15rem; font-weight: 500; line-height: 1.6; margin-bottom: 0.9rem; color: #0f172a;">${escapeHtml(block.content)}</p>`;
          } else if (block.type === "callout") {
            const isCrit = block.calloutType === "critical";
            const borderCol = isCrit ? "#f59e0b" : "#0284c7";
            const bgCol = isCrit ? "#fffbeb" : "#f0f9ff";
            const titleCol = isCrit ? "#b45309" : "#0369a1";
            secHtml += `<div style="margin: 14px 0; padding: 12px 16px; border-left: 4px solid ${borderCol}; background-color: ${bgCol}; border-radius: 6px;">
              <div style="font-size: 10pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: ${titleCol}; margin-bottom: 4px;">
                ${escapeHtml(block.calloutTitle || "Requirement Guardrail")}
              </div>
              <p style="margin: 0; font-size: 10.5pt; line-height: 1.5; color: #1e293b;">${escapeHtml(block.content)}</p>
            </div>`;
          } else if (block.type === "palette") {
            secHtml += `<div style="margin: 14px 0; padding: 12px 16px; border: 1px solid #e2e8f0; background-color: #f8fafc; border-radius: 8px;">
              <div style="font-size: 9.5pt; font-weight: bold; text-transform: uppercase; color: #64748b; letter-spacing: 1px; margin-bottom: 8px;">
                Brand & Design Color Tokens
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 8px;">`;
            for (const c of block.colors || []) {
              secHtml += `<div style="display: inline-flex; align-items: center; border: 1px solid #cbd5e1; background: #fff; padding: 4px 10px; border-radius: 6px; font-size: 9pt; margin-right: 6px; margin-bottom: 6px;">
                <span style="display: inline-block; width: 14px; height: 14px; border-radius: 50%; background-color: ${c.hex}; border: 1px solid rgba(0,0,0,0.2); margin-right: 6px;"></span>
                <span><strong>${escapeHtml(c.name)}</strong> <span style="color: #64748b; font-family: monospace;">(${c.hex})</span></span>
              </div>`;
            }
            secHtml += `</div>
              ${block.content ? `<p style="margin: 8px 0 0 0; font-size: 9.5pt; color: #64748b; font-style: italic;">${escapeHtml(block.content)}</p>` : ""}
            </div>`;
          } else if (block.type === "scene") {
            secHtml += `<div style="margin: 16px 0; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background-color: #fff;">
              <div style="background-color: #f1f5f9; padding: 8px 12px; font-weight: bold; font-size: 11pt; border-bottom: 1px solid #cbd5e1; display: flex; justify-content: space-between;">
                <span>SCENE ${escapeHtml(block.sceneMeta?.sceneNumber || "1")}: ${escapeHtml(block.sceneMeta?.title || "Storyboard Scene")}</span>
                ${block.sceneMeta?.timestamp ? `<span style="font-size: 9pt; color: #64748b; font-family: monospace;">⏱ ${escapeHtml(block.sceneMeta.timestamp)}</span>` : ""}
              </div>
              <div style="padding: 12px; font-size: 10.5pt; line-height: 1.5;">
                ${block.sceneMeta?.visual ? `<div style="margin-bottom: 6px;"><strong style="color: #0284c7;">Visual:</strong> ${escapeHtml(block.sceneMeta.visual)}</div>` : ""}
                ${block.sceneMeta?.audio ? `<div style="margin-bottom: 6px;"><strong style="color: #d97706;">Audio:</strong> <span style="font-style: italic;">"${escapeHtml(block.sceneMeta.audio)}"</span></div>` : ""}
                ${block.sceneMeta?.textOverlay ? `<div><strong style="color: #059669;">On-Screen Text:</strong> <span style="font-family: monospace;">${escapeHtml(block.sceneMeta.textOverlay)}</span></div>` : ""}
              </div>
            </div>`;
          } else if (block.type === "parameter") {
            secHtml += `<div style="display: inline-block; margin: 4px 6px 4px 0; padding: 4px 10px; background-color: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 9.5pt;">
              <strong style="color: #0284c7;">${escapeHtml(block.key)}:</strong> ${escapeHtml(block.value)}
            </div>`;
          } else if (block.type === "list") {
            secHtml += `<ul style="margin: 8px 0; padding-left: 20px;">`;
            for (const item of block.listItems || []) {
              secHtml += `<li style="margin-bottom: 4px; line-height: 1.5;">${escapeHtml(item)}</li>`;
            }
            secHtml += `</ul>`;
          } else {
            secHtml += `<p style="margin-bottom: 0.9rem; text-align: justify; line-height: ${config.lineSpacing};">${escapeHtml(block.content)}</p>`;
          }
        }
      }
      return secHtml;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(config.docTitle)}</title>
<style>
  @page {
    margin: 1in;
    @top-right { content: "${escapeHtml(config.headerText)}"; font-size: 9pt; }
    @bottom-center { content: counter(page); font-size: 9pt; }
  }
  body {
    font-family: ${fontCss};
    font-size: ${config.baseFontSize};
    line-height: ${config.lineSpacing};
    color: #1a1a1a;
    max-width: 7.5in;
    margin: 0 auto;
    padding: 2rem 1rem;
  }
  .cover {
    page-break-after: always;
    min-height: 70vh;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    text-align: left;
    padding-bottom: 2rem;
  }
  .title { font-size: 2.4rem; font-weight: bold; margin-bottom: 0.5rem; }
  .subtitle { font-size: 1.2rem; color: #555; font-style: italic; margin-bottom: 2rem; }
  .meta { font-size: 0.9rem; color: #444; }
  .toc { page-break-after: always; margin-top: 2rem; }
  .header-rule { padding-bottom: 6px; margin-bottom: 24px; font-size: 9pt; color: #777; display: flex; justify-content: space-between; }
</style>
</head>
<body>
  ${
    config.hasCoverPage
      ? `<div class="cover">
    <div>
      <p style="text-transform: uppercase; letter-spacing: 2px; font-size: 10pt; color: #666;">${escapeHtml(config.institution)}</p>
      <h1 class="title">${escapeHtml(config.docTitle)}</h1>
      <p class="subtitle">${escapeHtml(config.docSubtitle)}</p>
    </div>
    <div class="meta">
      <p><strong>Author:</strong> ${escapeHtml(config.authorName)}</p>
      <p><strong>Date:</strong> ${escapeHtml(config.dateStr)}</p>
      <p><strong>Institution:</strong> ${escapeHtml(config.institution)}</p>
    </div>
  </div>`
      : ""
  }

  <div class="header-rule">
    <span>${escapeHtml(config.headerText)}</span>
    <span>DocuMind Executive Technical Report Series</span>
  </div>

  <div class="body-content">
    ${bodyHtml}
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
