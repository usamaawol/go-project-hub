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
  GraduationCap,
  Edit3,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { extractDocumentText } from "@/lib/api-client";
import type { AssignmentMetadata } from "@/lib/assignment-types";
import { getDefaultAssignmentMetadata, COVER_TEMPLATES } from "@/lib/assignment-types";
import { extractAssignmentMetadataFromText } from "@/lib/assignment-metadata-extractor";
import { AssignmentInformationForm } from "@/components/workspace/AssignmentInformationForm";
import { CoverTemplateGallery } from "@/components/workspace/CoverTemplateGallery";
import { AssignmentCoverRenderer } from "@/components/workspace/AssignmentCoverRenderer";
import { generateAssignmentCoverHtml } from "@/lib/assignment-document-renderer";


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

  // Academic Assignment Mode
  assignmentMetadata?: AssignmentMetadata;

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

export interface DocTableData {
  headers?: string[];
  rows: string[][];
}

export interface DocBlock {
  type: "paragraph" | "lead" | "callout" | "parameter" | "palette" | "scene" | "list" | "table" | "image";
  content: string;
  calloutType?: "critical" | "warning" | "note" | "requirement";
  calloutTitle?: string;
  key?: string;
  value?: string;
  listItems?: string[];
  colors?: DocColor[];
  sceneMeta?: DocSceneMeta;
  tableData?: DocTableData;
  imageUrl?: string;
  imageAlt?: string;
}

export interface DocSection {
  level: 1 | 2 | 3;
  numberStr: string;
  title: string;
  paragraphs: string[];
  blocks: DocBlock[];
  pageNumber?: number;
  sectionIndex?: number;
}

