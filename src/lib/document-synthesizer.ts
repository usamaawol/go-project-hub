/**
 * Document Synthesizer - High-Fidelity PDF & DOCX Generation
 *
 * Transforms documents, HTML, and text into publication-grade, executive PDFs and Word documents:
 * - Preserves semantic hierarchy: Titles, Subtitles, Headings 1-3
 * - Renders genuine multi-column tables with headers, borders, zebra striping, and cell wrapping
 * - Formats bullet lists with proper hanging indents
 * - Eliminates excessive blank line bloat (turning 72-page unstyled dumps into ~20-25 clean pages)
 * - Adds running headers and dynamic running footers with "Page X of Y" page numbering
 */

import { PDFDocument, StandardFonts, rgb, type PDFPage } from "pdf-lib";
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  Header,
  Footer,
  PageNumber,
  Packer,
  PageBreak,
} from "docx";
import type { AssignmentMetadata } from "./assignment-types";

export interface DocTableData {
  headers?: string[];
  rows: string[][];
}

export interface DocSynthesizerInlineRun {
  text: string;
  bold?: boolean;
  italics?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
  highlight?: string;
}

export interface SynthesizerExportOptions {
  hasCoverPage?: boolean;
  coverMetadata?: AssignmentMetadata;
  headerText?: string;
  docTitle?: string;
  docSubtitle?: string;
  institution?: string;
  authorName?: string;
  dateStr?: string;
  primaryColor?: string;
  secondaryColor?: string;
  identityPlacement?: "cover-only" | "first-body-page-only" | "both";
  bodyHtml?: string;
}

export interface DocSynthesizerBlock {
  type:
    | "title"
    | "subtitle"
    | "heading1"
    | "heading2"
    | "heading3"
    | "paragraph"
    | "list"
    | "table"
    | "divider";
  text?: string;
  runs?: DocSynthesizerInlineRun[];
  items?: string[];
  table?: DocTableData;
}


/**
 * Decodes standard HTML entities.
 */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&bull;/g, "•")
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = parseInt(dec, 10);
      return !isNaN(code) && code > 0 ? String.fromCharCode(code) : "";
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = parseInt(hex, 16);
      return !isNaN(code) && code > 0 ? String.fromCharCode(code) : "";
    });
}

function stripTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parses inline HTML tags (strong, b, em, i, u, s, span) into text runs
 */
export function parseInlineHtmlToRuns(html: string): DocSynthesizerInlineRun[] {
  if (!/<[^>]+>/.test(html)) {
    return [{ text: decodeHtmlEntities(html) }];
  }

  const runs: DocSynthesizerInlineRun[] = [];
  const tagRegex = /(<\/?(?:strong|b|em|i|u|s|strike|span|mark)(?:[^>]*)>)/gi;
  const parts = html.split(tagRegex);

  let isBold = false;
  let isItalic = false;
  let isUnderline = false;
  let isStrike = false;

  for (const part of parts) {
    if (!part) continue;
    const lower = part.toLowerCase();
    if (lower.startsWith("<strong") || lower.startsWith("<b")) {
      isBold = true;
    } else if (lower.startsWith("</strong") || lower.startsWith("</b")) {
      isBold = false;
    } else if (lower.startsWith("<em") || lower.startsWith("<i")) {
      isItalic = true;
    } else if (lower.startsWith("</em") || lower.startsWith("</i")) {
      isItalic = false;
    } else if (lower.startsWith("<u")) {
      isUnderline = true;
    } else if (lower.startsWith("</u")) {
      isUnderline = false;
    } else if (lower.startsWith("<s") || lower.startsWith("<strike")) {
      isStrike = true;
    } else if (lower.startsWith("</s") || lower.startsWith("</strike")) {
      isStrike = false;
    } else if (part.startsWith("<")) {
      // ignore other tags
    } else {
      const text = decodeHtmlEntities(part);
      if (text) {
        runs.push({
          text,
          bold: isBold,
          italics: isItalic,
          underline: isUnderline,
          strike: isStrike,
        });
      }
    }
  }

  return runs.length > 0 ? runs : [{ text: decodeHtmlEntities(stripTags(html)) }];
}

export function hexToRgb(hex?: string): { r: number; g: number; b: number } {
  if (!hex) return { r: 0.12, g: 0.23, b: 0.54 };
  let clean = hex.replace("#", "");
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return { r: 0.12, g: 0.23, b: 0.54 };
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}


/**
 * Parses rich HTML into structured document blocks (headings, paragraphs, lists, tables).
 */
export function parseHtmlToBlocks(html: string): DocSynthesizerBlock[] {
  const blocks: DocSynthesizerBlock[] = [];
  const cleanedHtml = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<img[^>]*>/gi, "");

  const blockRegex =
    /<(h[1-6]|table|ul|ol|p|hr|blockquote)(?:[^>]*)>([\s\S]*?)<\/\1>|<hr\s*\/?>/gi;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(cleanedHtml)) !== null) {
    const tag = (match[1] || "hr").toLowerCase();
    const content = match[2] || "";

    if (tag === "hr") {
      blocks.push({ type: "divider" });
    } else if (tag === "h1") {
      const text = stripTags(content);
      if (text) blocks.push({ type: "heading1", text });
    } else if (tag === "h2") {
      const text = stripTags(content);
      if (text) blocks.push({ type: "heading2", text });
    } else if (tag === "h3" || tag === "h4" || tag === "h5" || tag === "h6") {
      const text = stripTags(content);
      if (text) blocks.push({ type: "heading3", text });
    } else if (tag === "ul" || tag === "ol") {
      const items: string[] = [];
      const liRegex = /<li(?:[^>]*)>([\s\S]*?)<\/li>/gi;
      let liMatch: RegExpExecArray | null;
      while ((liMatch = liRegex.exec(content)) !== null) {
        const itemText = stripTags(liMatch[1] || "");
        if (itemText) items.push(itemText);
      }
      if (items.length > 0) blocks.push({ type: "list", items });
    } else if (tag === "table") {
      const rows: string[][] = [];
      const headers: string[] = [];
      const trRegex = /<tr(?:[^>]*)>([\s\S]*?)<\/tr>/gi;
      let trMatch: RegExpExecArray | null;

      while ((trMatch = trRegex.exec(content)) !== null) {
        const rowContent = trMatch[1] || "";
        const cellRegex = /<(td|th)(?:[^>]*)>([\s\S]*?)<\/\1>/gi;
        let cellMatch: RegExpExecArray | null;
        const rowCells: string[] = [];
        let isHeaderRow = false;

        while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
          if (cellMatch[1]?.toLowerCase() === "th") isHeaderRow = true;
          rowCells.push(stripTags(cellMatch[2] || ""));
        }

        if (rowCells.length > 0) {
          if (isHeaderRow && headers.length === 0) {
            headers.push(...rowCells);
          } else {
            rows.push(rowCells);
          }
        }
      }

      if (rows.length > 0 || headers.length > 0) {
        blocks.push({
          type: "table",
          table: { headers: headers.length > 0 ? headers : undefined, rows },
        });
      }
    } else if (tag === "p" || tag === "blockquote") {
      const text = stripTags(content);
      if (!text) continue;

      // Detect title or subtitle in initial paragraphs
      if (content.includes("<strong>") && text.length < 80 && blocks.length < 5) {
        if (blocks.length === 0 || blocks[0]?.type !== "title") {
          blocks.push({ type: "title", text });
        } else {
          blocks.push({ type: "subtitle", text });
        }
      } else {
        const runs = parseInlineHtmlToRuns(content);
        blocks.push({ type: "paragraph", text, runs });
      }
    }
  }

  return blocks;
}

