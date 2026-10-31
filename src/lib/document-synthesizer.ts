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
import type { AssignmentMetadata, CanvasCoverElement } from "./assignment-types";
import { getDefaultAssignmentMetadata } from "./assignment-types";
import { generateCoverElements } from "./cover-templates-registry";

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
  size?: number;
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
  removeDividers?: boolean;
  lineSpacing?: number;
  fontSize?: number;
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
  alignment?: "left" | "center" | "right" | "justify";
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
 * Normalizes CSS hex, rgb, or named colors into a clean 6-digit hex string (e.g. "2563EB").
 */
export function normalizeColorToHex(input?: string): string | undefined {
  if (!input) return undefined;
  const s = input.trim().toLowerCase();
  if (s === "transparent" || s === "inherit" || s === "initial" || s === "none") return undefined;

  // #RRGGBB or #RGB
  if (s.startsWith("#")) {
    const raw = s.replace("#", "");
    if (raw.length === 3) {
      return `${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`.toUpperCase();
    }
    if (raw.length === 6) {
      return raw.toUpperCase();
    }
    if (raw.length === 8) {
      return raw.slice(0, 6).toUpperCase();
    }
  }

  // rgb(r, g, b) or rgba(r, g, b, a)
  const rgbMatch = s.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) {
    const r = Math.min(255, Math.max(0, parseInt(rgbMatch[1]!, 10))).toString(16).padStart(2, "0");
    const g = Math.min(255, Math.max(0, parseInt(rgbMatch[2]!, 10))).toString(16).padStart(2, "0");
    const b = Math.min(255, Math.max(0, parseInt(rgbMatch[3]!, 10))).toString(16).padStart(2, "0");
    return `${r}${g}${b}`.toUpperCase();
  }

  // Common CSS named colors
  const namedMap: Record<string, string> = {
    black: "0F172A",
    white: "FFFFFF",
    red: "DC2626",
    blue: "2563EB",
    green: "059669",
    yellow: "EAB308",
    purple: "7C3AED",
    gray: "64748B",
    grey: "64748B",
    orange: "D97706",
    navy: "1E3A8A",
    teal: "0D9488",
  };
  if (namedMap[s]) {
    return namedMap[s];
  }

  return undefined;
}

/**
 * Parses inline HTML tags (strong, b, em, i, u, s, span, mark, font) into rich text runs.
 * Accurately preserves colors, highlights, fonts, and avoids false strikethroughs on <span>.
 */
