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
  Packer,
} from "docx";

export interface DocTableData {
  headers?: string[];
  rows: string[][];
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
        blocks.push({ type: "paragraph", text });
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

    // 1. Markdown Table or Tab-delimited Table
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
  blocks: DocSynthesizerBlock[],
  documentTitle?: string,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 612; // Standard Letter
  const pageHeight = 792;
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;
  const bottomMargin = 55;

  let currentPage: PDFPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin - 15;

  const addNewPage = () => {
    currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin - 20;
  };

  const mainTitle =
    documentTitle ||
    blocks.find((b) => b.type === "title" || b.type === "heading1")?.text ||
    "Document";

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
      const wrapped = wrapPdfText(text, fontBold, 14, contentWidth - 14);
      if (y - wrapped.length * 18 - 25 < bottomMargin) addNewPage();

      y -= 10;
      const barH = wrapped.length * 16;
      currentPage.drawRectangle({
        x: margin,
        y: y - barH + 12,
        width: 3.5,
        height: barH,
        color: rgb(0.15, 0.39, 0.92),
      });

      for (const line of wrapped) {
        currentPage.drawText(line, {
          x: margin + 10,
          y,
          size: 14,
          font: fontBold,
          color: rgb(0.06, 0.09, 0.16),
        });
        y -= 18;
      }

      // Subtle horizontal rule
      currentPage.drawLine({
        start: { x: margin, y: y + 4 },
        end: { x: margin + contentWidth, y: y + 4 },
        thickness: 0.75,
        color: rgb(0.88, 0.9, 0.94),
      });
      y -= 8;
    } else if (block.type === "heading2") {
      const text = sanitizeLine(block.text || "", fontBold);
      const wrapped = wrapPdfText(text, fontBold, 12, contentWidth);
      if (y - wrapped.length * 16 - 15 < bottomMargin) addNewPage();

      y -= 8;
      for (const line of wrapped) {
        currentPage.drawText(line, {
          x: margin,
          y,
          size: 12,
          font: fontBold,
          color: rgb(0.12, 0.16, 0.23),
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
      const wrapped = wrapPdfText(text, fontRegular, 9.5, contentWidth);

      for (const line of wrapped) {
        if (y < bottomMargin) addNewPage();
        currentPage.drawText(line, {
          x: margin,
          y,
          size: 9.5,
          font: fontRegular,
          color: rgb(0.12, 0.16, 0.23),
        });
        y -= 13.5;
      }
      y -= 5;
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

  // Running Header and Footer with "Page X of Y" on all pages
  const totalPages = pdfDoc.getPageCount();
  for (let p = 0; p < totalPages; p++) {
    const page = pdfDoc.getPage(p);

    // Running Header (pages > 0)
    if (p > 0) {
      page.drawLine({
        start: { x: margin, y: pageHeight - 38 },
        end: { x: margin + contentWidth, y: pageHeight - 38 },
        thickness: 0.5,
        color: rgb(0.88, 0.9, 0.94),
      });

      const headerTitle = sanitizeLine(mainTitle.slice(0, 50), fontRegular);
      page.drawText(headerTitle, {
        x: margin,
        y: pageHeight - 32,
        size: 8,
        font: fontRegular,
        color: rgb(0.45, 0.52, 0.62),
      });

      page.drawText("DocuMind Converted Document", {
        x: margin + contentWidth - 140,
        y: pageHeight - 32,
        size: 8,
        font: fontRegular,
        color: rgb(0.55, 0.62, 0.72),
      });
    }

    // Running Footer (all pages)
    page.drawLine({
      start: { x: margin, y: 44 },
      end: { x: margin + contentWidth, y: 44 },
      thickness: 0.5,
      color: rgb(0.88, 0.9, 0.94),
    });

    page.drawText("DocuMind · Verified Document Conversion", {
      x: margin,
      y: 30,
      size: 8,
      font: fontRegular,
      color: rgb(0.55, 0.62, 0.72),
    });

    const pageLabel = `Page ${p + 1} of ${totalPages}`;
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
  blocks: DocSynthesizerBlock[],
  documentTitle?: string,
): Promise<Uint8Array | Blob> {
  const children: (Paragraph | Table)[] = [];

  for (const block of blocks) {
    if (block.type === "title") {
      children.push(
        new Paragraph({
          text: block.text || documentTitle || "Document Title",
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
      children.push(
        new Paragraph({
          children: [new TextRun({ text: block.text || "", size: 21 })],
          spacing: { after: 120, line: 276 },
        }),
      );
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
    children.push(new Paragraph({ text: documentTitle || "Empty document" }));
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      },
    ],
  });

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
    const pdfBytes = await renderExecutivePdf(blocks, baseName.replace(/_/g, " "));
    return {
      data: pdfBytes,
      mimeType: "application/pdf",
      filename: `${baseName}.pdf`,
      previewText: fullPlainText,
      wordCount,
    };
  }

  if (targetFormat === "DOCX" || targetFormat === "DOC") {
    const docxBlob = await renderExecutiveDocx(blocks, baseName.replace(/_/g, " "));
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