/**
 * Parses plain text / markdown into structured document blocks.
 */
export function parsePlainTextToBlocks(text: string): DocSynthesizerBlock[] {
  // If text already contains HTML elements, route to HTML parser
  if (/<(p|div|table|h[1-6]|ul|ol|li)[^>]*>/i.test(text)) {
    return parseHtmlToBlocks(text);
  }

  const lines = text.split("\n");
  const blocks: DocSynthesizerBlock[] = [];
  let pendingListItems: string[] = [];
  let pendingParagraphLines: string[] = [];

  const flushParagraph = () => {
    if (pendingParagraphLines.length > 0) {
      const pText = pendingParagraphLines.join(" ").trim();
      if (pText) {
        blocks.push({ type: "paragraph", text: pText });
      }
      pendingParagraphLines = [];
    }
  };

  const flushList = () => {
    if (pendingListItems.length > 0) {
      blocks.push({ type: "list", items: [...pendingListItems] });
      pendingListItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i] || "";
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    // 0. Filter out page break / scan artifacts like "Page 4", "Page 5", "[Page 12]", "Page 3 of 10"
    if (
      /^(?:\[?\s*Page\s+\d+(?:\s+of\s+\d+)?\s*\]?|[-—–=]{1,3}\s*\d+\s*[-—–=]{1,3}|[-—–=]{3,}\s*Page\s*\d+.*)$/i.test(
        trimmed,
      )
    ) {
      flushParagraph();
      flushList();
      continue;
    }

    // 1. All-Caps Major Headings with Bullet: e.g. "• SCREENSHOTS AND VISUAL RECONSTRUCTION", "• FIREBASE INTEGRATION"
    const bulletHeadingMatch = trimmed.match(/^[•\-\*]\s+([A-Z0-9\s—–\-&/:,()]{3,75})$/);
    if (bulletHeadingMatch && !trimmed.includes(".")) {
      flushParagraph();
      flushList();
      const headingText = bulletHeadingMatch[1].trim();
      if (blocks.length === 0) {
        blocks.push({ type: "title", text: headingText });
      } else {
        blocks.push({ type: "heading1", text: headingText });
      }
      continue;
    }

    // 2. Alphabetic Section Headings: e.g. "A. Home", "B. Explore", "C. Saved Items and Favorites"
    const alphaHeadingMatch = trimmed.match(/^([A-Z])\.\s+([A-Za-z0-9\s—–\-&/:,()]{2,75})$/);
    if (alphaHeadingMatch && trimmed.length < 80) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading2", text: trimmed });
      continue;
    }

    // 3. Numbered Subsections: e.g. "1.1 Introduction", "2.3 API Specification", "3.2.1 Data Models"
    const numSubHeadingMatch = trimmed.match(/^(\d+\.\d+(?:\.\d+)*)\s+([A-Za-z0-9\s—–\-&/:,()]{2,85})$/);
    if (numSubHeadingMatch && trimmed.length < 90) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading2", text: trimmed });
      continue;
    }

    // 4. Markdown Table or Tab-delimited Table
    if (
      (/^\s*\|.+?\|\s*$/.test(trimmed) && i + 1 < lines.length && /\|/.test(lines[i + 1] || "")) ||
      (trimmed.includes("\t") && !trimmed.startsWith("•"))
    ) {
      flushParagraph();
      flushList();

      const tableRows: string[][] = [];
      let isMarkdown = /^\s*\|.+?\|\s*$/.test(trimmed);

      let j = i;
      while (j < lines.length) {
        const l = (lines[j] || "").trim();
        if (!l) break;

        if (isMarkdown && /^\s*\|[\s\-:|]+\|\s*$/.test(l)) {
          // Skip markdown divider line |---|---|
          j++;
          continue;
        }

        if (isMarkdown && /^\s*\|.+?\|\s*$/.test(l)) {
          const cells = l
            .replace(/^\|\s*/, "")
            .replace(/\s*\|$/, "")
            .split("|")
            .map((c) => c.trim());
          tableRows.push(cells);
          j++;
        } else if (!isMarkdown && l.includes("\t")) {
          const cells = l.split("\t").map((c) => c.trim());
          tableRows.push(cells);
          j++;
        } else {
          break;
        }
      }

      i = j - 1;
      if (tableRows.length > 0) {
        const headers = tableRows[0];
        const rows = tableRows.slice(1);
        blocks.push({
          type: "table",
          table: { headers, rows: rows.length > 0 ? rows : [headers || []] },
        });
      }
      continue;
    }

    // 2. Markdown Headings
    if (/^#\s+(.+)$/.test(trimmed)) {
      flushParagraph();
      flushList();
      const m = trimmed.match(/^#\s+(.+)$/);
      blocks.push({ type: "heading1", text: m?.[1]?.trim() || trimmed });
      continue;
    }

    if (/^##\s+(.+)$/.test(trimmed)) {
      flushParagraph();
      flushList();
      const m = trimmed.match(/^##\s+(.+)$/);
      blocks.push({ type: "heading2", text: m?.[1]?.trim() || trimmed });
      continue;
    }

    if (/^###\s+(.+)$/.test(trimmed)) {
      flushParagraph();
      flushList();
      const m = trimmed.match(/^###\s+(.+)$/);
      blocks.push({ type: "heading3", text: m?.[1]?.trim() || trimmed });
      continue;
    }

    // 3. Bullet or Numbered Lists
    if (/^([•\-\*]|\d+\.)\s+(.+)$/.test(trimmed)) {
      flushParagraph();
      const m = trimmed.match(/^([•\-\*]|\d+\.)\s+(.+)$/);
      pendingListItems.push(m?.[2]?.trim() || trimmed);
      continue;
    }

    // 4. Numbered Major Section (e.g. 1.0 Executive Summary, 12. GITHUB AND BACKUP)
    if (/^\d+(\.\d+)*\s+[A-Z0-9\s—–-]{3,60}$/.test(trimmed) && trimmed.length < 75) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading1", text: trimmed });
      continue;
    }

    // 5. All-Caps Short Headings
    if (
      /^[A-Z0-9\s—–\-:]{4,55}$/.test(trimmed) &&
      !trimmed.includes(".") &&
      trimmed.split(/\s+/).length <= 7
    ) {
      flushParagraph();
      flushList();
      if (blocks.length === 0) {
        blocks.push({ type: "title", text: trimmed });
      } else {
        blocks.push({ type: "heading2", text: trimmed });
      }
      continue;
    }

    // Regular line accumulator
    flushList();
    pendingParagraphLines.push(trimmed);
  }

  flushParagraph();
  flushList();

  return blocks;
}