export function renderRichInline(text: string) {
  if (!text) return null;

  // Single standalone markdown link or image check: e.g. [Golden Eagle at Sunrise](https://images.openai.com/...)
  const singleMatch = text.match(/^!?\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
  if (singleMatch) {
    const label = singleMatch[1] || "";
    const url = singleMatch[2] || "";
    const isImage =
      text.startsWith("!") ||
      /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(url) ||
      /images\.openai\.com/i.test(url);
    if (isImage) {
      return (
        <span className="block my-3 text-center">
          <img
            src={url}
            alt={label}
            className="mx-auto max-h-72 max-w-full rounded-lg object-contain shadow-xs border border-border/40"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
          {label && (
            <span className="block text-[11px] text-muted-foreground mt-1.5 italic">
              {label}
            </span>
          )}
        </span>
      );
    }
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline font-medium inline-flex items-center gap-1"
      >
        <span>{label || url}</span>
      </a>
    );
  }

  // Tokenize string with regex for bold, inline code, italic, images, and links
  const tokens = text.split(
    /(!?\[[^\]]+\]\(https?:\/\/[^\s)]+\)|\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g,
  );
  return tokens.map((token, i) => {
    if (!token) return null;
    const linkMatch = token.match(/^(!)?\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (linkMatch) {
      const isImg =
        linkMatch[1] === "!" ||
        /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(linkMatch[3]!) ||
        /images\.openai\.com/i.test(linkMatch[3]!);
      if (isImg) {
        return (
          <img
            key={i}
            src={linkMatch[3]}
            alt={linkMatch[2]}
            className="inline-block max-h-48 max-w-full rounded my-1 shadow-xs"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
        );
      }
      return (
        <a
          key={i}
          href={linkMatch[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline font-medium break-all"
        >
          {linkMatch[2]}
        </a>
      );
    }
    if (token.startsWith("**") && token.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-foreground">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith("`") && token.endsWith("`")) {
      return (
        <code
          key={i}
          className="font-mono text-xs px-1.5 py-0.5 rounded bg-surface-2 text-primary font-semibold"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    if (token.startsWith("*") && token.endsWith("*")) {
      return (
        <em key={i} className="italic text-foreground/90">
          {token.slice(1, -1)}
        </em>
      );
    }
    return token;
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

    // 0. Markdown table detection (e.g. | Founders | The four people... |)
    if (/^\s*\|.+?\|\s*$/.test(line)) {
      flushList();
      const tableLines: string[] = [];
      let j = i;
      while (j < lines.length && /^\s*\|.+?\|\s*$/.test(lines[j]!.trim())) {
        tableLines.push(lines[j]!.trim());
        j++;
      }
      i = j - 1;

      const rawRows = tableLines.map((tl) =>
        tl
          .replace(/^\|\s*/, "")
          .replace(/\s*\|$/, "")
          .split("|")
          .map((c) => c.trim()),
      );

      let headers: string[] | undefined = undefined;
      let rows: string[][] = [];

      if (
        rawRows.length >= 2 &&
        tableLines[1] &&
        /^\|?\s*[-:]+[-| :]*\|?$/.test(tableLines[1])
      ) {
        headers = rawRows[0];
        rows = rawRows.slice(2);
      } else {
        rows = rawRows;
      }

      blocks.push({
        type: "table",
        content: tableLines.join("\n"),
        tableData: {
          headers,
          rows,
        },
      });
      continue;
    }

    // 0b. Standalone image or citation check: e.g. [Golden Eagle at Sunrise](https://images.openai.com/...)
    const imgMatch = line.match(/^!?\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (imgMatch) {
      flushList();
      const label = imgMatch[1]!;
      const url = imgMatch[2]!;
      const isImg =
        line.startsWith("!") ||
        /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(url) ||
        /images\.openai\.com/i.test(url);
      if (isImg) {
        blocks.push({
          type: "image",
          content: line,
          imageUrl: url,
          imageAlt: label,
        });
        continue;
      }
    }

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
        key: "Visual",
        value: standaloneVisual[1],
      });
      continue;
    }
    if (standaloneAudio) {
      blocks.push({
        type: "parameter",
        content: line,
        key: "Audio",
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
      const prefix = line.match(/^(CRITICAL|IMPORTANT|NOTE|WARNING|REQUIREMENT|CONTINUITY REQUIREMENT|GUARDRAIL)/i)?.[1] || "NOTE";
      blocks.push({
        type: "callout",
        content: calloutMatch ? calloutMatch[1] || line : line,
        calloutType: isCritical ? "critical" : "requirement",
        calloutTitle: prefix.toUpperCase(),
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
  headingNumbering: "decimal" | "roman" | "none" = "none",
): DocSection[] {
  if (!text || typeof text !== "string" || !text.trim()) {
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
    if (!line || line.length > 140) return { isHeader: false, level: 1, cleanTitle: "" };

    // Markdown headers
    if (line.startsWith("###")) {
      return { isHeader: true, level: 3, cleanTitle: line.replace(/^###\s*/, "").trim() };
    }
    if (line.startsWith("##")) {
      return { isHeader: true, level: 2, cleanTitle: line.replace(/^##\s*/, "").trim() };
    }
    if (line.startsWith("#")) {
      return { isHeader: true, level: 1, cleanTitle: line.replace(/^#\s*/, "").trim() };
    }

    // Numbered headings like "1.0 Title", "1. Title", "2.1 Subtitle", "2.1.1 Detail", "4. The six-chapter structure"
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
      if (headingNumbering === "none") {
        return { isHeader: true, level: lvl, cleanTitle: line.trim() };
      }
      const clean = numMatch[2].replace(/^(\d+[\s.)-]+\s*|[A-Z]\.[\s.)-]+\s*)/, "").trim();
      return { isHeader: true, level: lvl, cleanTitle: clean || numMatch[2].trim() };
    }

    // Chapter or Section heading: e.g. "Chapter 1 — Our Identity and Foundation"
    const chapterMatch = line.match(/^(?:Chapter\s+\d+|Section\s+\d+)\b/i);
    if (chapterMatch && line.length < 90 && !line.endsWith(".")) {
      return { isHeader: true, level: 2, cleanTitle: line.trim() };
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
      return { isHeader: true, level: 2, cleanTitle: line.replace(/:$/, "").trim() };
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
        const isVideoSpec = text.toLowerCase().includes("promotional video");
        const pBlocks = parseLinesToBlocks(preamble, isVideoSpec ? "Introduction & Context" : "", true);
        sections.push({
          level: 1,
          numberStr: headingNumbering === "decimal" && isVideoSpec ? "1.0 " : "",
          title: isVideoSpec ? "Introduction & Context" : "",
          paragraphs: preamble,
          blocks: pBlocks,
        });
        if (isVideoSpec) {
          sectionCounter = 1;
        }
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

      let numStr = "";
      if (headingNumbering === "decimal") {
        const alreadyHasNumber = /^(\d+[\s.)-]|Chapter\s+\d+|Section\s+\d+)/i.test(check.cleanTitle);
        if (!alreadyHasNumber) {
          numStr =
            check.level === 1
              ? `${sectionCounter}.0 `
              : check.level === 2
                ? `${sectionCounter}.${subSectionCounter} `
                : `${sectionCounter}.${subSectionCounter}.${subSubCounter} `;
        }
      } else if (headingNumbering === "roman") {
        const alreadyHasNumber = /^(\d+[\s.)-]|[IVXLCDM]+[\s.)-]|Chapter\s+\d+)/i.test(check.cleanTitle);
        if (!alreadyHasNumber) {
          numStr =
            check.level === 1
              ? `${["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][sectionCounter - 1] || sectionCounter}. `
              : check.level === 2
                ? `${String.fromCharCode(64 + subSectionCounter)}. `
                : `${subSubCounter}. `;
        }
      }

      currentSec = {
        level: check.level,
        numberStr: numStr,
        title: check.cleanTitle,
        lines: [],
      };
    } else {
      if (!currentSec) {
        sectionCounter = 1;
        const isVideoSpec = text.toLowerCase().includes("promotional video");
        currentSec = {
          level: 1,
          numberStr: headingNumbering === "decimal" && isVideoSpec ? "1.0 " : "",
          title: isVideoSpec ? "Introduction & Context" : "",
          lines: [],
        };
      }
      currentSec.lines.push(line);
    }
  }

  pushCurrentSec();

  return sections;
}

export interface DocA4SectionItem {
  sectionIndex: number;
  title: string;
  level: 1 | 2 | 3;
  numberStr: string;
  renderHeading: boolean;
  blocks: DocBlock[];
}

export interface DocA4Page {
  pageNumber: number;
  totalPages: number;
  isCover?: boolean;
  isToc?: boolean;
  isFirstBodyPage?: boolean;
  tocItems?: DocSection[];
  tocPart?: number;
  tocTotalParts?: number;
  sections: DocA4SectionItem[];
}

export function paginateSectionsIntoA4Pages(
  sections: DocSection[],
  config: FormattingConfig,
): DocA4Page[] {
  if (!sections || !Array.isArray(sections)) {
    return [];
  }
  const PAGE_CAPACITY = 740; // Strict standard A4 printable height budget (safely under 1123px)

  const pages: DocA4Page[] = [];
  let currentPageNumber = 1;

  // 1. Cover Page
  if (config.hasCoverPage) {
    pages.push({
      pageNumber: currentPageNumber,
      totalPages: 1,
      isCover: true,
      sections: [],
    });
    currentPageNumber++;
  }

  // 2. Dedicated Table of Contents Page(s)
  // When TOC is enabled, paginate TOC evenly into dedicated A4 page(s) (approx 24 topics per sheet)
  if (config.includeToc) {
    const tocItems = sections.filter(
      (s) => Boolean(s.title) && (s.level <= (config.tocLevels || 3)),
    );
    if (tocItems.length > 0) {
      const targetItemsPerPage = 24;
      const totalTocPages = Math.max(1, Math.ceil(tocItems.length / targetItemsPerPage));
      const itemsPerPage = Math.ceil(tocItems.length / totalTocPages);

      let remaining = [...tocItems];
      let tocPart = 1;

      while (remaining.length > 0) {
        const pageItems = remaining.slice(0, itemsPerPage);
        remaining = remaining.slice(itemsPerPage);

        pages.push({
          pageNumber: currentPageNumber,
          totalPages: 1,
          isToc: true,
          tocItems: pageItems,
          tocPart,
          tocTotalParts: totalTocPages,
          sections: [],
        });
        currentPageNumber++;
        tocPart++;
      }
    }
  }

  // 3. Paginate body sections
  let currentHeight = 0;
  let isFirstBodyPage = true;

  // Calculate Document Header height on first body page
  let docHeaderHeight = 110;
  if (config.institution) docHeaderHeight += 30;
  if (config.docSubtitle) docHeaderHeight += 30;
  if (config.authorName || config.dateStr) docHeaderHeight += 30;
  currentHeight += docHeaderHeight;

  let currentSectionsOnPage: DocA4SectionItem[] = [];

  const startNewPage = () => {
    pages.push({
      pageNumber: currentPageNumber,
      totalPages: 1,
      isFirstBodyPage: isFirstBodyPage,
      sections: currentSectionsOnPage,
    });
    currentPageNumber++;
    isFirstBodyPage = false;
    currentSectionsOnPage = [];
    currentHeight = 0;
  };

  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const sec = sections[sIdx]!;
    // Assign page number and index to section for TOC display
    sec.pageNumber = currentPageNumber;
    sec.sectionIndex = sIdx;

    const headingHeight = sec.title ? (sec.level === 1 ? 60 : sec.level === 2 ? 42 : 32) : 0;

    if (headingHeight > 0 && currentHeight + headingHeight > PAGE_CAPACITY - 60 && currentSectionsOnPage.length > 0) {
      startNewPage();
      sec.pageNumber = currentPageNumber;
    }

    currentHeight += headingHeight;

    let secItem: DocA4SectionItem = {
      sectionIndex: sIdx,
      title: sec.title,
      level: sec.level,
      numberStr: sec.numberStr,
      renderHeading: Boolean(sec.title),
      blocks: [],
    };

    for (let bIdx = 0; bIdx < sec.blocks.length; bIdx++) {
      const block = sec.blocks[bIdx]!;
      let blockHeight = 38;

      if (block.type === "paragraph" || block.type === "lead") {
        blockHeight = Math.max(32, Math.ceil((block.content?.length || 40) / 85) * 20);
      } else if (block.type === "list") {
        blockHeight = 20 + (block.listItems?.length || 2) * 22;
      } else if (block.type === "table") {
        blockHeight = 45 + (block.tableData?.rows?.length || 2) * 30;
      } else if (block.type === "callout") {
        blockHeight = 60 + Math.ceil((block.content?.length || 40) / 75) * 18;
      } else if (block.type === "image") {
        blockHeight = 210;
      } else if (block.type === "scene") {
        blockHeight = 140;
      } else if (block.type === "palette") {
        blockHeight = 90;
      } else if (block.type === "parameter") {
        blockHeight = 32;
      }

      // Handle long lists cleanly across pages so they never overflow A4
      if (block.type === "list" && block.listItems && block.listItems.length > 18) {
        const items = [...block.listItems];
        while (items.length > 0) {
          const availHeight = PAGE_CAPACITY - currentHeight;
          const countCanFit = Math.max(3, Math.floor((availHeight - 20) / 22));
          const chunk = items.splice(0, countCanFit);
          const chunkBlock: DocBlock = { ...block, listItems: chunk };
          const chunkHeight = 20 + chunk.length * 22;

          if (currentHeight + chunkHeight > PAGE_CAPACITY && (currentSectionsOnPage.length > 0 || secItem.blocks.length > 0)) {
            if (secItem.blocks.length > 0 || secItem.renderHeading) {
              currentSectionsOnPage.push(secItem);
            }
            startNewPage();
            secItem = {
              sectionIndex: sIdx,
              title: sec.title,
              level: sec.level,
              numberStr: sec.numberStr,
              renderHeading: false,
              blocks: [],
            };
          }
          secItem.blocks.push(chunkBlock);
          currentHeight += chunkHeight;
        }
        continue;
      }

      if (currentHeight + blockHeight > PAGE_CAPACITY && (currentSectionsOnPage.length > 0 || secItem.blocks.length > 0)) {
        if (secItem.blocks.length > 0 || secItem.renderHeading) {
          currentSectionsOnPage.push(secItem);
        }
        startNewPage();
        secItem = {
          sectionIndex: sIdx,
          title: sec.title,
          level: sec.level,
          numberStr: sec.numberStr,
          renderHeading: false,
          blocks: [],
        };
      }

      secItem.blocks.push(block);
      currentHeight += blockHeight;
    }

    if (secItem.blocks.length > 0 || secItem.renderHeading) {
      currentSectionsOnPage.push(secItem);
    }
  }

  if (currentSectionsOnPage.length > 0 || pages.length === 0) {
    pages.push({
      pageNumber: currentPageNumber,
      totalPages: 1,
      isFirstBodyPage: isFirstBodyPage,
      sections: currentSectionsOnPage,
    });
  }

  const total = pages.length;
  pages.forEach((p) => {
    p.totalPages = total;
  });

  return pages;
}

export function DocumentFormattingWorkflow({
  onSwitchToPresentation,
}: {
  onSwitchToPresentation?: () => void;
}) {
  // Step navigation: 1: Source Content, 2: Style & Layout Rules, 3: Preview & Download
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const goToStep = (newStep: 1 | 2 | 3) => {
    setStep(newStep);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Content state
  const [inputMode, setInputMode] = useState<"paste" | "upload">("paste");
  const [rawText, setRawText] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [detectedFormat, setDetectedFormat] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lifecycle check for incoming document template
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        const storedDoc = window.sessionStorage.getItem("documind_template_doc_content");
        const storedTitle = window.sessionStorage.getItem("documind_template_doc_title");
        if (storedDoc) {
          setRawText(storedDoc);
          deriveTitleFromContent(storedDoc);
          toast.success(`Template loaded: "${storedTitle || "Document Template"}"`, {
            description: "Structured sections and design tokens applied to Document Studio.",
          });
          window.sessionStorage.removeItem("documind_template_doc_content");
          window.sessionStorage.removeItem("documind_template_doc_title");
        }
      }
    } catch {
      // Ignore storage access errors
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

    headingNumbering: "none",
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
  const [previewPage, setPreviewPage] = useState<"all" | "single" | "toc" | "cover">("all");
  const [activePageNum, setActivePageNum] = useState<number>(1);
  const [paperMode, setPaperMode] = useState<"standard" | "dark">("standard");
  const [documentZoom, setDocumentZoom] = useState<number>(100);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState<number>(850);

  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;

    const updateWidth = () => {
      if (el.clientWidth > 0) {
        setCanvasWidth(el.clientWidth);
      }
    };

    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(el);
    window.addEventListener("resize", updateWidth);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, [step]);

  // Academic Assignment Mode State
  const [assignmentMode, setAssignmentMode] = useState<boolean>(false);
  const [assignmentMetadata, setAssignmentMetadata] = useState<AssignmentMetadata>(() => ({
    ...getDefaultAssignmentMetadata(),
    isAssignment: true,
  }));
  const [extractedSuggestions, setExtractedSuggestions] = useState<ReturnType<
    typeof extractAssignmentMetadataFromText
  > | null>(null);
  const [isEditCoverModalOpen, setIsEditCoverModalOpen] = useState<boolean>(false);

  // File handling
  const handleFileUpload = async (file: File) => {
    setUploadedFile(file);
    const ext = file.name.split(".").pop()?.toLowerCase();
    setDetectedFormat(ext?.toUpperCase() || "UNKNOWN");

    if (ext === "txt") {
      const text = await file.text();
      setRawText(text);
      deriveTitleFromContent(text);
      if (assignmentMode) {
        const suggestions = extractAssignmentMetadataFromText(text);
        if (suggestions.hasSuggestions) {
          setExtractedSuggestions(suggestions);
        }
      }
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
          if (assignmentMode) {
            const suggestions = extractAssignmentMetadataFromText(res.text);
            if (suggestions.hasSuggestions) {
              setExtractedSuggestions(suggestions);
            }
          }
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
    if (meta.docTitle && !assignmentMetadata.assignmentTitle) {
      setAssignmentMetadata((prev) => ({
        ...prev,
        assignmentTitle: prev.assignmentTitle || meta.docTitle,
      }));
    }
  };

  const handleProceedToStyling = () => {
    if (!rawText.trim()) {
      toast.error("Please supply document content", {
        description: "Paste your document or upload a supported file.",
      });
      return;
    }

    if (assignmentMode) {
      const isGroup = assignmentMetadata.assignmentType === "group";
      if (!isGroup) {
        if (
          !assignmentMetadata.studentName?.trim() ||
          !assignmentMetadata.studentId?.trim() ||
          !assignmentMetadata.courseName?.trim() ||
          !assignmentMetadata.instructorName?.trim()
        ) {
          toast.error("Required Assignment Information Missing", {
            description:
              "Please complete Student Full Name, Student ID, Course Name, and Instructor Name (*).",
          });
          return;
        }
      } else {
        if (
          !assignmentMetadata.assignmentTitle?.trim() ||
          !assignmentMetadata.courseName?.trim() ||
          !assignmentMetadata.instructorName?.trim()
        ) {
          toast.error("Required Group Information Missing", {
            description: "Please complete Group Title, Course Name, and Instructor Name (*).",
          });
          return;
        }
        const validMembers = assignmentMetadata.groupMembers.filter(
          (m) => m.fullName.trim() && m.studentId.trim(),
        );
        if (validMembers.length === 0) {
          toast.error("Group Members Required", {
            description: "Please provide at least one group member with Full Name and Student ID.",
          });
          return;
        }
      }

      // Sync config with assignment metadata
      setConfig((prev) => ({
        ...prev,
        hasCoverPage: true,
        assignmentMetadata: { ...assignmentMetadata, isAssignment: true },
        docTitle: assignmentMetadata.assignmentTitle || assignmentMetadata.courseName || prev.docTitle,
        authorName: !isGroup ? assignmentMetadata.studentName : (assignmentMetadata.groupMembers[0]?.fullName || ""),
        institution: assignmentMetadata.universityName || prev.institution,
        layoutArchetype: "academic",
      }));
    }

    goToStep(2);
  };

  const autoPolishText = () => {
    if (!rawText.trim()) return;
    deriveTitleFromContent(rawText);
    toast.success("Document structure and editorial blueprint optimized!");
  };

  // Export handlers
  const handleExportDocx = () => {
    const activeConfig = assignmentMode
      ? { ...config, hasCoverPage: true, assignmentMetadata: { ...assignmentMetadata, isAssignment: true } }
      : config;
    const htmlContent = generateFormattedHtml(rawText, activeConfig);
    const blob = new Blob([htmlContent], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const docName = `${(activeConfig.docTitle || "formatted_document").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 32)}.doc`;
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
    const activeConfig = assignmentMode
      ? { ...config, hasCoverPage: true, assignmentMetadata: { ...assignmentMetadata, isAssignment: true } }
      : config;
    const htmlContent = generateFormattedHtml(rawText, activeConfig);
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
    <div className="w-full">
      {/* Primary Mode Selector: Standard Document vs Academic Assignment Mode */}
      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2.5 rounded-2xl border border-border bg-card shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setAssignmentMode(false);
              setAssignmentMetadata((prev) => ({ ...prev, isAssignment: false }));
              setConfig((prev) => ({
                ...prev,
                assignmentMetadata: undefined,
                hasCoverPage: false,
              }));
            }}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              !assignmentMode
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Standard Document</span>
          </button>

          <button
            type="button"
            data-testid="assignment-mode-button"
            onClick={() => {
              setAssignmentMode(true);
              setAssignmentMetadata((prev) => ({ ...prev, isAssignment: true }));
              setConfig((prev) => ({
                ...prev,
                hasCoverPage: true,
                assignmentMetadata: { ...assignmentMetadata, isAssignment: true },
                layoutArchetype: "academic",
              }));
              toast.info("Academic Assignment Mode Activated", {
                description:
                  "Enter student or group details, university emblem, and select your A4 academic cover template.",
              });
            }}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              assignmentMode
                ? "bg-primary text-primary-foreground shadow-xs ring-1 ring-primary/40"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
            }`}
          >
            <GraduationCap className="h-4 w-4 text-amber-400" />
            <span>Assignment Mode</span>
            <span className="hidden sm:inline-block rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-500">
              New
            </span>
          </button>
        </div>

        {assignmentMode && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-xs">
            <GraduationCap className="h-4 w-4 shrink-0" />
            <span className="font-semibold">
              {assignmentMetadata?.assignmentType === "group" ? "Group Assignment" : "Individual Assignment"}
            </span>
            <span className="text-muted-foreground text-[11px] hidden md:inline">
              · {(assignmentMetadata?.coverTemplateId || "classic-university").replace(/-/g, " ").toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Step Indicator Bar */}
      <div className="mb-8 grid grid-cols-3 gap-2 sm:gap-4">
        {[
          {
            num: 1,
            label: assignmentMode ? "1. Assignment & Source" : "1. Source Document",
            desc: assignmentMode ? "Student info & document text" : "Paste or upload DOCX/PDF/TXT",
          },
          {
            num: 2,
            label: assignmentMode ? "2. Cover & Typography" : "2. Style & Typography",
            desc: assignmentMode ? "10 Cover templates & styles" : "Cover, margins, fonts, headers",
          },
          {
            num: 3,
            label: "3. Preview & Export",
            desc: "Inspect A4 pages & download doc",
          },
        ].map((s) => {
          const isActive = step === s.num;
          const isDone = step > s.num;
          return (
            <button
              key={s.num}
              onClick={() => {
                // allow navigating to previous steps
                if (s.num <= step || (step === 1 && rawText.trim())) {
                  goToStep(s.num as 1 | 2 | 3);
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
          {/* Academic Assignment Information Form */}
          {assignmentMode && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-paper">
              <AssignmentInformationForm
                metadata={assignmentMetadata}
                onChange={(updated) => {
                  setAssignmentMetadata(updated);
                  setConfig((prev) => ({
                    ...prev,
                    assignmentMetadata: updated,
                    docTitle: updated.assignmentTitle || updated.courseName || prev.docTitle,
                    institution: updated.universityName || prev.institution,
                  }));
                }}
                extractedSuggestions={extractedSuggestions}
                onApplySuggestions={(fields) => {
                  setAssignmentMetadata((prev) => {
                    const next = { ...prev, ...fields };
                    setConfig((c) => ({
                      ...c,
                      assignmentMetadata: next,
                      docTitle: next.assignmentTitle || next.courseName || c.docTitle,
                      institution: next.universityName || c.institution,
                    }));
                    return next;
                  });
                  setExtractedSuggestions(null);
                  toast.success("Applied Extracted Assignment Details");
                }}
                onDismissSuggestions={() => setExtractedSuggestions(null)}
              />
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-6 shadow-paper">
            {/* Input Mode Selector */}
            <div className="flex items-center justify-between border-b border-border pb-4 mb-5">
              <h2 className="font-serif text-lg font-bold text-foreground">
                {assignmentMode ? "Provide Assignment Content" : "Provide Document Content"}
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
                    Document Text (paste draft, assignment questions, thesis chapter, or research notes)
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground hidden sm:inline mr-1">Presets:</span>
                    <Button
                      variant="glass"
                      size="sm"
                      className="text-[11px] h-7 gap-1"
                      onClick={() => {
                        const sampleAssignment = `CS 401 — Advanced Distributed Systems
Midterm Research Assignment: Byzantine Fault Tolerant Consensus Protocols

1.0 Problem Statement & Theoretical Foundations
Traditional Paxos and Raft protocols tolerate crash-stop failures in benign networked environments. However, in adversarial distributed networks where arbitrary or malicious nodes deviate from protocol logic, Byzantine Fault Tolerance (BFT) mechanisms are strictly required to ensure safety and liveness.

2.0 Comparative Protocol Analysis
We evaluate Practical Byzantine Fault Tolerance (PBFT) alongside Proof-of-Stake Tendermint consensus:
- Message Complexity: PBFT scales quadratically with O(n^2) message exchanges per round, bounding network cluster size.
- Quorum Thresholds: Both systems require 3f + 1 total replicas to withstand f adversarial Byzantine nodes.

3.0 Implementation & Experimental Results
Our benchmark results demonstrate 1,450 transactions per second under a 16-node cluster with 40ms simulated network latency.

4.0 Evaluation & Conclusion
Hybrid optimistic pipelines offer optimal throughput while preserving guaranteed consensus safety under adversarial partitions.`;
                        setRawText(sampleAssignment);
                        deriveTitleFromContent(sampleAssignment);
                        if (assignmentMode) {
                          setAssignmentMetadata((prev) => ({
                            ...prev,
                            assignmentTitle: "Byzantine Fault Tolerant Consensus Protocols",
                            courseName: "CS 401 — Advanced Distributed Systems",
                            courseCode: "CS 401",
                            instructorName: "Dr. Evelyn Reed",
                            universityName: "Stanford University",
                            department: "Department of Computer Science",
                            collegeOrFaculty: "School of Engineering",
                            academicYear: "2026-2027",
                            semester: "Fall 2026",
                            submissionDate: "October 28, 2026",
                            studentName: prev.studentName || "Alex Morgan",
                            studentId: prev.studentId || "STU-882910",
                          }));
                        }
                        toast.info("Loaded Academic Assignment Sample.");
                      }}
                    >
                      <GraduationCap className="h-3 w-3 text-amber-500" />
                      Assignment Sample
                    </Button>
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
                    const val = e.target.value;
                    setRawText(val);
                    deriveTitleFromContent(val);
                    if (assignmentMode && val.length > 50) {
                      const suggestions = extractAssignmentMetadataFromText(val);
                      if (suggestions.hasSuggestions) {
                        setExtractedSuggestions(suggestions);
                      }
                    }
                  }}
                  placeholder="Paste your unformatted assignment, report, manuscript, or research notes here..."
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
                  goToStep(3);
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
              onClick={handleProceedToStyling}
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
          {/* Academic Cover Page Template Picker in Assignment Mode */}
          {assignmentMode && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-paper">
              <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
                <GraduationCap className="h-4 w-4 text-primary" />
                <h2 className="font-serif text-base font-bold text-foreground">
                  Academic Cover Page Template
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Choose from 10 distinct academic cover-page designs. Each template applies distinct framing, typography, and metadata layouts formatted specifically for A4 document pages.
              </p>
              <CoverTemplateGallery
                mode="document"
                metadata={assignmentMetadata}
                onSelectTemplate={(templateId, defaultAccent) => {
                  setAssignmentMetadata((prev) => ({
                    ...prev,
                    coverTemplateId: templateId,
                    accentColor: defaultAccent || prev.accentColor,
                  }));
                  setConfig((prev) => ({
                    ...prev,
                    assignmentMetadata: {
                      ...assignmentMetadata,
                      coverTemplateId: templateId,
                      accentColor: defaultAccent || assignmentMetadata.accentColor,
                    },
                  }));
                }}
                onUpdateAccentColor={(color) => {
                  setAssignmentMetadata((prev) => ({ ...prev, accentColor: color }));
                  setConfig((prev) => ({
                    ...prev,
                    assignmentMetadata: { ...assignmentMetadata, accentColor: color },
                  }));
                }}
              />
            </div>
          )}

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
                  {!assignmentMode && (
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
                  )}
                </div>

                {assignmentMode ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <GraduationCap className="h-4 w-4 text-primary" />
                          Academic Cover Active
                        </span>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
                          {(assignmentMetadata?.coverTemplateId || "classic-university").replace(/-/g, " ")}
                        </span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        Template and academic metadata configured. The first page is reserved as an official academic assignment cover page.
                      </p>
                      <div className="pt-2 border-t border-primary/15 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                        <span><strong>Student/Group:</strong> {assignmentMetadata?.assignmentType === "group" ? (assignmentMetadata?.assignmentTitle || "Group Project") : (assignmentMetadata?.studentName || "Student")}</span>
                        <span><strong>Course:</strong> {assignmentMetadata?.courseName || "Course"}</span>
                        <span><strong>Instructor:</strong> {assignmentMetadata?.instructorName || "Instructor"}</span>
                      </div>
                    </div>
                  </div>
                ) : config.hasCoverPage ? (
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

          {/* Step 7 Document Blueprint Review */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-primary/20 pb-4 mb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  {assignmentMode ? "Academic Assignment Blueprint" : "Document Formatting Blueprint"}
                </span>
                <h3 className="text-base font-bold text-foreground">
                  {assignmentMode
                    ? (assignmentMetadata.assignmentTitle || assignmentMetadata.courseName || "Academic Assignment")
                    : (config.docTitle || "Formatted Document")}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-card border border-border px-3 py-1 font-mono text-xs font-semibold text-foreground">
                  {parseDocumentSections(rawText, config.headingNumbering).length} Sections Identified
                </span>
                {assignmentMode && (
                  <span className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 font-mono text-xs font-bold text-primary uppercase">
                    Template: {(assignmentMetadata?.coverTemplateId || "classic-university").replace(/-/g, " ")}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-card border border-border">
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                  {assignmentMode ? "Student / Group" : "Author / Institution"}
                </span>
                <span className="font-semibold text-foreground mt-1 block truncate">
                  {assignmentMode
                    ? (assignmentMetadata?.assignmentType === "group"
                        ? `${(assignmentMetadata?.groupMembers || []).filter((m) => m.fullName.trim()).length} Group Members`
                        : `${assignmentMetadata?.studentName || "Student"} (${assignmentMetadata?.studentId || "ID"})`)
                    : (config.authorName || config.institution || "Standard Author")}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-card border border-border">
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                  {assignmentMode ? "Course / Evaluator" : "Layout Archetype"}
                </span>
                <span className="font-semibold text-foreground mt-1 block truncate">
                  {assignmentMode
                    ? `${assignmentMetadata?.courseName || "Course"} · ${assignmentMetadata?.instructorName || "Instructor"}`
                    : config.layoutArchetype.toUpperCase()}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-card border border-border">
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                  Typography & Spacing
                </span>
                <span className="font-semibold text-foreground mt-1 block">
                  {config.fontFamily.toUpperCase()} · {config.baseFontSize} · {config.lineSpacing}x
                </span>
              </div>
              <div className="p-3 rounded-xl bg-card border border-border">
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                  {assignmentMode ? "University Emblem" : "Table of Contents"}
                </span>
                <span className="font-semibold text-foreground mt-1 block">
                  {assignmentMode
                    ? (assignmentMetadata.logoDataUrl ? "Emblem Uploaded (Verified)" : "Standard Crest Typography")
                    : (config.includeToc ? "Dedicated TOC Page Included" : "Integrated TOC")}
                </span>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between border-t border-border pt-6">
            <Button variant="glass" onClick={() => goToStep(1)} className="gap-2">
              <ChevronLeft className="h-4 w-4" /> Back to Content
            </Button>
            <Button
              variant="hero"
              size="lg"
              onClick={() => {
                if (assignmentMode) {
                  setConfig((prev) => ({
                    ...prev,
                    hasCoverPage: true,
                    assignmentMetadata: { ...assignmentMetadata, isAssignment: true },
                  }));
                }
                goToStep(3);
              }}
              className="gap-2 px-6"
            >
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
                  {assignmentMode ? "Academic Assignment Document" : "Formatted Document Stage"}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Typography applied: {config.fontFamily.toUpperCase()} · {config.baseFontSize} ·{" "}
                  {config.lineSpacing}x spacing · {config.margins} margins
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {assignmentMode && (
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => setIsEditCoverModalOpen(true)}
                  className="text-xs text-primary gap-1"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Edit Cover Details
                </Button>
              )}
              <Button variant="glass" size="sm" onClick={() => goToStep(2)} className="text-xs">
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

          {/* Preview Viewport Switcher & Multi-Page A4 Canvas */}
          {(() => {
            const sections = parseDocumentSections(rawText, config.headingNumbering);
            const a4Pages = paginateSectionsIntoA4Pages(sections, config);
            const isDedicatedToc = config.includeToc && config.hasCoverPage;
            const activePage =
              a4Pages.find((p) => p.pageNumber === activePageNum) ||
              a4Pages[0] || {
                pageNumber: 1,
                totalPages: 1,
                sections: [],
              };

            const BASE_A4_WIDTH = 794;
            const BASE_A4_HEIGHT = 1123;
            // Responsive auto-fit scale so the A4 sheet fills the available width gracefully without clipping
            const availableWidth = Math.max(300, canvasWidth - 48);
            const fitScale = Math.min(1.0, availableWidth / BASE_A4_WIDTH);
            const effectiveScale = Number((fitScale * (documentZoom / 100)).toFixed(4));
            const currentDisplayWidth = Math.round(BASE_A4_WIDTH * effectiveScale);
            const currentDisplayHeight = Math.round(BASE_A4_HEIGHT * effectiveScale);

            return (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Document View Switcher */}
                  <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-surface-2 p-1 text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setPreviewPage("all")}
                      className={`rounded-md px-3 py-1 transition-all ${
                        previewPage === "all"
                          ? "bg-card text-foreground shadow-xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      All Pages (A4)
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviewPage("single")}
                      className={`rounded-md px-3 py-1 transition-all ${
                        previewPage === "single"
                          ? "bg-card text-foreground shadow-xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Single Page View
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

                  {/* Single Page Stepper Controls */}
                  {previewPage === "single" && (
                    <div className="flex items-center gap-1.5 bg-surface-2 border border-border rounded-lg p-1">
                      <Button
                        variant="glass"
                        size="sm"
                        disabled={activePageNum <= 1}
                        onClick={() => setActivePageNum((prev) => Math.max(1, prev - 1))}
                        className="h-7 px-2 text-xs"
                      >
                        <ChevronLeft className="h-3.5 w-3.5 mr-0.5" /> Prev
                      </Button>
                      <select
                        value={activePageNum}
                        onChange={(e) => setActivePageNum(Number(e.target.value))}
                        className="bg-card text-foreground border border-border rounded px-2 py-0.5 text-xs font-mono font-medium focus:outline-hidden"
                      >
                        {a4Pages.map((p) => (
                          <option key={p.pageNumber} value={p.pageNumber}>
                            Page {p.pageNumber} of {p.totalPages}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="glass"
                        size="sm"
                        disabled={activePageNum >= a4Pages.length}
                        onClick={() => setActivePageNum((prev) => Math.min(a4Pages.length, prev + 1))}
                        className="h-7 px-2 text-xs"
                      >
                        Next <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                      </Button>
                    </div>
                  )}

                  {/* Layout Archetype Switcher, Paper Mode & Zoom */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="hidden md:inline-flex rounded-full bg-surface-2 border border-border px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                      {a4Pages.length} A4 Pages (210 × 297 mm)
                    </span>

                    {/* Zoom Controls */}
                    <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-2 p-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setDocumentZoom((prev) => Math.max(50, prev - 10))}
                        className="rounded p-1 text-muted-foreground hover:bg-card hover:text-foreground transition-colors cursor-pointer"
                        title="Zoom Out (-10%)"
                        disabled={documentZoom <= 50}
                      >
                        <ZoomOut className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDocumentZoom(100)}
                        className="px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground hover:bg-card rounded transition-colors cursor-pointer"
                        title={fitScale < 1 && documentZoom === 100 ? "Fit to Screen" : "Reset Zoom to 100%"}
                      >
                        {fitScale < 1 && documentZoom === 100 ? "Fit" : `${documentZoom}%`}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDocumentZoom((prev) => Math.min(200, prev + 10))}
                        className="rounded p-1 text-muted-foreground hover:bg-card hover:text-foreground transition-colors cursor-pointer"
                        title="Zoom In (+10%)"
                        disabled={documentZoom >= 200}
                      >
                        <ZoomIn className="h-3.5 w-3.5" />
                      </button>
                      {fitScale < 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (documentZoom === 100) {
                              setDocumentZoom(Math.round((1 / fitScale) * 100));
                            } else {
                              setDocumentZoom(100);
                            }
                          }}
                          className="px-1.5 py-0.5 text-[10px] font-mono font-medium rounded border border-border/60 hover:bg-card text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Toggle between Fit and 100% Print Size"
                        >
                          {documentZoom === 100 ? "100%" : "Fit"}
                        </button>
                      )}
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
                        White Paper
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
                        Dark Paper
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

                {/* A4 Pages Canvas Container */}
                <div
                  ref={canvasContainerRef}
                  className="flex flex-col items-center py-8 bg-slate-100/90 dark:bg-zinc-950/90 rounded-2xl border border-border p-3 sm:p-6 lg:p-8 overflow-x-auto shadow-inner w-full"
                >
                  <div className="flex flex-col items-center">
                    {/* VIEW MODE 1: ALL A4 PAGES STACKED */}
                    {previewPage === "all" && (
                      <div className="space-y-10 flex flex-col items-center shrink-0">
                        {a4Pages.map((page) => (
                          <div
                            key={page.pageNumber}
                            className="flex flex-col items-center shrink-0"
                            style={{ width: `${currentDisplayWidth}px` }}
                          >
                            {/* Page Sheet Label Bar */}
                            <div
                              className="flex items-center justify-between text-[11px] font-mono text-muted-foreground/80 mb-2 px-1 select-none shrink-0"
                              style={{ width: `${currentDisplayWidth}px` }}
                            >
                              <span className="font-semibold tracking-wider uppercase text-primary">
                                A4 Sheet {page.pageNumber} of {page.totalPages}
                              </span>
                              <span className="text-[10px] bg-surface-2 border border-border/60 rounded px-2 py-0.5">
                                {page.isCover
                                  ? "Cover Page"
                                  : page.isToc
                                    ? `Table of Contents${page.tocTotalParts && page.tocTotalParts > 1 ? ` (${page.tocPart}/${page.tocTotalParts})` : ""}`
                                    : "210 × 297 mm"}
                              </span>
                            </div>

                            <div
                              className="relative shrink-0 overflow-hidden rounded-xs shadow-paper"
                              style={{
                                width: `${currentDisplayWidth}px`,
                                height: `${currentDisplayHeight}px`,
                              }}
                            >
                              <div
                                style={{
                                  width: "794px",
                                  height: "1123px",
                                  transform: `scale(${effectiveScale})`,
                                  transformOrigin: "top left",
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                }}
                              >
                                <A4PageCard
                                  page={page}
                                  config={config}
                                  paperMode={paperMode}
                                  sections={sections}
                                  onNavigatePage={(p) => setActivePageNum(p)}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* VIEW MODE 2: SINGLE PAGE FLIPPER */}
                    {previewPage === "single" && (
                      <div
                        className="flex flex-col items-center shrink-0"
                        style={{ width: `${currentDisplayWidth}px` }}
                      >
                        <div
                          className="flex items-center justify-between text-[11px] font-mono text-muted-foreground/80 mb-2 px-1 select-none shrink-0"
                          style={{ width: `${currentDisplayWidth}px` }}
                        >
                          <span className="font-semibold tracking-wider uppercase text-primary">
                            A4 Sheet {activePage.pageNumber} of {activePage.totalPages}
                          </span>
                          <span className="text-[10px] bg-surface-2 border border-border/60 rounded px-2 py-0.5">
                            210 × 297 mm
                          </span>
                        </div>
                        <div
                          className="relative shrink-0 overflow-hidden rounded-xs shadow-paper"
                          style={{
                            width: `${currentDisplayWidth}px`,
                            height: `${currentDisplayHeight}px`,
                          }}
                        >
                          <div
                            style={{
                              width: "794px",
                              height: "1123px",
                              transform: `scale(${effectiveScale})`,
                              transformOrigin: "top left",
                              position: "absolute",
                              top: 0,
                              left: 0,
                            }}
                          >
                            <A4PageCard
                              page={activePage}
                              config={config}
                              paperMode={paperMode}
                              sections={sections}
                              onNavigatePage={(p) => setActivePageNum(p)}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* VIEW MODE 3: DEDICATED TOC VIEW */}
                    {previewPage === "toc" && (
                      <div className="space-y-10 flex flex-col items-center shrink-0">
                        {a4Pages
                          .filter((p) => p.isToc)
                          .map((tocPage) => (
                            <div
                              key={tocPage.pageNumber}
                              className="flex flex-col items-center shrink-0"
                              style={{ width: `${currentDisplayWidth}px` }}
                            >
                              <div
                                className="flex items-center justify-between text-[11px] font-mono text-muted-foreground/80 mb-2 px-1 select-none shrink-0"
                                style={{ width: `${currentDisplayWidth}px` }}
                              >
                                <span className="font-semibold tracking-wider uppercase text-primary">
                                  Table of Contents · A4 Page {tocPage.pageNumber}
                                </span>
                                <span className="text-[10px] bg-surface-2 border border-border/60 rounded px-2 py-0.5">
                                  {tocPage.tocTotalParts && tocPage.tocTotalParts > 1
                                    ? `Part ${tocPage.tocPart} of ${tocPage.tocTotalParts}`
                                    : "210 × 297 mm"}
                                </span>
                              </div>
                              <div
                                className="relative shrink-0 overflow-hidden rounded-xs shadow-paper"
                                style={{
                                  width: `${currentDisplayWidth}px`,
                                  height: `${currentDisplayHeight}px`,
                                }}
                              >
                                <div
                                  style={{
                                    width: "794px",
                                    height: "1123px",
                                    transform: `scale(${effectiveScale})`,
                                    transformOrigin: "top left",
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                  }}
                                >
                                  <A4PageCard
                                    page={tocPage}
                                    config={config}
                                    paperMode={paperMode}
                                    sections={sections}
                                    onNavigatePage={(p) => {
                                      setActivePageNum(p);
                                      setPreviewPage("single");
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* VIEW MODE 4: DEDICATED COVER PAGE VIEW */}
                    {previewPage === "cover" && (
                      <div className="space-y-10 flex flex-col items-center shrink-0">
                        {a4Pages
                          .filter((p) => p.isCover)
                          .map((coverPage) => (
                            <div
                              key={coverPage.pageNumber}
                              className="flex flex-col items-center shrink-0"
                              style={{ width: `${currentDisplayWidth}px` }}
                            >
                              <div
                                className="flex items-center justify-between text-[11px] font-mono text-muted-foreground/80 mb-2 px-1 select-none shrink-0"
                                style={{ width: `${currentDisplayWidth}px` }}
                              >
                                <span className="font-semibold tracking-wider uppercase text-primary">
                                  Cover Page · A4 Sheet 1
                                </span>
                                <span className="text-[10px] bg-surface-2 border border-border/60 rounded px-2 py-0.5">
                                  210 × 297 mm
                                </span>
                              </div>
                              <div
                                className="relative shrink-0 overflow-hidden rounded-xs shadow-paper"
                                style={{
                                  width: `${currentDisplayWidth}px`,
                                  height: `${currentDisplayHeight}px`,
                                }}
                              >
                                <div
                                  style={{
                                    width: "794px",
                                    height: "1123px",
                                    transform: `scale(${effectiveScale})`,
                                    transformOrigin: "top left",
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                  }}
                                >
                                  <A4PageCard
                                    page={coverPage}
                                    config={config}
                                    paperMode={paperMode}
                                    sections={sections}
                                    onNavigatePage={(p) => {
                                      setActivePageNum(p);
                                      setPreviewPage("single");
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Export Action Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-paper flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-serif text-base font-bold text-foreground">
                Ready to download your formatted document?
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Export directly to editable Word (.doc) or invoke print-to-PDF with clean vector A4 typography.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="glass" onClick={handlePrintPreview} className="gap-1.5 text-xs">
                <Printer className="h-3.5 w-3.5" /> Print / Save PDF
              </Button>
              <Button variant="glass" onClick={handleCopyFormattedText} className="gap-1.5 text-xs">
                <Copy className="h-3.5 w-3.5" /> Copy Text
              </Button>
              <Button variant="hero" onClick={handleExportDocx} className="gap-2 text-xs">
                <Download className="h-4 w-4" /> Download Editable (.DOC)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Cover Details Modal in Step 3 */}
      {isEditCoverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
              <div className="flex items-center gap-2.5">
                <GraduationCap className="h-5 w-5 text-primary" />
                <h2 className="font-serif text-lg font-bold text-foreground">
                  Edit Academic Cover Page Details & Template
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsEditCoverModalOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Cover Template & Accent Color
                </h3>
                <CoverTemplateGallery
                  mode="document"
                  metadata={assignmentMetadata}
                  onSelectTemplate={(tid, defaultAccent) => {
                    setAssignmentMetadata((prev) => ({
                      ...prev,
                      coverTemplateId: tid,
                      accentColor: defaultAccent || prev.accentColor,
                    }));
                    setConfig((prev) => ({
                      ...prev,
                      assignmentMetadata: {
                        ...assignmentMetadata,
                        coverTemplateId: tid,
                        accentColor: defaultAccent || assignmentMetadata.accentColor,
                      },
                    }));
                  }}
                  onUpdateAccentColor={(col) => {
                    setAssignmentMetadata((prev) => ({ ...prev, accentColor: col }));
                    setConfig((prev) => ({
                      ...prev,
                      assignmentMetadata: { ...assignmentMetadata, accentColor: col },
                    }));
                  }}
                />
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Assignment Information
                </h3>
                <AssignmentInformationForm
                  metadata={assignmentMetadata}
                  onChange={(updated) => {
                    setAssignmentMetadata(updated);
                    setConfig((prev) => ({
                      ...prev,
                      assignmentMetadata: updated,
                      docTitle: updated.assignmentTitle || updated.courseName || prev.docTitle,
                      institution: updated.universityName || prev.institution,
                    }));
                  }}
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
                <Button
                  variant="hero"
                  onClick={() => {
                    setIsEditCoverModalOpen(false);
                    toast.success("Cover Page Updated");
                  }}
                >
                  Apply & Update Preview
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Table of Contents Card with Dot Leaders and exact Page Numbers
 */
function TableOfContentsCard({
  sections,
  config,
  tocPart,
  tocTotalParts,
  onNavigatePage,
}: {
  sections: DocSection[];
  config: FormattingConfig;
  tocPart?: number;
  tocTotalParts?: number;
  onNavigatePage?: (pageNum: number) => void;
}) {
  const tocSections = sections.filter((s) => Boolean(s.title));
  if (tocSections.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/70 bg-surface-2/40 p-4 sm:p-5 space-y-3 shadow-xs">
      <div className="flex items-center justify-between pb-2 border-b border-border/50">
        <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
          <span>Table of Contents</span>
          {tocTotalParts && tocTotalParts > 1 ? (
            <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold">
              Part {tocPart} of {tocTotalParts}
            </span>
          ) : (
            <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold">
              {tocSections.length} Topics
            </span>
          )}
        </h3>
        <span className="font-mono text-[11px] font-semibold text-muted-foreground">
          Page
        </span>
      </div>

      <div className="space-y-1.5">
        {tocSections.map((sec, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              if (onNavigatePage && sec.pageNumber) {
                onNavigatePage(sec.pageNumber);
              }
              const el =
                document.getElementById(`sec-${sec.sectionIndex ?? idx}`) ||
                document.getElementById(`page-${sec.pageNumber}`);
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            className={`w-full group flex items-baseline justify-between text-left transition-colors hover:text-primary ${
              sec.level > 1
                ? "pl-4 text-xs text-muted-foreground hover:text-foreground"
                : "font-semibold text-foreground text-xs sm:text-sm"
            }`}
          >
            <span className="truncate max-w-[75%] group-hover:underline">
              {sec.numberStr && (
                <span className="font-mono text-primary font-bold mr-1.5">{sec.numberStr}</span>
              )}
              <span>{sec.title}</span>
            </span>
            {config.tocDotLeaders && (
              <span className="flex-1 mx-3 border-b border-dotted border-border/60 group-hover:border-primary/50" />
            )}
            <span className="font-mono text-xs font-semibold text-primary shrink-0">
              Page {sec.pageNumber || 1}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Individual A4 Sheet Component
 */
function A4PageCard({
  page,
  config,
  paperMode,
  sections,
  onNavigatePage,
}: {
  page: DocA4Page;
  config: FormattingConfig;
  paperMode: "standard" | "dark";
  sections: DocSection[];
  onNavigatePage?: (pageNum: number) => void;
}) {
  const marginPadding =
    config.margins === "narrow"
      ? "p-6 sm:p-8"
      : config.margins === "wide"
        ? "p-10 sm:p-14"
        : "p-8 sm:p-12";

  return (
    <div
      id={`page-${page.pageNumber}`}
      className={`shrink-0 overflow-hidden mx-auto rounded-xs border flex flex-col justify-between transition-all select-text ${
        page.isCover && config.assignmentMetadata?.isAssignment ? "p-0" : marginPadding
      } ${
        paperMode === "dark"
          ? "bg-zinc-900 border-zinc-700/60 text-zinc-100 shadow-[0_12px_36px_rgba(0,0,0,0.6)]"
          : "bg-white border-stone-200 text-stone-900 shadow-[0_12px_36px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)]"
      } ${
        config.fontFamily === "serif"
          ? "font-serif"
          : config.fontFamily === "mono"
            ? "font-mono"
            : "font-sans"
      }`}
      style={{
        width: "794px",
        minWidth: "794px",
        maxWidth: "794px",
        height: "1123px",
        minHeight: "1123px",
        maxHeight: "1123px",
        boxSizing: "border-box",
        overflow: "hidden",
        lineHeight: config.lineSpacing,
      }}
    >
      {/* Running Page Top Header */}
      {!page.isCover && (
        <div className="flex items-center justify-between text-[11px] font-sans text-muted-foreground pb-3 mb-3 border-b border-border/30 shrink-0 select-none">
          <span className="truncate max-w-[70%] font-medium">
            {config.headerText || config.docTitle || "Document"}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/80">
            {page.isToc
              ? `Table of Contents${page.tocTotalParts && page.tocTotalParts > 1 ? ` (${page.tocPart}/${page.tocTotalParts})` : ""}`
              : `A4 Page ${page.pageNumber}`}
          </span>
        </div>
      )}

      {/* Page Content Body */}
      <div
        className={`flex-1 flex flex-col justify-start overflow-hidden ${
          page.isCover && config.assignmentMetadata?.isAssignment ? "h-full w-full" : "space-y-4"
        }`}
      >
        {/* Cover Page */}
        {page.isCover && (
          config.assignmentMetadata?.isAssignment ? (
            <div className="w-full h-full flex flex-col">
              <AssignmentCoverRenderer
                metadata={config.assignmentMetadata || getDefaultAssignmentMetadata()}
                aspectRatio="a4"
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between py-12 text-center sm:text-left space-y-8">
              <div className="space-y-4">
                {config.institution && (
                  <p className="text-xs uppercase tracking-widest font-sans font-semibold text-primary">
                    {config.institution}
                  </p>
                )}
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight text-foreground">
                  {config.docTitle}
                </h1>
                {config.docSubtitle && (
                  <p className="text-base sm:text-lg font-normal italic text-muted-foreground">
                    {config.docSubtitle}
                  </p>
                )}
              </div>
              <div className="my-10">
                <div className="inline-block rounded-lg border border-border bg-surface-2 px-4 py-2 font-mono text-xs text-muted-foreground">
                  Standardized Format Blueprint · {config.coverStyle.toUpperCase()} SPEC
                </div>
              </div>
              <div className="pt-4 text-xs space-y-1.5 font-sans text-muted-foreground">
                {config.authorName && (
                  <p>
                    <strong className="text-foreground">Author:</strong> {config.authorName}
                  </p>
                )}
                {config.institution && (
                  <p>
                    <strong className="text-foreground">Institution:</strong>{" "}
                    {config.institution}
                  </p>
                )}
                <p>
                  <strong className="text-foreground">Date:</strong> {config.dateStr}
                </p>
              </div>
            </div>
          )
        )}

        {/* Dedicated Table of Contents Page */}
        {page.isToc && (
          <div className="space-y-4 flex-1 flex flex-col">
            <h2 className="text-2xl font-bold tracking-tight text-foreground font-serif">
              Table of Contents
            </h2>
            <TableOfContentsCard
              sections={page.tocItems || sections}
              config={config}
              tocPart={page.tocPart}
              tocTotalParts={page.tocTotalParts}
              onNavigatePage={onNavigatePage}
            />
          </div>
        )}

        {/* Regular Content Page */}
        {!page.isCover && !page.isToc && (
          <div className="space-y-5">
            {/* If First Body Page, render Document Header */}
            {page.isFirstBodyPage && (
              <div className="mb-6 space-y-2.5">
                {config.institution && (
                  <div className="mb-1.5">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-primary/10 text-primary">
                      {config.institution}
                    </span>
                  </div>
                )}
                <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight leading-tight text-foreground">
                  {config.docTitle}
                </h1>
                {config.docSubtitle && (
                  <p className="text-sm sm:text-base text-muted-foreground font-normal">
                    {config.docSubtitle}
                  </p>
                )}
                {(config.authorName || config.dateStr) && (
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground font-sans">
                    {config.authorName && (
                      <span className="font-medium text-foreground">By {config.authorName}</span>
                    )}
                    {config.dateStr && <span>{config.dateStr}</span>}
                  </div>
                )}
              </div>
            )}

            {/* Section items on this page */}
            <div className="space-y-5">
              {page.sections.map((secItem, sIdx) => (
                <div
                  key={sIdx}
                  id={secItem.renderHeading ? `sec-${secItem.sectionIndex}` : undefined}
                  className="space-y-2.5"
                >
                  {secItem.renderHeading && secItem.title && (
                    <div>
                      {secItem.level === 1 && (
                        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-baseline gap-2 pt-2 mb-1.5">
                          {secItem.numberStr && (
                            <span className="font-mono text-base text-primary font-bold shrink-0">
                              {secItem.numberStr}
                            </span>
                          )}
                          <span>{secItem.title}</span>
                        </h2>
                      )}
                      {secItem.level === 2 && (
                        <h3 className="text-sm sm:text-base font-semibold tracking-tight text-foreground flex items-baseline gap-2 pt-1.5 mb-1">
                          {secItem.numberStr && (
                            <span className="font-mono text-xs text-primary font-semibold shrink-0">
                              {secItem.numberStr}
                            </span>
                          )}
                          <span>{secItem.title}</span>
                        </h3>
                      )}
                      {secItem.level === 3 && (
                        <h4 className="text-xs sm:text-sm font-semibold italic text-foreground/90 flex items-baseline gap-2 pt-1">
                          {secItem.numberStr && (
                            <span className="font-mono text-xs text-muted-foreground shrink-0">
                              {secItem.numberStr}
                            </span>
                          )}
                          <span>{secItem.title}</span>
                        </h4>
                      )}
                    </div>
                  )}

                  {/* Section Blocks */}
                  <div className="space-y-2">
                    {secItem.blocks.map((block, bIdx) =>
                      renderDocBlock(block, bIdx, paperMode, config.lineSpacing),
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Running Page Bottom Footer */}
      {!page.isCover && (
        <div className="pt-3 mt-auto border-t border-border/30 flex items-center justify-between text-[11px] font-mono text-muted-foreground shrink-0 select-none">
          <span>DocuMind Studio · A4 Document</span>
          <span>
            {config.pageNumberFormat === "page-x-of-y"
              ? `Page ${page.pageNumber} of ${page.totalPages}`
              : `${page.pageNumber}`}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Renders an individual document block faithfully preserving original content
 */
export function renderDocBlock(
  block: DocBlock,
  bIdx: number,
  paperMode: "standard" | "dark",
  lineSpacing: string,
) {
  if (block.type === "lead") {
    return (
      <p
        key={bIdx}
        className={`text-sm sm:text-base font-medium leading-relaxed my-2 ${
          paperMode === "dark" ? "text-zinc-100" : "text-stone-900"
        }`}
      >
        {renderRichInline(block.content)}
      </p>
    );
  }

  if (block.type === "table" && block.tableData) {
    return (
      <div key={bIdx} className="my-4 overflow-x-auto rounded-lg border border-border/80 shadow-xs">
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          {block.tableData.headers && block.tableData.headers.length > 0 && (
            <thead className="bg-surface-2/70 font-semibold text-foreground border-b border-border">
              <tr>
                {block.tableData.headers.map((h, i) => (
                  <th key={i} className="px-3.5 py-2.5 font-semibold text-foreground">
                    {renderRichInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-border/40">
            {block.tableData.rows.map((row, rIdx) => (
              <tr key={rIdx} className={rIdx % 2 === 1 ? "bg-surface-2/20" : "bg-card"}>
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3.5 py-2 text-foreground/90 align-top">
                    {renderRichInline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (block.type === "image" && block.imageUrl) {
    return (
      <figure key={bIdx} className="my-4 text-center">
        <img
          src={block.imageUrl}
          alt={block.imageAlt || "Document Image"}
          className="mx-auto max-h-72 max-w-full rounded-lg object-contain shadow-xs border border-border/40"
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = "none";
          }}
        />
        {block.imageAlt && (
          <figcaption className="text-[11px] text-muted-foreground mt-1.5 italic">
            {block.imageAlt}
          </figcaption>
        )}
      </figure>
    );
  }

  if (block.type === "callout") {
    return (
      <div
        key={bIdx}
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
          <span>{block.calloutTitle || "Note"}</span>
        </div>
        <p className="text-xs sm:text-sm leading-relaxed">{renderRichInline(block.content)}</p>
      </div>
    );
  }

  if (block.type === "palette") {
    return (
      <div
        key={bIdx}
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
                <span className="text-[10px] text-muted-foreground">{c.hex}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (block.type === "scene") {
    return (
      <div
        key={bIdx}
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
                <span className="text-muted-foreground">{block.sceneMeta.visual}</span>
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
                <span className="italic text-muted-foreground">"{block.sceneMeta.audio}"</span>
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
    );
  }

  if (block.type === "parameter") {
    return (
      <div
        key={bIdx}
        className={`my-1.5 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs shadow-xs ${
          paperMode === "dark"
            ? "border-zinc-800 bg-zinc-800/60"
            : "border-stone-200 bg-stone-50"
        }`}
      >
        <span className="font-semibold text-primary">{block.key}:</span>
        <span className="text-foreground">{block.value}</span>
      </div>
    );
  }

  if (block.type === "list") {
    return (
      <ul key={bIdx} className="my-2.5 space-y-1.5 pl-2">
        {block.listItems?.map((li, lIdx) => (
          <li key={lIdx} className="flex items-start gap-2 text-xs sm:text-sm">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            <span className="leading-relaxed text-foreground">{renderRichInline(li)}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <p
      key={bIdx}
      className={`text-sm leading-relaxed text-justify ${
        paperMode === "dark" ? "text-zinc-200" : "text-stone-800"
      }`}
      style={{ lineHeight: lineSpacing || "1.6" }}
    >
      {renderRichInline(block.content)}
    </p>
  );
}

/**
 * Generates clean, standalone styled HTML document suitable for Word or Print-to-PDF with A4 pagination
 */
function generateFormattedHtml(rawText: string, config: FormattingConfig): string {
  const fontCss =
    config.fontFamily === "serif"
      ? "'Newsreader', 'Georgia', serif"
      : config.fontFamily === "mono"
        ? "'JetBrains Mono', monospace"
        : "'Manrope', 'Helvetica Neue', sans-serif";

  const sections = parseDocumentSections(rawText, config.headingNumbering);
  const a4Pages = paginateSectionsIntoA4Pages(sections, config);

  // Generate HTML for each A4 page
  const pagesHtml = a4Pages
    .map((page) => {
      let content = "";

      if (page.isCover) {
        if (config.assignmentMetadata?.isAssignment) {
          content = generateAssignmentCoverHtml(config.assignmentMetadata);
          return `<div class="a4-sheet" style="width: 210mm; height: 297mm; max-height: 297mm; overflow: hidden; padding: 16mm; margin: 0 auto 20px auto; background: #fff; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; page-break-inside: avoid;">
            <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
              ${content}
            </div>
          </div>`;
        }
        content = `<div style="height: 240mm; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            ${config.institution ? `<p style="text-transform: uppercase; letter-spacing: 2px; font-size: 10pt; color: #0284c7; font-weight: bold;">${escapeHtml(config.institution)}</p>` : ""}
            <h1 style="font-size: 2.4rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem; color: #0f172a;">${escapeHtml(config.docTitle)}</h1>
            ${config.docSubtitle ? `<p style="font-size: 1.2rem; color: #64748b; font-style: italic; margin-bottom: 2rem;">${escapeHtml(config.docSubtitle)}</p>` : ""}
          </div>
          <div style="margin: 2rem 0; padding: 10px 16px; border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 6px; font-family: monospace; font-size: 9pt; color: #64748b; display: inline-block;">
            Standardized Format Blueprint · ${escapeHtml(config.coverStyle.toUpperCase())} SPEC
          </div>
          <div style="font-size: 9.5pt; color: #475569; line-height: 1.6;">
            ${config.authorName ? `<p><strong>Author:</strong> ${escapeHtml(config.authorName)}</p>` : ""}
            ${config.institution ? `<p><strong>Institution:</strong> ${escapeHtml(config.institution)}</p>` : ""}
            <p><strong>Date:</strong> ${escapeHtml(config.dateStr)}</p>
          </div>
        </div>`;
      } else if (page.isToc) {
        const tocItems = page.tocItems || sections.filter((s) => Boolean(s.title));
        content = `<div style="flex: 1;">
          <h2 style="font-size: 1.6rem; font-weight: bold; color: #0f172a; margin-bottom: 1rem;">
            Table of Contents${page.tocTotalParts && page.tocTotalParts > 1 ? ` <span style="font-size: 11pt; color: #64748b; font-weight: normal;">(Part ${page.tocPart} of ${page.tocTotalParts})</span>` : ""}
          </h2>
          <div style="margin: 10px 0; padding: 14px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="display: flex; flex-direction: column; gap: 7px;">
              ${tocItems
                .map(
                  (sec) => `
                <div style="display: flex; align-items: baseline; justify-content: space-between; font-size: 9.5pt;">
                  <span style="font-weight: ${sec.level === 1 ? '600' : '400'}; color: #1e293b; padding-left: ${sec.level > 1 ? '14px' : '0'};">
                    ${escapeHtml(sec.numberStr)}${escapeHtml(sec.title)}
                  </span>
                  <span style="flex: 1; margin: 0 10px; border-bottom: 1px dotted #cbd5e1;"></span>
                  <span style="font-family: monospace; font-size: 9pt; font-weight: bold; color: #0284c7;">
                    Page ${sec.pageNumber || 1}
                  </span>
                </div>`,
                )
                .join("")}
            </div>
          </div>
        </div>`;
      } else {
        let bodyInner = "";

        if (page.isFirstBodyPage) {
          bodyInner += `<div style="margin-bottom: 1.6rem;">
            ${config.institution ? `<p style="text-transform: uppercase; letter-spacing: 1px; font-size: 9.5pt; color: #0284c7; font-weight: bold; margin-bottom: 6px;">${escapeHtml(config.institution)}</p>` : ""}
            <h1 style="font-size: 1.85rem; font-weight: bold; color: #0f172a; margin-bottom: 0.4rem;">${escapeHtml(config.docTitle)}</h1>
            ${config.docSubtitle ? `<p style="font-size: 1.05rem; color: #64748b; font-style: italic; margin-bottom: 0.6rem;">${escapeHtml(config.docSubtitle)}</p>` : ""}
            ${config.authorName || config.dateStr ? `<p style="font-size: 9pt; color: #64748b; margin-top: 4px;">${config.authorName ? `By ${escapeHtml(config.authorName)} · ` : ""}${escapeHtml(config.dateStr)}</p>` : ""}
          </div>`;
        }

        for (const sec of page.sections) {
          if (sec.renderHeading && sec.title) {
            if (sec.level === 1) {
              bodyInner += `<h2 style="font-size: 1.45rem; font-weight: bold; margin-top: 1.8rem; margin-bottom: 0.6rem; color: #0f172a;">${escapeHtml(sec.numberStr)}${escapeHtml(sec.title)}</h2>`;
            } else if (sec.level === 2) {
              bodyInner += `<h3 style="font-size: 1.2rem; font-weight: 600; margin-top: 1.4rem; margin-bottom: 0.5rem; color: #1e293b;">${escapeHtml(sec.numberStr)}${escapeHtml(sec.title)}</h3>`;
            } else {
              bodyInner += `<h4 style="font-size: 1.05rem; font-style: italic; margin-top: 1.1rem; margin-bottom: 0.4rem; color: #334155;">${escapeHtml(sec.numberStr)}${escapeHtml(sec.title)}</h4>`;
            }
          }

          for (const block of sec.blocks) {
            if (block.type === "lead") {
              bodyInner += `<p style="font-size: 1.1rem; font-weight: 500; line-height: 1.6; margin-bottom: 0.9rem; color: #0f172a;">${escapeHtml(block.content)}</p>`;
            } else if (block.type === "table" && block.tableData) {
              bodyInner += `<table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 10pt;">
                ${block.tableData.headers ? `<thead><tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">${block.tableData.headers.map((h) => `<th style="padding: 8px 12px; text-align: left; font-weight: bold; color: #0f172a;">${escapeHtml(h)}</th>`).join("")}</tr></thead>` : ""}
                <tbody>
                  ${block.tableData.rows.map((row, rIdx) => `<tr style="${rIdx % 2 === 1 ? 'background-color: #f8fafc;' : ''} border-bottom: 1px solid #e2e8f0;">${row.map((cell) => `<td style="padding: 8px 12px; vertical-align: top; color: #1e293b;">${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}
                </tbody>
              </table>`;
            } else if (block.type === "image" && block.imageUrl) {
              bodyInner += `<figure style="margin: 16px 0; text-align: center;">
                <img src="${escapeHtml(block.imageUrl)}" alt="${escapeHtml(block.imageAlt || '')}" style="max-height: 280px; max-width: 100%; border-radius: 6px; border: 1px solid #e2e8f0;" />
                ${block.imageAlt ? `<figcaption style="font-size: 9pt; color: #64748b; font-style: italic; margin-top: 6px;">${escapeHtml(block.imageAlt)}</figcaption>` : ""}
              </figure>`;
            } else if (block.type === "callout") {
              const isCrit = block.calloutType === "critical";
              const borderCol = isCrit ? "#f59e0b" : "#0284c7";
              const bgCol = isCrit ? "#fffbeb" : "#f0f9ff";
              const titleCol = isCrit ? "#b45309" : "#0369a1";
              bodyInner += `<div style="margin: 14px 0; padding: 12px 16px; border-left: 4px solid ${borderCol}; background-color: ${bgCol}; border-radius: 6px;">
                <div style="font-size: 10pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: ${titleCol}; margin-bottom: 4px;">
                  ${escapeHtml(block.calloutTitle || "Note")}
                </div>
                <p style="margin: 0; font-size: 10.5pt; line-height: 1.5; color: #1e293b;">${escapeHtml(block.content)}</p>
              </div>`;
            } else if (block.type === "palette") {
              bodyInner += `<div style="margin: 14px 0; padding: 12px 16px; border: 1px solid #e2e8f0; background-color: #f8fafc; border-radius: 8px;">
                <div style="font-size: 9.5pt; font-weight: bold; text-transform: uppercase; color: #64748b; letter-spacing: 1px; margin-bottom: 8px;">
                  Brand & Design Color Tokens
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">`;
              for (const c of block.colors || []) {
                bodyInner += `<div style="display: inline-flex; align-items: center; border: 1px solid #cbd5e1; background: #fff; padding: 4px 10px; border-radius: 6px; font-size: 9pt; margin-right: 6px; margin-bottom: 6px;">
                  <span style="display: inline-block; width: 14px; height: 14px; border-radius: 50%; background-color: ${c.hex}; border: 1px solid rgba(0,0,0,0.2); margin-right: 6px;"></span>
                  <span><strong>${escapeHtml(c.name)}</strong> <span style="color: #64748b; font-family: monospace;">(${c.hex})</span></span>
                </div>`;
              }
              bodyInner += `</div></div>`;
            } else if (block.type === "scene") {
              bodyInner += `<div style="margin: 16px 0; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background-color: #fff;">
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
              bodyInner += `<div style="display: inline-block; margin: 4px 6px 4px 0; padding: 4px 10px; background-color: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 9.5pt;">
                <strong style="color: #0284c7;">${escapeHtml(block.key || '')}:</strong> ${escapeHtml(block.value || '')}
              </div>`;
            } else if (block.type === "list") {
              bodyInner += `<ul style="margin: 8px 0; padding-left: 20px;">`;
              for (const item of block.listItems || []) {
                bodyInner += `<li style="margin-bottom: 4px; line-height: 1.5;">${escapeHtml(item)}</li>`;
              }
              bodyInner += `</ul>`;
            } else {
              bodyInner += `<p style="margin-bottom: 0.9rem; text-align: justify; line-height: ${config.lineSpacing};">${escapeHtml(block.content)}</p>`;
            }
          }
        }
        content = bodyInner;
      }

      return `<div class="a4-sheet" style="width: 210mm; height: 297mm; max-height: 297mm; overflow: hidden; padding: ${page.isCover ? "0" : "20mm"}; margin: 0 auto 20px auto; background: #fff; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; break-after: page; page-break-inside: avoid; break-inside: avoid;">
        ${!page.isCover ? `<div style="font-size: 9pt; color: #94a3b8; display: flex; justify-content: space-between; padding-bottom: 12px; margin-bottom: 16px; border-bottom: 1px solid #e2e8f0;">
          <span>${escapeHtml(config.headerText || config.docTitle || "Document")}</span>
          <span style="font-family: monospace;">${page.isToc ? "Table of Contents" : `A4 Page ${page.pageNumber}`}</span>
        </div>` : ""}
        <div style="flex: 1; overflow: hidden; ${page.isCover ? 'height: 100%;' : ''}">
          ${content}
        </div>
        ${!page.isCover ? `<div style="font-size: 9pt; font-family: monospace; color: #94a3b8; display: flex; justify-content: space-between; padding-top: 12px; margin-top: auto; border-top: 1px solid #e2e8f0;">
          <span>DocuMind Studio · A4 Document</span>
          <span>Page ${page.pageNumber} of ${page.totalPages}</span>
        </div>` : ""}
      </div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(config.docTitle)}</title>
<style>
  @page {
    size: A4 portrait;
    margin: 0;
  }
  @media print {
    body {
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
    }
    .a4-sheet {
      margin: 0 !important;
      border: none !important;
      box-shadow: none !important;
      page-break-after: always !important;
      break-after: page !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      width: 210mm !important;
      height: 296mm !important;
      max-height: 297mm !important;
      overflow: hidden !important;
      box-sizing: border-box !important;
    }
    .a4-sheet:last-child {
      page-break-after: auto !important;
      break-after: auto !important;
    }
  }
  body {
    font-family: ${fontCss};
    font-size: ${config.baseFontSize};
    line-height: ${config.lineSpacing};
    color: #1e293b;
    background: #f1f5f9;
    margin: 0;
    padding: 20px 0;
  }
</style>
</head>
<body>
  ${pagesHtml}
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