export function parseInlineHtmlToRuns(html: string): DocSynthesizerInlineRun[] {
  if (!html) return [];
  if (!/<[^>]+>/.test(html)) {
    return [{ text: decodeHtmlEntities(html) }];
  }

  const runs: DocSynthesizerInlineRun[] = [];
  const tagRegex = /(<\/?(?:strong|b|em|i|u|s|strike|del|span|mark|font|small|sub|sup|br)(?:[^>]*)>|<br\s*\/?>)/gi;
  const parts = html.split(tagRegex);

  let boldCount = 0;
  let italicCount = 0;
  let underlineCount = 0;
  let strikeCount = 0;

  interface SpanStyleState {
    hasColor?: boolean;
    hasHighlight?: boolean;
    hasSize?: boolean;
    hasBold?: boolean;
    hasItalic?: boolean;
    hasUnderline?: boolean;
    hasStrike?: boolean;
  }
  const spanStack: SpanStyleState[] = [];
  const colorStack: string[] = [];
  const highlightStack: string[] = [];
  const sizeStack: number[] = [];

  for (const part of parts) {
    if (!part) continue;

    // Direct line break
    if (/^<br\s*\/?>$/i.test(part)) {
      runs.push({
        text: "\n",
        bold: boldCount > 0,
        italics: italicCount > 0,
        underline: underlineCount > 0,
        strike: strikeCount > 0,
        color: colorStack[colorStack.length - 1],
        highlight: highlightStack[highlightStack.length - 1],
        size: sizeStack[sizeStack.length - 1],
      });
      continue;
    }

    const isTag = part.startsWith("<") && part.endsWith(">");
    if (isTag) {
      // Strong / B
      if (/^<(?:strong|b)(?:[\s>])/i.test(part)) {
        boldCount++;
      } else if (/^<\/(?:strong|b)>/i.test(part)) {
        boldCount = Math.max(0, boldCount - 1);
      }
      // Em / I
      else if (/^<(?:em|i)(?:[\s>])/i.test(part)) {
        italicCount++;
      } else if (/^<\/(?:em|i)>/i.test(part)) {
        italicCount = Math.max(0, italicCount - 1);
      }
      // U (Underline)
      else if (/^<u(?:[\s>])/i.test(part)) {
        underlineCount++;
      } else if (/^<\/u>/i.test(part)) {
        underlineCount = Math.max(0, underlineCount - 1);
      }
      // S / Strike / Del (STRIKETHROUGH - strictly NOT <span or <small!)
      else if (/^<(?:s|strike|del)(?:[\s>])/i.test(part)) {
        strikeCount++;
      } else if (/^<\/(?:s|strike|del)>/i.test(part)) {
        strikeCount = Math.max(0, strikeCount - 1);
      }
      // Mark (Highlight)
      else if (/^<mark(?:[\s>])/i.test(part)) {
        const bgMatch = part.match(/background(?:-color)?:\s*([^;"]+)/i);
        const hex = normalizeColorToHex(bgMatch ? bgMatch[1] : undefined) || "FEF08A";
        highlightStack.push(hex);
      } else if (/^<\/mark>/i.test(part)) {
        highlightStack.pop();
      }
      // Font (Color)
      else if (/^<font(?:[\s>])/i.test(part)) {
        const colorMatch = part.match(/color=["']?([^"'>\s]+)/i);
        const hex = normalizeColorToHex(colorMatch ? colorMatch[1] : undefined);
        if (hex) colorStack.push(hex);
        spanStack.push({ hasColor: Boolean(hex) });
      } else if (/^<\/font>/i.test(part)) {
        const top = spanStack.pop();
        if (top?.hasColor) colorStack.pop();
      }
      // Span
      else if (/^<span(?:[\s>])/i.test(part)) {
        const state: SpanStyleState = {};
        const styleMatch = part.match(/style=["']([^"']*)["']/i);
        if (styleMatch && styleMatch[1]) {
          const styleStr = styleMatch[1];

          // 1. Text color
          const colorMatch = styleStr.match(/(?:^|;)\s*color:\s*([^;]+)/i);
          if (colorMatch) {
            const hex = normalizeColorToHex(colorMatch[1]);
            if (hex) {
              colorStack.push(hex);
              state.hasColor = true;
            }
          }

          // 2. Background color (highlight)
          const bgMatch = styleStr.match(/(?:^|;)\s*background(?:-color)?:\s*([^;]+)/i);
          if (bgMatch) {
            const hex = normalizeColorToHex(bgMatch[1]);
            if (hex) {
              highlightStack.push(hex);
              state.hasHighlight = true;
            }
          }

          // 3. Font weight (bold)
          if (/font-weight:\s*(bold|[6-9]00)/i.test(styleStr)) {
            boldCount++;
            state.hasBold = true;
          }

          // 4. Font style (italic)
          if (/font-style:\s*italic/i.test(styleStr)) {
            italicCount++;
            state.hasItalic = true;
          }

          // 5. Underline
          if (/text-decoration(?:-line)?:\s*[^;]*underline/i.test(styleStr)) {
            underlineCount++;
            state.hasUnderline = true;
          }

          // 6. Strikethrough
          if (/text-decoration(?:-line)?:\s*[^;]*line-through/i.test(styleStr)) {
            strikeCount++;
            state.hasStrike = true;
          }

          // 7. Font size
          const sizeMatch = styleStr.match(/font-size:\s*(\d+(?:\.\d+)?)\s*(px|pt)?/i);
          if (sizeMatch && sizeMatch[1]) {
            const val = parseFloat(sizeMatch[1]);
            const unit = (sizeMatch[2] || "px").toLowerCase();
            const pt = unit === "px" ? Math.round(val * 0.75) : Math.round(val);
            if (pt > 6 && pt < 72) {
              sizeStack.push(pt);
              state.hasSize = true;
            }
          }
        }
        spanStack.push(state);
      } else if (/^<\/span>/i.test(part)) {
        const state = spanStack.pop();
        if (state) {
          if (state.hasColor) colorStack.pop();
          if (state.hasHighlight) highlightStack.pop();
          if (state.hasSize) sizeStack.pop();
          if (state.hasBold) boldCount = Math.max(0, boldCount - 1);
          if (state.hasItalic) italicCount = Math.max(0, italicCount - 1);
          if (state.hasUnderline) underlineCount = Math.max(0, underlineCount - 1);
          if (state.hasStrike) strikeCount = Math.max(0, strikeCount - 1);
        }
      }
    } else {
      const text = decodeHtmlEntities(part);
      if (text) {
        runs.push({
          text,
          bold: boldCount > 0,
          italics: italicCount > 0,
          underline: underlineCount > 0,
          strike: strikeCount > 0,
          color: colorStack[colorStack.length - 1],
          highlight: highlightStack[highlightStack.length - 1],
          size: sizeStack[sizeStack.length - 1],
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

function escapeSvg(str?: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildCoverPageSvg(
  elements: CanvasCoverElement[],
  width = 794,
  height = 1123,
): string {
  const sorted = [...elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
  const innerItems = sorted
    .map((el) => {
      const opacity = el.opacity ?? 1;
      if (el.type === "shape") {
        if (el.svgContent) {
          let svgInner = el.svgContent.trim();
          if (svgInner.startsWith("<svg")) {
            svgInner = svgInner.replace(/^<svg[^>]*>/i, "").replace(/<\/svg>$/i, "");
          }
          return `<g transform="translate(${el.x}, ${el.y})" opacity="${opacity}">
            <svg width="${el.width}" height="${el.height}" viewBox="0 0 794 1123" preserveAspectRatio="none">
              ${svgInner}
            </svg>
          </g>`;
        }
        const rx = el.borderRadius || (el.shapeType === "circle" ? el.width / 2 : 0);
        return `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${rx}" ry="${rx}" fill="${el.fillColor || "transparent"}" stroke="${el.borderColor || "none"}" stroke-width="${el.borderWidth || 0}" opacity="${opacity}" />`;
      }
      if (el.type === "divider") {
        return `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" fill="${el.fillColor || "#CBD5E1"}" opacity="${opacity}" />`;
      }
      if (el.type === "image" && el.imageUrl) {
        return `<image href="${el.imageUrl}" x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" preserveAspectRatio="${el.imageFit === "cover" ? "xMidYMid slice" : "xMidYMid meet"}" opacity="${opacity}" />`;
      }
      if (el.type === "text" && el.text) {
        const fontSize = el.fontSize || 14;
        const fontFamily = el.fontFamily?.includes("serif")
          ? "serif"
          : el.fontFamily?.includes("mono")
            ? "monospace"
            : "sans-serif";
        const fontWeight = el.fontWeight || "normal";
        const fill = el.textColor || "#0F172A";
        const lines = el.text.split("\n");
        const lineHeight = (el.lineHeight || 1.25) * fontSize;
        const anchor = el.textAlign === "center" ? "middle" : el.textAlign === "right" ? "end" : "start";
        const textX = el.textAlign === "center" ? el.x + el.width / 2 : el.textAlign === "right" ? el.x + el.width : el.x;

        return lines
          .map((line, idx) => {
            const lineY = el.y + fontSize + idx * lineHeight;
            return `<text x="${textX}" y="${lineY}" text-anchor="${anchor}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}" fill="${fill}" opacity="${opacity}">${escapeSvg(line)}</text>`;
          })
          .join("\n");
      }
      return "";
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="#FFFFFF" />
    ${innerItems}
  </svg>`;
}

async function rasterizeSvgToPngBytes(
  svgString: string,
  targetWidth = 1588,
  targetHeight = 2246,
): Promise<Uint8Array | null> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }
  return new Promise((resolve) => {
    try {
      const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      const timer = setTimeout(() => {
        URL.revokeObjectURL(url);
        resolve(null);
      }, 3500);

      img.onload = () => {
        clearTimeout(timer);
        try {
          const canvas = document.createElement("canvas");
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            URL.revokeObjectURL(url);
            return resolve(null);
          }
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, targetWidth, targetHeight);
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          URL.revokeObjectURL(url);

          canvas.toBlob((b) => {
            if (!b) return resolve(null);
            const reader = new FileReader();
            reader.onloadend = () => {
              if (reader.result instanceof ArrayBuffer) {
                resolve(new Uint8Array(reader.result));
              } else {
                resolve(null);
              }
            };
            reader.onerror = () => resolve(null);
            reader.readAsArrayBuffer(b);
          }, "image/png", 0.98);
        } catch {
          URL.revokeObjectURL(url);
          resolve(null);
        }
      };

      img.onerror = () => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        resolve(null);
      };

      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

export function renderCoverElementsDirectlyToPdf(
  coverPage: PDFPage,
  elements: CanvasCoverElement[],
  pageWidth: number,
  pageHeight: number,
  fontBold: any,
  fontRegular: any,
  accentRgb: { r: number; g: number; b: number },
) {
  const scaleX = pageWidth / 794;
  const scaleY = pageHeight / 1123;
  const sorted = [...elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  for (const el of sorted) {
    const x = el.x * scaleX;
    const width = el.width * scaleX;
    const height = el.height * scaleY;
    const y = pageHeight - (el.y * scaleY + height);

    if (el.type === "shape" || el.type === "divider") {
      let fillColor = el.fillColor;
      if (!fillColor && el.svgContent) {
        fillColor = `rgb(${Math.round(accentRgb.r * 255)}, ${Math.round(accentRgb.g * 255)}, ${Math.round(accentRgb.b * 255)})`;
      }
      if (fillColor && fillColor !== "transparent") {
        const c = hexToRgb(fillColor);
        coverPage.drawRectangle({
          x: Math.max(0, x),
          y: Math.max(0, y),
          width: Math.min(pageWidth, width),
          height: Math.min(pageHeight, height),
          color: rgb(c.r, c.g, c.b),
          opacity: el.opacity ?? 1,
        });
      }
    } else if (el.type === "text" && el.text) {
      const rawFontSize = el.fontSize || 14;
      const pdfFontSize = Math.max(7, Math.round(rawFontSize * scaleY));
      const font =
        el.fontWeight === "bold" || el.fontWeight === "700" || el.fontWeight === "800"
          ? fontBold
          : fontRegular;
      const c = hexToRgb(el.textColor || "#0F172A");
      const lines = el.text.split("\n");
      const lineSpacing = (el.lineHeight || 1.25) * pdfFontSize;

      let curY = pageHeight - (el.y * scaleY + pdfFontSize);
      for (const line of lines) {
        const sanitized = sanitizeLine(line, font);
        if (!sanitized.trim()) {
          curY -= lineSpacing;
          continue;
        }
        let lineX = x;
        if (el.textAlign === "center") {
          try {
            const textWidth = font.widthOfTextAtSize(sanitized, pdfFontSize);
            lineX = x + Math.max(0, (width - textWidth) / 2);
          } catch {
            lineX = x;
          }
        } else if (el.textAlign === "right") {
          try {
            const textWidth = font.widthOfTextAtSize(sanitized, pdfFontSize);
            lineX = x + Math.max(0, width - textWidth);
          } catch {
            lineX = x;
          }
        }

        try {
          coverPage.drawText(sanitized, {
            x: Math.max(10, Math.min(pageWidth - 20, lineX)),
            y: Math.max(10, curY),
            size: pdfFontSize,
            font,
            color: rgb(c.r, c.g, c.b),
            opacity: el.opacity ?? 1,
          });
        } catch (e) {
          // ignore glyph encoding issues in fallback
        }
        curY -= lineSpacing;
      }
    }
  }
}


function extractColorFromTag(tagStr: string): string | undefined {
  const styleMatch = tagStr.match(/style=["']([^"']*)["']/i);
  if (styleMatch && styleMatch[1]) {
    const colorMatch = styleMatch[1].match(/(?:^|;)\s*color:\s*([^;]+)/i);
    if (colorMatch) {
      return normalizeColorToHex(colorMatch[1]);
    }
  }
  const colorAttrMatch = tagStr.match(/color=["']?([^"'>\s]+)/i);
  if (colorAttrMatch) {
    return normalizeColorToHex(colorAttrMatch[1]);
  }
  return undefined;
}

function extractBlockAlignment(fullTagMatch: string, content: string): "left" | "center" | "right" | "justify" | undefined {
  const combined = (fullTagMatch + " " + content).toLowerCase();
  if (combined.includes("text-align: center") || combined.includes("text-align:center") || combined.includes('align="center"')) return "center";
  if (combined.includes("text-align: right") || combined.includes("text-align:right") || combined.includes('align="right"')) return "right";
  if (combined.includes("text-align: justify") || combined.includes("text-align:justify") || combined.includes('align="justify"')) return "justify";
  if (combined.includes("text-align: left") || combined.includes("text-align:left") || combined.includes('align="left"')) return "left";
  return undefined;
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
    /<(h[1-6]|table|ul|ol|p|div|hr|blockquote)(?:[^>]*)>([\s\S]*?)<\/\1>|<hr\s*\/?>/gi;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(cleanedHtml)) !== null) {
    const fullTag = match[0] || "";
    const tag = (match[1] || "hr").toLowerCase();
    const content = match[2] || "";
    const tagColor = extractColorFromTag(fullTag);

    if (tag === "hr") {
      blocks.push({ type: "divider" });
    } else if (tag === "h1") {
      const text = stripTags(content);
      const runs = parseInlineHtmlToRuns(content);
      if (tagColor) runs.forEach((r) => { if (!r.color) r.color = tagColor; });
      if (text) blocks.push({ type: "heading1", text, runs, alignment: extractBlockAlignment(fullTag, content) });
    } else if (tag === "h2") {
      const text = stripTags(content);
      const runs = parseInlineHtmlToRuns(content);
      if (tagColor) runs.forEach((r) => { if (!r.color) r.color = tagColor; });
      if (text) blocks.push({ type: "heading2", text, runs, alignment: extractBlockAlignment(fullTag, content) });
    } else if (tag === "h3" || tag === "h4" || tag === "h5" || tag === "h6") {
      const text = stripTags(content);
      const runs = parseInlineHtmlToRuns(content);
      if (tagColor) runs.forEach((r) => { if (!r.color) r.color = tagColor; });
      if (text) blocks.push({ type: "heading3", text, runs, alignment: extractBlockAlignment(fullTag, content) });
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
    } else if (tag === "p" || tag === "div" || tag === "blockquote") {
      // If a container div contains nested block tags, recurse into inner blocks
      if (tag === "div" && /<(?:h[1-6]|p|table|ul|ol|blockquote)[\s>]/i.test(content)) {
        const innerBlocks = parseHtmlToBlocks(content);
        blocks.push(...innerBlocks);
        continue;
      }
      const text = stripTags(content);
      if (!text) continue;

      const runs = parseInlineHtmlToRuns(content);
      if (tagColor) runs.forEach((r) => { if (!r.color) r.color = tagColor; });
      const alignment = extractBlockAlignment(fullTag, content);
      blocks.push({ type: "paragraph", text, runs, alignment });
    }
  }

  if (blocks.length === 0) {
    const rawFallback = stripTags(cleanedHtml);
    if (rawFallback) {
      return parsePlainTextToBlocks(rawFallback);
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
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const fontBoldItalic = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

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

    const templateId = meta?.coverTemplateId || "canva-salford-wave";
    const rawElements =
      meta?.customCoverElements && meta.customCoverElements.length > 0
        ? meta.customCoverElements
        : generateCoverElements(templateId, meta || getDefaultAssignmentMetadata(), 794, 1123);

    // Sync titles and identity placement into elements
    const elements = rawElements
      .filter((el) => {
        if (
          !showOnCover &&
          (el.isMetadataField === "studentName" ||
            el.isMetadataField === "groupMembersList" ||
            el.id === "group-banner-card")
        ) {
          return false;
        }
        return true;
      })
      .map((el) => {
        if (el.isMetadataField === "assignmentTitle" && mainTitle) {
          return { ...el, text: mainTitle };
        }
        if (el.isMetadataField === "courseName" && (options?.docSubtitle || meta?.courseName)) {
          return { ...el, text: options?.docSubtitle || meta?.courseName || "" };
        }
        if (el.isMetadataField === "studentName" && (options?.authorName || meta?.studentName)) {
          return { ...el, text: options?.authorName || meta?.studentName || "" };
        }
        if (el.isMetadataField === "universityName" && (options?.institution || meta?.universityName)) {
          return { ...el, text: options?.institution || meta?.universityName || "" };
        }
        if (el.isMetadataField === "submissionDate" && (options?.dateStr || meta?.submissionDate)) {
          return { ...el, text: options?.dateStr || meta?.submissionDate || "" };
        }
        return el;
      });

    let renderedRaster = false;
    try {
      const svgString = buildCoverPageSvg(elements, 794, 1123);
      const pngBytes = await rasterizeSvgToPngBytes(svgString, 1588, 2246);
      if (pngBytes && pngBytes.length > 0) {
        const pngImage = await pdfDoc.embedPng(pngBytes);
        coverPage.drawImage(pngImage, {
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight,
        });
        renderedRaster = true;
      }
    } catch (e) {
      console.warn("High-res SVG rasterization fallback to vector PDF primitives:", e);
    }

    if (!renderedRaster) {
      renderCoverElementsDirectlyToPdf(
        coverPage,
        elements,
        pageWidth,
        pageHeight,
        fontBold,
        fontRegular,
        accentRgb,
      );
    }
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

      // Elegant blue accent bar (skip if removeDividers requested)
      if (!options?.removeDividers) {
        currentPage.drawLine({
          start: { x: margin, y: y + 8 },
          end: { x: margin + 80, y: y + 8 },
          thickness: 3,
          color: rgb(0.15, 0.39, 0.92),
        });
        y -= 12;
      } else {
        y -= 6;
      }
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

      const headColor1 = block.runs?.[0]?.color ? hexToRgb(block.runs[0].color) : undefined;
      const headPdfColor1 = headColor1 ? rgb(headColor1.r, headColor1.g, headColor1.b) : rgb(0.08, 0.12, 0.22);

      for (const line of wrapped) {
        currentPage.drawText(line, {
          x: margin + 12,
          y,
          size: 13.5,
          font: fontBold,
          color: headPdfColor1,
        });
        y -= 17;
      }

      // Subtle horizontal rule below section card (skip if removeDividers requested)
      if (!options?.removeDividers) {
        currentPage.drawLine({
          start: { x: margin, y: y + 2 },
          end: { x: margin + contentWidth, y: y + 2 },
          thickness: 0.5,
          color: rgb(0.85, 0.88, 0.94),
        });
        y -= 8;
      } else {
        y -= 4;
      }
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

      const headColor2 = block.runs?.[0]?.color ? hexToRgb(block.runs[0].color) : undefined;
      const headPdfColor2 = headColor2 ? rgb(headColor2.r, headColor2.g, headColor2.b) : rgb(0.10, 0.15, 0.25);

      for (const line of wrapped) {
        currentPage.drawText(line, {
          x: margin + 14,
          y,
          size: 11.5,
          font: fontBold,
          color: headPdfColor2,
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

      const fontSize = options?.fontSize || (isMeta ? 8.5 : 9.5);
      const lineMultiplier = options?.lineSpacing || 1.35;
      const lineH = Math.round(fontSize * lineMultiplier) + 1;
      const afterSpacing = isMeta ? 2.5 : 5.5;
      const color = isMeta ? rgb(0.28, 0.35, 0.45) : rgb(0.12, 0.16, 0.23);

      if (block.runs && block.runs.length > 0) {
        interface PdfWordToken {
          text: string;
          font: any;
          size: number;
          color: any;
          width: number;
          underline?: boolean;
          strike?: boolean;
          isNewline?: boolean;
        }

        const tokens: PdfWordToken[] = [];

        for (const run of block.runs) {
          const runFont =
            run.bold && run.italics
              ? fontBoldItalic
              : run.bold
                ? fontBold
                : run.italics
                  ? fontItalic
                  : fontRegular;
          const runSize = run.size || fontSize;
          const runRgb = run.color ? hexToRgb(run.color) : (isMeta ? { r: 0.28, g: 0.35, b: 0.45 } : { r: 0.12, g: 0.16, b: 0.23 });
          const pdfColor = rgb(runRgb.r, runRgb.g, runRgb.b);

          const runText = sanitizeLine(run.text || "", runFont);
          if (!runText) continue;

          // Split run text into sublines (for explicit newlines) and word/whitespace tokens
          const subLines = runText.split("\n");
          for (let sIdx = 0; sIdx < subLines.length; sIdx++) {
            if (sIdx > 0) {
              tokens.push({ text: "\n", font: runFont, size: runSize, color: pdfColor, width: 0, isNewline: true });
            }
            const parts = subLines[sIdx]!.split(/(\s+)/);
            for (const p of parts) {
              if (!p) continue;
              const pWidth = runFont.widthOfTextAtSize(p, runSize);
              tokens.push({
                text: p,
                font: runFont,
                size: runSize,
                color: pdfColor,
                width: pWidth,
                underline: run.underline,
                strike: run.strike,
              });
            }
          }
        }

        let currentLine: PdfWordToken[] = [];
        let currentLineWidth = 0;

        const flushLine = () => {
          if (currentLine.length === 0) return;
          if (y < bottomMargin) addNewPage();

          let startX = margin;
          if (block.alignment === "center") {
            startX = margin + Math.max(0, (contentWidth - currentLineWidth) / 2);
          } else if (block.alignment === "right") {
            startX = margin + Math.max(0, contentWidth - currentLineWidth);
          }

          let cursorX = startX;
          for (const tok of currentLine) {
            if (!tok.isNewline) {
              currentPage.drawText(tok.text, {
                x: cursorX,
                y,
                size: tok.size,
                font: tok.font,
                color: tok.color,
              });
              if (tok.underline) {
                currentPage.drawLine({
                  start: { x: cursorX, y: y - 1.5 },
                  end: { x: cursorX + tok.width, y: y - 1.5 },
                  thickness: 0.75,
                  color: tok.color,
                });
              }
              if (tok.strike) {
                currentPage.drawLine({
                  start: { x: cursorX, y: y + tok.size * 0.35 },
                  end: { x: cursorX + tok.width, y: y + tok.size * 0.35 },
                  thickness: 0.75,
                  color: tok.color,
                });
              }
            }
            cursorX += tok.width;
          }

          y -= lineH;
          currentLine = [];
          currentLineWidth = 0;
        };

        for (const tok of tokens) {
          if (tok.isNewline) {
            flushLine();
            continue;
          }
          if (currentLine.length === 0 && /^\s+$/.test(tok.text)) {
            continue;
          }
          if (currentLineWidth + tok.width > contentWidth && currentLine.length > 0) {
            flushLine();
            if (/^\s+$/.test(tok.text)) continue;
          }
          currentLine.push(tok);
          currentLineWidth += tok.width;
        }
        flushLine();
      } else {
        const wrapped = wrapPdfText(text, fontRegular, fontSize, contentWidth);
        for (const line of wrapped) {
          if (y < bottomMargin) addNewPage();
          let lineX = margin;
          if (block.alignment === "center") {
            const lw = fontRegular.widthOfTextAtSize(line, fontSize);
            lineX = margin + Math.max(0, (contentWidth - lw) / 2);
          } else if (block.alignment === "right") {
            const lw = fontRegular.widthOfTextAtSize(line, fontSize);
            lineX = margin + Math.max(0, contentWidth - lw);
          }
          currentPage.drawText(line, {
            x: lineX,
            y,
            size: fontSize,
            font: fontRegular,
            color,
          });
          y -= lineH;
        }
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
    }

    // Running Footer on body pages
    page.drawLine({
      start: { x: margin, y: 44 },
      end: { x: margin + contentWidth, y: 44 },
      thickness: 0.5,
      color: rgb(0.88, 0.9, 0.94),
    });

    if (options?.footerText) {
      page.drawText(sanitizeLine(options.footerText.slice(0, 60), fontRegular), {
        x: margin,
        y: 30,
        size: 8,
        font: fontRegular,
        color: rgb(0.55, 0.62, 0.72),
      });
    }

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
      const runs = block.runs && block.runs.length > 0 ? block.runs : undefined;
      children.push(
        new Paragraph({
          alignment:
            block.alignment === "center"
              ? AlignmentType.CENTER
              : block.alignment === "right"
                ? AlignmentType.RIGHT
                : block.alignment === "justify"
                  ? AlignmentType.JUSTIFIED
                  : AlignmentType.LEFT,
          heading: HeadingLevel.HEADING_1,
          children: runs
            ? runs.map(
                (r) =>
                  new TextRun({
                    text: r.text,
                    bold: true,
                    italics: r.italics,
                    underline: r.underline ? {} : undefined,
                    strike: r.strike,
                    color: r.color ? r.color.replace("#", "") : "0F172A",
                    size: r.size ? Math.round(r.size * 2) : 30,
                  }),
              )
            : [new TextRun({ text: block.text || "", bold: true, size: 30, color: "0F172A" })],
          spacing: { before: 300, after: 140 },
        }),
      );
    } else if (block.type === "heading2") {
      const runs = block.runs && block.runs.length > 0 ? block.runs : undefined;
      children.push(
        new Paragraph({
          alignment:
            block.alignment === "center"
              ? AlignmentType.CENTER
              : block.alignment === "right"
                ? AlignmentType.RIGHT
                : block.alignment === "justify"
                  ? AlignmentType.JUSTIFIED
                  : AlignmentType.LEFT,
          heading: HeadingLevel.HEADING_2,
          children: runs
            ? runs.map(
                (r) =>
                  new TextRun({
                    text: r.text,
                    bold: true,
                    italics: r.italics,
                    underline: r.underline ? {} : undefined,
                    strike: r.strike,
                    color: r.color ? r.color.replace("#", "") : "1E293B",
                    size: r.size ? Math.round(r.size * 2) : 26,
                  }),
              )
            : [new TextRun({ text: block.text || "", bold: true, size: 26, color: "1E293B" })],
          spacing: { before: 240, after: 100 },
        }),
      );
    } else if (block.type === "heading3") {
      const runs = block.runs && block.runs.length > 0 ? block.runs : undefined;
      children.push(
        new Paragraph({
          alignment:
            block.alignment === "center"
              ? AlignmentType.CENTER
              : block.alignment === "right"
                ? AlignmentType.RIGHT
                : block.alignment === "justify"
                  ? AlignmentType.JUSTIFIED
                  : AlignmentType.LEFT,
          heading: HeadingLevel.HEADING_3,
          children: runs
            ? runs.map(
                (r) =>
                  new TextRun({
                    text: r.text,
                    bold: true,
                    italics: r.italics,
                    underline: r.underline ? {} : undefined,
                    strike: r.strike,
                    color: r.color ? r.color.replace("#", "") : "334155",
                    size: r.size ? Math.round(r.size * 2) : 22,
                  }),
              )
            : [new TextRun({ text: block.text || "", bold: true, size: 22, color: "334155" })],
          spacing: { before: 180, after: 80 },
        }),
      );
    } else if (block.type === "paragraph") {
      const lineMultiplier = options?.lineSpacing || 1.15;
      const lineSpacingTwips = Math.round(lineMultiplier * 240);
      const baseFontSizeHalfPoints = options?.fontSize ? Math.round(options.fontSize * 2) : 21;

      if (block.runs && block.runs.length > 0) {
        children.push(
          new Paragraph({
            alignment:
              block.alignment === "center"
                ? AlignmentType.CENTER
                : block.alignment === "right"
                  ? AlignmentType.RIGHT
                  : block.alignment === "justify"
                    ? AlignmentType.JUSTIFIED
                    : AlignmentType.LEFT,
            children: block.runs.map(
              (r) =>
                new TextRun({
                  text: r.text,
                  bold: r.bold,
                  italics: r.italics,
                  underline: r.underline ? {} : undefined,
                  strike: r.strike,
                  color: r.color ? r.color.replace("#", "") : "0F172A",
                  size: r.size ? Math.round(r.size * 2) : baseFontSizeHalfPoints,
                }),
            ),
            spacing: { after: 120, line: lineSpacingTwips },
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
            alignment:
              block.alignment === "center"
                ? AlignmentType.CENTER
                : block.alignment === "right"
                  ? AlignmentType.RIGHT
                  : block.alignment === "justify"
                    ? AlignmentType.JUSTIFIED
                    : AlignmentType.LEFT,
            children: [
              new TextRun({
                text: pText,
                size: isMetaLine ? 19 : baseFontSizeHalfPoints,
                color: isMetaLine ? "475569" : "0f172a",
              }),
            ],
            spacing: isMetaLine
              ? { after: 40, line: 240 }
              : { after: 120, line: lineSpacingTwips },
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
    const institutionName = options?.institution || meta?.universityName || "";
    if (institutionName) {
      coverChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: institutionName.toUpperCase(),
              bold: true,
              size: 24, // 12pt
              color: accent,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 1440, after: 120 },
        }),
      );
    }

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
                    new TextRun({ text: "Page ", size: 18, color: "94A3B8" }),
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
                    new TextRun({ text: "Page ", size: 18, color: "94A3B8" }),
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