/**
 * Cache for font-character compatibility testing to accelerate PDF rendering.
 */
const pdfCharSupportCache = new Map<string, boolean>();

function sanitizeLine(line: string, font: any): string {
  let result = "";
  const len = line.length;
  for (let i = 0; i < len; i++) {
    const ch = line[i]!;
    if (ch === "\t") {
      result += "    ";
      continue;
    }
    let supported = pdfCharSupportCache.get(ch);
    if (supported === undefined) {
      try {
        font.encodeText(ch);
        supported = true;
      } catch {
        supported = false;
      }
      pdfCharSupportCache.set(ch, supported);
    }
    result += supported ? ch : " ";
  }
  return result;
}

function wrapPdfText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
        let rem = word;
        while (rem.length > 0) {
          let sliceLen = rem.length;
          while (sliceLen > 1 && font.widthOfTextAtSize(rem.slice(0, sliceLen), fontSize) > maxWidth) {
            sliceLen--;
          }
          lines.push(rem.slice(0, sliceLen));
          rem = rem.slice(sliceLen);
        }
        currentLine = "";
      } else {
        currentLine = word;
      }
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [text];
}

/**
 * Generates an executive, publication-grade PDF from structured blocks using `pdf-lib`.
 */
export async function renderExecutivePdf(
  blocksOrTitle: DocSynthesizerBlock[] | string,
  titleOrBlocksOrOptions?: string | DocSynthesizerBlock[] | SynthesizerExportOptions,
  maybeOptions?: SynthesizerExportOptions,
): Promise<Uint8Array> {
  let blocks: DocSynthesizerBlock[] = [];
  let documentTitle: string | undefined;
  let options: SynthesizerExportOptions | undefined;

  if (Array.isArray(blocksOrTitle)) {
    blocks = blocksOrTitle;
    if (typeof titleOrBlocksOrOptions === "string") {
      documentTitle = titleOrBlocksOrOptions;
      options = maybeOptions;
    } else if (typeof titleOrBlocksOrOptions === "object" && titleOrBlocksOrOptions !== null) {
      options = titleOrBlocksOrOptions as SynthesizerExportOptions;
      documentTitle = options.docTitle;
    }
  } else if (typeof blocksOrTitle === "string") {
    documentTitle = blocksOrTitle;
    if (Array.isArray(titleOrBlocksOrOptions)) {
      blocks = titleOrBlocksOrOptions;
      options = maybeOptions;
    } else if (typeof titleOrBlocksOrOptions === "object" && titleOrBlocksOrOptions !== null) {
      options = titleOrBlocksOrOptions as SynthesizerExportOptions;
    }
  }

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Standard ISO A4 dimensions (210mm x 297mm at 72 dpi)
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  const bottomMargin = 52;

  const meta = options?.coverMetadata;
  const hasCoverPage = Boolean(options?.hasCoverPage || meta);
  const accentRgb = hexToRgb(options?.primaryColor || meta?.accentColor || "#1E3A8A");
  const identityPlacement = options?.identityPlacement || meta?.identityPlacement || "cover-only";
  const showOnCover = identityPlacement !== "first-body-page-only";
  const showOnFirstBody = identityPlacement === "first-body-page-only" || identityPlacement === "both";

  const mainTitle =
    options?.docTitle ||
    meta?.assignmentTitle ||
    documentTitle ||
    blocks.find((b) => b.type === "title" || b.type === "heading1")?.text ||
    "Document";

  // 1. If hasCoverPage, render Page 0 as Cover Page
  if (hasCoverPage) {
    const coverPage = pdfDoc.addPage([pageWidth, pageHeight]);

    // Top primary accent banner
    coverPage.drawRectangle({
      x: 0,
      y: pageHeight - 160,
      width: pageWidth,
      height: 160,
      color: rgb(accentRgb.r, accentRgb.g, accentRgb.b),
    });

    // Institution / University text
    const instText = sanitizeLine(
      (options?.institution || meta?.universityName || "DOCUMIND STUDIO").toUpperCase(),
      fontBold,
    );
    coverPage.drawText(instText, {
      x: margin,
      y: pageHeight - 75,
      size: 15,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    if (meta?.department || meta?.collegeOrFaculty) {
      const deptText = sanitizeLine(
        [meta.department, meta.collegeOrFaculty].filter(Boolean).join(" · "),
        fontRegular,
      );
      coverPage.drawText(deptText, {
        x: margin,
        y: pageHeight - 96,
        size: 10,
        font: fontRegular,
        color: rgb(0.85, 0.9, 0.98),
      });
    }

    // Document Title
    let yCover = pageHeight - 240;
    const coverTitle = sanitizeLine(mainTitle, fontBold);
    const wrappedCoverTitle = wrapPdfText(coverTitle, fontBold, 24, contentWidth);
    for (const line of wrappedCoverTitle) {
      coverPage.drawText(line, {
        x: margin,
        y: yCover,
        size: 24,
        font: fontBold,
        color: rgb(0.06, 0.09, 0.16),
      });
      yCover -= 28;
    }

    // Subtitle
    const sub = options?.docSubtitle || meta?.courseName;
    if (sub) {
      yCover -= 6;
      const wrappedSub = wrapPdfText(sanitizeLine(sub, fontRegular), fontRegular, 13, contentWidth);
      for (const line of wrappedSub) {
        coverPage.drawText(line, {
          x: margin,
          y: yCover,
          size: 13,
          font: fontRegular,
          color: rgb(0.35, 0.42, 0.52),
        });
        yCover -= 18;
      }
    }

    // Decorative rule
    yCover -= 12;
    coverPage.drawLine({
      start: { x: margin, y: yCover },
      end: { x: margin + 120, y: yCover },
      thickness: 3,
      color: rgb(accentRgb.r, accentRgb.g, accentRgb.b),
    });
    yCover -= 36;

    // Identity Information (if showOnCover)
    if (showOnCover) {
      if (meta?.assignmentType === "group") {
        const grpTitle = sanitizeLine(
          meta.groupName ? `PROJECT GROUP: ${meta.groupName.toUpperCase()}` : "PROJECT GROUP MEMBERS",
          fontBold,
        );
        coverPage.drawText(grpTitle, {
          x: margin,
          y: yCover,
          size: 12,
          font: fontBold,
          color: rgb(accentRgb.r, accentRgb.g, accentRgb.b),
        });
        yCover -= 20;

        for (const m of meta.groupMembers || []) {
          if (m && (m.fullName || m.studentId)) {
            const mLine = sanitizeLine(
              `• ${m.fullName || "Student"}${m.studentId ? ` (ID: ${m.studentId})` : ""}${m.role ? ` — ${m.role}` : ""}`,
              fontRegular,
            );
            coverPage.drawText(mLine, {
              x: margin + 8,
              y: yCover,
              size: 10,
              font: fontRegular,
              color: rgb(0.12, 0.16, 0.24),
            });
            yCover -= 16;
          }
        }
      } else {
        const studentName = options?.authorName || meta?.studentName;
        if (studentName) {
          coverPage.drawText("SUBMITTED BY:", {
            x: margin,
            y: yCover,
            size: 9.5,
            font: fontBold,
            color: rgb(0.45, 0.52, 0.62),
          });
          yCover -= 18;
          const sLine = sanitizeLine(
            `${studentName}${meta?.studentId ? `  (ID: ${meta.studentId})` : ""}`,
            fontBold,
          );
          coverPage.drawText(sLine, {
            x: margin,
            y: yCover,
            size: 14,
            font: fontBold,
            color: rgb(0.06, 0.09, 0.16),
          });
          yCover -= 28;
        }
      }
    }

    // Bottom Metadata Card
    let yBottom = 160;
    if (meta?.courseName || meta?.courseCode) {
      const cLine = sanitizeLine(
        `Course: ${meta.courseName || ""}${meta.courseCode ? ` (${meta.courseCode})` : ""}`,
        fontRegular,
      );
      coverPage.drawText(cLine, {
        x: margin,
        y: yBottom,
        size: 10.5,
        font: fontRegular,
        color: rgb(0.2, 0.25, 0.35),
      });
      yBottom -= 18;
    }
    if (meta?.instructorName) {
      const iLine = sanitizeLine(`Instructor: ${meta.instructorName}`, fontRegular);
      coverPage.drawText(iLine, {
        x: margin,
        y: yBottom,
        size: 10.5,
        font: fontRegular,
        color: rgb(0.2, 0.25, 0.35),
      });
      yBottom -= 18;
    }
    const subDate = options?.dateStr || meta?.submissionDate;
    if (subDate) {
      const dLine = sanitizeLine(`Submission Date: ${subDate}`, fontRegular);
      coverPage.drawText(dLine, {
        x: margin,
        y: yBottom,
        size: 10,
        font: fontRegular,
        color: rgb(0.45, 0.52, 0.62),
      });
    }

    coverPage.drawLine({
      start: { x: margin, y: 70 },
      end: { x: pageWidth - margin, y: 70 },
      thickness: 0.75,
      color: rgb(0.88, 0.9, 0.94),
    });
  }

  // 2. Body Pages
  let currentPage: PDFPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin - 15;

  const addNewPage = () => {
    currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin - 20;
  };

  // If showOnFirstBody, render Academic Identity Header on top of the first body page
  if (showOnFirstBody) {
    let yHeader = y;
    const headTitle = sanitizeLine(mainTitle, fontBold);
    currentPage.drawText(headTitle, {
      x: margin,
      y: yHeader,
      size: 16,
      font: fontBold,
      color: rgb(0.06, 0.09, 0.16),
    });
    yHeader -= 20;

    if (meta?.assignmentType === "group") {
      currentPage.drawText(
        sanitizeLine(meta.groupName ? `Group: ${meta.groupName}` : "Group Assignment", fontBold),
        {
          x: margin,
          y: yHeader,
          size: 11,
          font: fontBold,
          color: rgb(accentRgb.r, accentRgb.g, accentRgb.b),
        },
      );
      yHeader -= 16;
      for (const m of meta.groupMembers || []) {
        if (m && (m.fullName || m.studentId)) {
          currentPage.drawText(
            sanitizeLine(
              `• ${m.fullName || "Student"}${m.studentId ? ` (${m.studentId})` : ""}${m.role ? ` [${m.role}]` : ""}`,
              fontRegular,
            ),
            {
              x: margin + 8,
              y: yHeader,
              size: 9.5,
              font: fontRegular,
              color: rgb(0.12, 0.16, 0.24),
            },
          );
          yHeader -= 14;
        }
      }
    } else {
      const studentName = options?.authorName || meta?.studentName;
      if (studentName) {
        currentPage.drawText(
          sanitizeLine(`Author: ${studentName}${meta?.studentId ? ` (ID: ${meta.studentId})` : ""}`, fontRegular),
          {
            x: margin,
            y: yHeader,
            size: 10.5,
            font: fontRegular,
            color: rgb(0.12, 0.16, 0.24),
          },
        );
        yHeader -= 16;
      }
    }

    if (meta?.courseName || meta?.instructorName || options?.dateStr || meta?.submissionDate) {
      const metaSummary = sanitizeLine(
        [
          meta?.courseName ? `Course: ${meta.courseName}` : "",
          meta?.instructorName ? `Instructor: ${meta.instructorName}` : "",
          options?.dateStr || meta?.submissionDate ? `Date: ${options?.dateStr || meta.submissionDate}` : "",
        ]
          .filter(Boolean)
          .join("  |  "),
        fontRegular,
      );
      currentPage.drawText(metaSummary, {
        x: margin,
        y: yHeader,
        size: 9,
        font: fontRegular,
        color: rgb(0.45, 0.52, 0.62),
      });
      yHeader -= 14;
    }

    currentPage.drawLine({
      start: { x: margin, y: yHeader },
      end: { x: pageWidth - margin, y: yHeader },
      thickness: 0.5,
      color: rgb(0.88, 0.9, 0.94),
    });
    y = yHeader - 24;
  }


  for (let bIdx = 0; bIdx < blocks.length; bIdx++) {
    const block = blocks[bIdx]!;

    if (block.type === "title") {
      const text = sanitizeLine(block.text || "", fontBold);
      const wrapped = wrapPdfText(text, fontBold, 20, contentWidth);
      if (y - wrapped.length * 24 < bottomMargin) addNewPage();

      for (const line of wrapped) {
        currentPage.drawText(line, {
          x: margin,
          y,
          size: 20,
          font: fontBold,
          color: rgb(0.06, 0.09, 0.16),
        });
        y -= 24;
      }

      // Elegant blue accent bar
      currentPage.drawLine({
        start: { x: margin, y: y + 8 },
        end: { x: margin + 80, y: y + 8 },
        thickness: 3,
        color: rgb(0.15, 0.39, 0.92),
      });
      y -= 12;
    } else if (block.type === "subtitle") {
      const text = sanitizeLine(block.text || "", fontBold);
      const wrapped = wrapPdfText(text, fontBold, 10, contentWidth);
      if (y - wrapped.length * 14 < bottomMargin) addNewPage();

      for (const line of wrapped) {
        currentPage.drawText(line, {
          x: margin,
          y,
          size: 10,
          font: fontBold,
          color: rgb(0.35, 0.42, 0.52),
        });
        y -= 14;
      }
      y -= 8;
    } else if (block.type === "heading1") {
      const text = sanitizeLine(block.text || "", fontBold);
      const wrapped = wrapPdfText(text, fontBold, 13.5, contentWidth - 20);
      if (y - wrapped.length * 18 - 25 < bottomMargin) addNewPage();

      y -= 12;
      const barH = wrapped.length * 17;
      // Soft executive accent background card
      currentPage.drawRectangle({
        x: margin,
        y: y - barH + 8,
        width: contentWidth,
        height: barH + 10,
        color: rgb(0.95, 0.97, 1.0),
      });

      // Left blue ribbon
      currentPage.drawRectangle({
        x: margin,
        y: y - barH + 8,
        width: 4,
        height: barH + 10,
        color: rgb(0.14, 0.38, 0.92),
      });

      for (const line of wrapped) {
        currentPage.drawText(line, {
          x: margin + 12,
          y,
          size: 13.5,
          font: fontBold,
          color: rgb(0.08, 0.12, 0.22),
        });
        y -= 17;
      }

      // Subtle horizontal rule below section card
      currentPage.drawLine({
        start: { x: margin, y: y + 2 },
        end: { x: margin + contentWidth, y: y + 2 },
        thickness: 0.5,
        color: rgb(0.85, 0.88, 0.94),
      });
      y -= 8;
    } else if (block.type === "heading2") {
      const text = sanitizeLine(block.text || "", fontBold);
      const wrapped = wrapPdfText(text, fontBold, 11.5, contentWidth - 14);
      if (y - wrapped.length * 16 - 15 < bottomMargin) addNewPage();

      y -= 8;
      // Accent bullet dot
      currentPage.drawCircle({
        x: margin + 4,
        y: y + 4,
        size: 3,
        color: rgb(0.14, 0.38, 0.92),
      });

      for (const line of wrapped) {
        currentPage.drawText(line, {
          x: margin + 14,
          y,
          size: 11.5,
          font: fontBold,
          color: rgb(0.10, 0.15, 0.25),
        });
        y -= 16;
      }
      y -= 4;
    } else if (block.type === "heading3") {
      const text = sanitizeLine(block.text || "", fontBold);
      const wrapped = wrapPdfText(text, fontBold, 10.5, contentWidth);
      if (y - wrapped.length * 14 - 10 < bottomMargin) addNewPage();

      y -= 6;
      for (const line of wrapped) {
        currentPage.drawText(line, {
          x: margin,
          y,
          size: 10.5,
          font: fontBold,
          color: rgb(0.2, 0.25, 0.33),
        });
        y -= 14;
      }
      y -= 2;
    } else if (block.type === "paragraph") {
      const text = sanitizeLine(block.text || "", fontRegular);
      const isMeta =
        text.includes("@") ||
        text.includes("http") ||
        /\+\d{2,}/.test(text) ||
        text.includes("📍") ||
        text.includes("📞") ||
        text.includes("✉️") ||
        (text.includes("|") && text.length < 120);

      const fontSize = isMeta ? 8.5 : 9.5;
      const lineH = isMeta ? 11.5 : 13.5;
      const afterSpacing = isMeta ? 2.5 : 5.5;
      const color = isMeta ? rgb(0.28, 0.35, 0.45) : rgb(0.12, 0.16, 0.23);
      const wrapped = wrapPdfText(text, fontRegular, fontSize, contentWidth);

      for (const line of wrapped) {
        if (y < bottomMargin) addNewPage();
        currentPage.drawText(line, {
          x: margin,
          y,
          size: fontSize,
          font: fontRegular,
          color,
        });
        y -= lineH;
      }
      y -= afterSpacing;
    } else if (block.type === "list" && block.items) {
      for (const item of block.items) {
        const text = sanitizeLine(item, fontRegular);
        const wrapped = wrapPdfText(text, fontRegular, 9.5, contentWidth - 16);

        if (y - wrapped.length * 13.5 < bottomMargin) addNewPage();

        currentPage.drawText("•", {
          x: margin + 4,
          y,
          size: 10,
          font: fontBold,
          color: rgb(0.15, 0.39, 0.92),
        });

        for (const line of wrapped) {
          if (y < bottomMargin) addNewPage();
          currentPage.drawText(line, {
            x: margin + 16,
            y,
            size: 9.5,
            font: fontRegular,
            color: rgb(0.12, 0.16, 0.23),
          });
          y -= 13.5;
        }
        y -= 2;
      }
      y -= 4;
    } else if (block.type === "table" && block.table) {
      const tbl = block.table;
      const allRows: string[][] = [];
      if (tbl.headers && tbl.headers.length > 0) allRows.push(tbl.headers);
      for (const r of tbl.rows) allRows.push(r);

      const colCount = Math.max(...allRows.map((r) => r.length), 1);
      if (colCount > 0 && allRows.length > 0) {
        const colWidths: number[] = [];
        if (colCount === 2) {
          colWidths.push(Math.floor(contentWidth * 0.34));
          colWidths.push(contentWidth - colWidths[0]!);
        } else {
          const w = Math.floor(contentWidth / colCount);
          for (let c = 0; c < colCount; c++) colWidths.push(w);
        }

        y -= 6;
        for (let rIdx = 0; rIdx < allRows.length; rIdx++) {
          const row = allRows[rIdx]!;
          const isHeader = tbl.headers && rIdx === 0;

          const cellLines: string[][] = [];
          for (let c = 0; c < colCount; c++) {
            const rawCell = sanitizeLine(row[c] || "", isHeader ? fontBold : fontRegular);
            const w = (colWidths[c] || 100) - 10;
            cellLines.push(wrapPdfText(rawCell, isHeader ? fontBold : fontRegular, 9, w));
          }

          const maxLines = Math.max(...cellLines.map((cl) => cl.length), 1);
          const rowH = maxLines * 12 + 8;

          if (y - rowH < bottomMargin) {
            addNewPage();
            // Re-draw table header if table continues on new page
            if (tbl.headers && tbl.headers.length > 0 && !isHeader) {
              const hLines = tbl.headers.map((h, i) =>
                wrapPdfText(sanitizeLine(h, fontBold), fontBold, 9, (colWidths[i] || 100) - 10),
              );
              const hMax = Math.max(...hLines.map((cl) => cl.length), 1);
              const hH = hMax * 12 + 8;
              currentPage.drawRectangle({
                x: margin,
                y: y - hH,
                width: contentWidth,
                height: hH,
                color: rgb(0.95, 0.96, 0.98),
              });
              let curX = margin;
              for (let c = 0; c < colCount; c++) {
                let cellY = y - 10;
                for (const line of hLines[c] || []) {
                  currentPage.drawText(line, {
                    x: curX + 5,
                    y: cellY,
                    size: 9,
                    font: fontBold,
                    color: rgb(0.06, 0.09, 0.16),
                  });
                  cellY -= 12;
                }
                curX += colWidths[c] || 100;
              }
              y -= hH;
            }
          }

          // Shading
          if (isHeader) {
            currentPage.drawRectangle({
              x: margin,
              y: y - rowH,
              width: contentWidth,
              height: rowH,
              color: rgb(0.95, 0.96, 0.98),
            });
          } else if (rIdx % 2 === 1) {
            currentPage.drawRectangle({
              x: margin,
              y: y - rowH,
              width: contentWidth,
              height: rowH,
              color: rgb(0.98, 0.99, 1.0),
            });
          }

          // Bottom border
          currentPage.drawLine({
            start: { x: margin, y: y - rowH },
            end: { x: margin + contentWidth, y: y - rowH },
            thickness: 0.5,
            color: rgb(0.85, 0.88, 0.92),
          });

          // Draw cell text
          let curX = margin;
          for (let c = 0; c < colCount; c++) {
            let cellY = y - 9;
            const lines = cellLines[c] || [];
            const font = isHeader ? fontBold : fontRegular;
            const color = isHeader ? rgb(0.06, 0.09, 0.16) : rgb(0.12, 0.16, 0.23);

            for (const line of lines) {
              currentPage.drawText(line, {
                x: curX + 5,
                y: cellY,
                size: 9,
                font,
                color,
              });
              cellY -= 12;
            }
            curX += colWidths[c] || 100;
          }

          y -= rowH;
        }
        y -= 8;
      }
    }
  }

  // Running Header and Footer with "Page X of Y" on body pages
  const totalPages = pdfDoc.getPageCount();
  const startBodyPageIdx = hasCoverPage ? 1 : 0;
  const bodyPageCount = hasCoverPage ? Math.max(1, totalPages - 1) : totalPages;

  for (let p = startBodyPageIdx; p < totalPages; p++) {
    const page = pdfDoc.getPage(p);

    // Running Header (pages after the first body page)
    if (p > startBodyPageIdx) {
      page.drawLine({
        start: { x: margin, y: pageHeight - 38 },
        end: { x: margin + contentWidth, y: pageHeight - 38 },
        thickness: 0.5,
        color: rgb(0.88, 0.9, 0.94),
      });

      const headerTitle = sanitizeLine((options?.headerText || mainTitle).slice(0, 50), fontRegular);
      page.drawText(headerTitle, {
        x: margin,
        y: pageHeight - 32,
        size: 8,
        font: fontRegular,
        color: rgb(0.45, 0.52, 0.62),
      });

      page.drawText("DocuMind Document Studio", {
        x: margin + contentWidth - 140,
        y: pageHeight - 32,
        size: 8,
        font: fontRegular,
        color: rgb(0.55, 0.62, 0.72),
      });
    }

    // Running Footer on body pages
    page.drawLine({
      start: { x: margin, y: 44 },
      end: { x: margin + contentWidth, y: 44 },
      thickness: 0.5,
      color: rgb(0.88, 0.9, 0.94),
    });

    page.drawText("DocuMind · Verified Document Export", {
      x: margin,
      y: 30,
      size: 8,
      font: fontRegular,
      color: rgb(0.55, 0.62, 0.72),
    });

    const currentBodyNum = hasCoverPage ? p : p + 1;
    const pageLabel = `Page ${currentBodyNum} of ${bodyPageCount}`;
    const pageLabelW = fontBold.widthOfTextAtSize(pageLabel, 8.5);
    page.drawText(pageLabel, {
      x: margin + contentWidth - pageLabelW,
      y: 30,
      size: 8.5,
      font: fontBold,
      color: rgb(0.35, 0.42, 0.52),
    });
  }

  return await pdfDoc.save();
}

/**
 * Generates an executive Microsoft Word (.docx) document from structured blocks using `docx`.
 */
export async function renderExecutiveDocx(
  blocksOrTitle: DocSynthesizerBlock[] | string,
  titleOrBlocksOrOptions?: string | DocSynthesizerBlock[] | SynthesizerExportOptions,
  maybeOptions?: SynthesizerExportOptions,
): Promise<Uint8Array | Blob> {
  let blocks: DocSynthesizerBlock[] = [];
  let documentTitle: string | undefined;
  let options: SynthesizerExportOptions | undefined;

  if (Array.isArray(blocksOrTitle)) {
    blocks = blocksOrTitle;
    if (typeof titleOrBlocksOrOptions === "string") {
      documentTitle = titleOrBlocksOrOptions;
      options = maybeOptions;
    } else if (typeof titleOrBlocksOrOptions === "object" && titleOrBlocksOrOptions !== null) {
      options = titleOrBlocksOrOptions as SynthesizerExportOptions;
      documentTitle = options.docTitle;
    }
  } else if (typeof blocksOrTitle === "string") {
    documentTitle = blocksOrTitle;
    if (Array.isArray(titleOrBlocksOrOptions)) {
      blocks = titleOrBlocksOrOptions;
      options = maybeOptions;
    } else if (typeof titleOrBlocksOrOptions === "object" && titleOrBlocksOrOptions !== null) {
      options = titleOrBlocksOrOptions as SynthesizerExportOptions;
    }
  }

  const meta = options?.coverMetadata;
  const hasCoverPage = Boolean(options?.hasCoverPage || meta);
  const accent = (options?.primaryColor || meta?.accentColor || "#1E3A8A").replace("#", "");
  const identityPlacement = options?.identityPlacement || meta?.identityPlacement || "cover-only";
  const showOnCover = identityPlacement !== "first-body-page-only";
  const showOnFirstBody = identityPlacement === "first-body-page-only" || identityPlacement === "both";

  const mainTitle =
    options?.docTitle ||
    meta?.assignmentTitle ||
    documentTitle ||
    blocks.find((b) => b.type === "title" || b.type === "heading1")?.text ||
    "Document Title";

  const children: (Paragraph | Table)[] = [];

  for (const block of blocks) {
    if (block.type === "title") {
      children.push(
        new Paragraph({
          text: block.text || mainTitle,
          heading: HeadingLevel.TITLE,
          spacing: { before: 240, after: 120 },
        }),
      );
    } else if (block.type === "subtitle") {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: block.text || "",
              color: "475569",
              size: 22,
              bold: true,
            }),
          ],
          spacing: { after: 180 },
        }),
      );
    } else if (block.type === "heading1") {
      children.push(
        new Paragraph({
          text: block.text || "",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 300, after: 140 },
        }),
      );
    } else if (block.type === "heading2") {
      children.push(
        new Paragraph({
          text: block.text || "",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 100 },
        }),
      );
    } else if (block.type === "heading3") {
      children.push(
        new Paragraph({
          text: block.text || "",
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 180, after: 80 },
        }),
      );
    } else if (block.type === "paragraph") {
      if (block.runs && block.runs.length > 0) {
        children.push(
          new Paragraph({
            children: block.runs.map(
              (r) =>
                new TextRun({
                  text: r.text,
                  bold: r.bold,
                  italics: r.italics,
                  underline: r.underline ? {} : undefined,
                  strike: r.strike,
                  color: r.color ? r.color.replace("#", "") : "0F172A",
                  size: 21,
                }),
            ),
            spacing: { after: 120, line: 276 },
          }),
        );
      } else {
        const pText = block.text || "";
        const isMetaLine =
          pText.includes("@") ||
          pText.includes("http") ||
          /\+\d{2,}/.test(pText) ||
          pText.includes("📍") ||
          pText.includes("📞") ||
          pText.includes("✉️") ||
          (pText.includes("|") && pText.length < 120);

        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: pText,
                size: isMetaLine ? 19 : 21,
                color: isMetaLine ? "475569" : "0f172a",
              }),
            ],
            spacing: isMetaLine
              ? { after: 40, line: 240 }
              : { after: 120, line: 276 },
          }),
        );
      }
    } else if (block.type === "list" && block.items) {
      for (const item of block.items) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [new TextRun({ text: item, size: 21 })],
            spacing: { after: 60 },
          }),
        );
      }
    } else if (block.type === "table" && block.table) {
      const tbl = block.table;
      const allRows: string[][] = [];
      if (tbl.headers && tbl.headers.length > 0) allRows.push(tbl.headers);
      for (const r of tbl.rows) allRows.push(r);

      if (allRows.length > 0) {
        const tableRows = allRows.map((row, rIdx) => {
          const isHeader = tbl.headers && rIdx === 0;
          return new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: cell,
                          bold: isHeader,
                          size: 19,
                          color: isHeader ? "0F172A" : "1E293B",
                        }),
                      ],
                    }),
                  ],
                  shading: isHeader
                    ? { fill: "F1F5F9" }
                    : rIdx % 2 === 1
                      ? { fill: "F8FAFC" }
                      : undefined,
                  margins: { top: 100, bottom: 100, left: 140, right: 140 },
                }),
            ),
          });
        });

        children.push(
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
        );
        children.push(new Paragraph({ spacing: { after: 140 } }));
      }
    }
  }

  if (children.length === 0) {
    children.push(new Paragraph({ text: mainTitle || "Empty document" }));
  }

  // Construct Document with Sections
  let doc: Document;

  if (hasCoverPage) {
    const coverChildren: (Paragraph | Table)[] = [];

    // Top University / Institution Name
    coverChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: (options?.institution || meta?.universityName || "DOCUMIND STUDIO").toUpperCase(),
            bold: true,
            size: 24, // 12pt
            color: accent,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 1440, after: 120 },
      }),
    );

    if (meta?.department || meta?.collegeOrFaculty) {
      coverChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: [meta.department, meta.collegeOrFaculty].filter(Boolean).join(" · "),
              size: 20,
              color: "64748B",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 720 },
        }),
      );
    } else {
      coverChildren.push(new Paragraph({ spacing: { after: 720 } }));
    }

    // Main Document Title
    coverChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: mainTitle,
            bold: true,
            size: 52, // 26pt
            color: "0F172A",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 720, after: 240 },
      }),
    );

    const sub = options?.docSubtitle || meta?.courseName;
    if (sub) {
      coverChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: sub,
              italics: true,
              size: 24,
              color: "475569",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 720 },
        }),
      );
    }

    // Divider Line
    coverChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "―".repeat(28),
            bold: true,
            color: accent,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 1200 },
      }),
    );

    // Identity block on cover (if showOnCover)
    if (showOnCover) {
      if (meta?.assignmentType === "group") {
        coverChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: meta.groupName ? `PROJECT GROUP: ${meta.groupName.toUpperCase()}` : "ASSIGNMENT GROUP MEMBERS",
                bold: true,
                size: 22,
                color: accent,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 360, after: 180 },
          }),
        );

        const members = (meta.groupMembers || []).filter((m) => m && (m.fullName?.trim() || m.studentId?.trim()));
        if (members.length > 0) {
          for (const m of members) {
            coverChildren.push(
              new Paragraph({
                children: [
                  new TextRun({ text: "• ", bold: true, color: accent }),
                  new TextRun({ text: m.fullName || "Student", bold: true, size: 21 }),
                  m.studentId ? new TextRun({ text: ` (ID: ${m.studentId})`, size: 20, color: "64748B" }) : new TextRun(""),
                  m.role ? new TextRun({ text: ` — ${m.role}`, italics: true, size: 19, color: "475569" }) : new TextRun(""),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 80 },
              }),
            );
          }
        }
      } else {
        const studentName = options?.authorName || meta?.studentName;
        if (studentName) {
          coverChildren.push(
            new Paragraph({
              children: [
                new TextRun({ text: "SUBMITTED BY", bold: true, size: 18, color: "64748B" }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 360, after: 80 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: studentName, bold: true, size: 26, color: "0F172A" }),
                meta?.studentId ? new TextRun({ text: `  (ID: ${meta.studentId})`, size: 22, color: "475569" }) : new TextRun(""),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 360 },
            }),
          );
        }
      }
    }

    // Bottom details on cover
    if (meta?.courseName || meta?.courseCode) {
      coverChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Course: ", bold: true, size: 20, color: "64748B" }),
            new TextRun({ text: [meta.courseName, meta.courseCode ? `(${meta.courseCode})` : ""].filter(Boolean).join(" "), size: 21, color: "1E293B" }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
        }),
      );
    }

    if (meta?.instructorName) {
      coverChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Submitted To: ", bold: true, size: 20, color: "64748B" }),
            new TextRun({ text: meta.instructorName, size: 21, color: "1E293B" }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
        }),
      );
    }

    const subDate = options?.dateStr || meta?.submissionDate;
    if (subDate) {
      coverChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Submission Date: ", bold: true, size: 20, color: "64748B" }),
            new TextRun({ text: subDate, size: 21, color: "1E293B" }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
        }),
      );
    }

    // Section 2: Body Children
    const bodyChildren: (Paragraph | Table)[] = [];

    // If showOnFirstBody, render Academic Identity Header atop the opening body page
    if (showOnFirstBody) {
      bodyChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: mainTitle,
              bold: true,
              size: 32, // 16pt
              color: "0F172A",
            }),
          ],
          spacing: { before: 120, after: 80 },
        }),
      );

      if (meta?.assignmentType === "group") {
        const groupLabel = meta.groupName ? `Group: ${meta.groupName}` : "Group Submission";
        bodyChildren.push(
          new Paragraph({
            children: [
              new TextRun({ text: groupLabel, bold: true, size: 22, color: accent }),
            ],
            spacing: { after: 60 },
          }),
        );
        for (const m of meta?.groupMembers || []) {
          if (m && (m.fullName || m.studentId)) {
            bodyChildren.push(
              new Paragraph({
                children: [
                  new TextRun({ text: `• ${m.fullName || "Student"}`, size: 20 }),
                  m.studentId ? new TextRun({ text: ` (ID: ${m.studentId})`, size: 19, color: "64748B" }) : new TextRun(""),
                  m.role ? new TextRun({ text: ` [${m.role}]`, italics: true, size: 18, color: "475569" }) : new TextRun(""),
                ],
                spacing: { after: 40 },
              }),
            );
          }
        }
      } else {
        const studentName = options?.authorName || meta?.studentName;
        if (studentName) {
          bodyChildren.push(
            new Paragraph({
              children: [
                new TextRun({ text: "Author: ", bold: true, size: 20, color: "64748B" }),
                new TextRun({ text: studentName, bold: true, size: 21, color: "0F172A" }),
                meta?.studentId ? new TextRun({ text: ` (Student ID: ${meta.studentId})`, size: 20, color: "475569" }) : new TextRun(""),
              ],
              spacing: { after: 60 },
            }),
          );
        }
      }

      if (meta?.courseName || meta?.instructorName || subDate) {
        const details = [
          meta?.courseName ? `Course: ${meta.courseName}` : "",
          meta?.instructorName ? `Instructor: ${meta.instructorName}` : "",
          subDate ? `Date: ${subDate}` : "",
        ].filter(Boolean).join("  |  ");

        bodyChildren.push(
          new Paragraph({
            children: [
              new TextRun({ text: details, size: 19, color: "64748B" }),
            ],
            spacing: { after: 120 },
          }),
        );
      }

      bodyChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: "―".repeat(40), color: "CBD5E1" }),
          ],
          spacing: { after: 240 },
        }),
      );
    }

    bodyChildren.push(...children);

    doc = new Document({
      sections: [
        {
          properties: {
            page: {
              size: { width: 11906, height: 16838 },
              margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
            },
          },
          children: coverChildren,
        },
        {
          properties: {
            page: {
              size: { width: 11906, height: 16838 },
              margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
              pageNumbers: { start: 1 },
            },
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: (options?.headerText || mainTitle).slice(0, 50),
                      size: 18,
                      color: "94A3B8",
                    }),
                  ],
                  alignment: AlignmentType.RIGHT,
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: "DocuMind Document Studio · Page ", size: 18, color: "94A3B8" }),
                    PageNumber.CURRENT,
                    new TextRun({ text: " of ", size: 18, color: "94A3B8" }),
                    PageNumber.TOTAL_PAGES,
                  ],
                  alignment: AlignmentType.RIGHT,
                }),
              ],
            }),
          },
          children: bodyChildren,
        },
      ],
    });
  } else {
    doc = new Document({
      sections: [
        {
          properties: {
            page: {
              size: {
                width: 11906, // Standard ISO A4 width (210mm in twips)
                height: 16838, // Standard ISO A4 height (297mm in twips)
              },
              margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
            },
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: (options?.headerText || mainTitle).slice(0, 50),
                      size: 18,
                      color: "94A3B8",
                    }),
                  ],
                  alignment: AlignmentType.RIGHT,
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: "DocuMind Document Studio · Page ", size: 18, color: "94A3B8" }),
                    PageNumber.CURRENT,
                    new TextRun({ text: " of ", size: 18, color: "94A3B8" }),
                    PageNumber.TOTAL_PAGES,
                  ],
                  alignment: AlignmentType.RIGHT,
                }),
              ],
            }),
          },
          children,
        },
      ],
    });
  }

  if (typeof window === "undefined" && typeof (Packer as any).toBuffer === "function") {
    const nodeBuf = await (Packer as any).toBuffer(doc);
    return new Uint8Array(nodeBuf);
  }

  return await Packer.toBlob(doc);
}

/**
 * Universal document synthesizer converting text, HTML, or DOCX into publication-grade PDF or DOCX.
 */
export async function synthesizeDocument(
  source: {
    bytes?: Uint8Array;
    text?: string;
    html?: string;
    filename?: string;
  },
  targetFormat: "PDF" | "DOCX" | "DOC" | "TXT",
  options?: SynthesizerExportOptions,
): Promise<{
  data: Uint8Array | Blob;
  mimeType: string;
  filename: string;
  previewText: string;
  wordCount: number;
}> {
  const baseName = (source.filename || "document").replace(/\.[^/.]+$/, "");
  let blocks: DocSynthesizerBlock[] = [];
  let fullPlainText = source.text || "";

  // 1. If HTML is directly available
  if (source.html) {
    blocks = parseHtmlToBlocks(source.html);
  } else if (source.bytes && source.bytes.length > 4) {
    const isZip =
      source.bytes[0] === 0x50 &&
      source.bytes[1] === 0x4b &&
      source.bytes[2] === 0x03 &&
      source.bytes[3] === 0x04;

    if (isZip) {
      try {
        const mammoth = await import("mammoth");
        const nodeBuf =
          typeof Buffer !== "undefined"
            ? Buffer.isBuffer(source.bytes)
              ? source.bytes
              : Buffer.from(source.bytes.buffer, source.bytes.byteOffset, source.bytes.byteLength)
            : (source.bytes as any);
        const sliced = source.bytes.buffer.slice(
          source.bytes.byteOffset,
          source.bytes.byteOffset + source.bytes.byteLength,
        );
        const mRes = await mammoth.convertToHtml({
          buffer: nodeBuf,
          arrayBuffer: sliced,
        } as any);
        if (mRes.value) {
          blocks = parseHtmlToBlocks(mRes.value);
        }
      } catch (e) {
        console.warn("Mammoth HTML conversion fallback:", e);
      }
    }
  }

  // 2. Fallback to parsing plain text / HTML
  if (blocks.length === 0 && fullPlainText) {
    blocks = parsePlainTextToBlocks(fullPlainText);
  }

  // 3. Fallback to decoding raw bytes as text / HTML if text wasn't pre-extracted
  if (blocks.length === 0 && source.bytes && source.bytes.length > 0) {
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(source.bytes).trim();
    if (decoded.length > 0) {
      if (!fullPlainText) fullPlainText = decoded;
      blocks = parsePlainTextToBlocks(decoded);
    }
  }

  // Build clean plain text preview from blocks
  if (!fullPlainText && blocks.length > 0) {
    const lines: string[] = [];
    for (const b of blocks) {
      if (b.text) lines.push(b.text);
      if (b.items) lines.push(...b.items.map((i) => `• ${i}`));
      if (b.table) {
        if (b.table.headers) lines.push(b.table.headers.join(" | "));
        for (const r of b.table.rows) lines.push(r.join(" | "));
      }
    }
    fullPlainText = lines.join("\n\n");
  }

  const wordCount = fullPlainText.split(/\s+/).filter(Boolean).length;

  if (targetFormat === "TXT") {
    const txtData = new TextEncoder().encode(fullPlainText);
    return {
      data: txtData,
      mimeType: "text/plain; charset=utf-8",
      filename: `${baseName}.txt`,
      previewText: fullPlainText,
      wordCount,
    };
  }

  if (targetFormat === "PDF") {
    const pdfBytes = await renderExecutivePdf(blocks, baseName.replace(/_/g, " "), options);
    return {
      data: pdfBytes,
      mimeType: "application/pdf",
      filename: `${baseName}.pdf`,
      previewText: fullPlainText,
      wordCount,
    };
  }

  if (targetFormat === "DOCX" || targetFormat === "DOC") {
    const docxBlob = await renderExecutiveDocx(blocks, baseName.replace(/_/g, " "), options);
    const ext = targetFormat.toLowerCase();
    const mime =
      ext === "doc"
        ? "application/msword"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    return {
      data: docxBlob,
      mimeType: mime,
      filename: `${baseName}.${ext}`,
      previewText: fullPlainText,
      wordCount,
    };
  }


  throw new Error(`Unsupported conversion format: ${targetFormat}`);
}
