/**
 * Robust Word & Document Text Extractor
 *
 * Supports all flavors of Word and text documents:
 * 1. Modern DOCX (Office OpenXML ZIP, via Mammoth + XML fallback)
 * 2. HTML Word Documents (.doc exported as HTML, e.g. Google Docs/DocuMind/web exports)
 * 3. RTF Word Documents (.rtf / .doc in Rich Text Format)
 * 4. Legacy Binary Word 97-2004 (.doc CFBF / OLE2 Compound File Binary Format with Piece Table)
 * 5. Plain Text / Markdown / CSV (.txt, .md, .csv)
 *
 * Works identically across Browser, Web Workers, Vercel Edge/Serverless, and Node.js.
 */

export interface DocExtractionResult {
  text: string;
  wordCount: number;
  lineCount: number;
  format: "docx" | "doc" | "rtf" | "html" | "txt";
}

/**
 * Decodes standard HTML entities to their character equivalents.
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
    .replace(/&hellip;/g, "…")
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

/**
 * Extracts clean, readable text from HTML documents while preserving paragraphs,
 * headings, list bullets, and table formatting.
 */
export function extractTextFromHtml(html: string): string {
  let cleaned = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // Convert line breaks and structural tags to appropriate newlines
  cleaned = cleaned
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|tr|blockquote|section|article)>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<\/li>/gi, "")
    .replace(/<\/(td|th)>/gi, "\t")
    .replace(/<[^>]+>/g, "");

  cleaned = decodeHtmlEntities(cleaned);

  // Normalize line breaks and spaces without losing structure
  const rawLines = cleaned.split("\n");
  const resultLines: string[] = [];
  let prevEmpty = false;

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (!prevEmpty && resultLines.length > 0) {
        resultLines.push("");
        prevEmpty = true;
      }
    } else {
      resultLines.push(trimmed);
      prevEmpty = false;
    }
  }

  return resultLines.join("\n").trim();
}

/**
 * Extracts clean text from RTF (Rich Text Format) documents.
 */
export function extractTextFromRtf(rtf: string): string {
  // Strip destination groups that do not contain visible document text
  let text = rtf.replace(/\{\\\*[\s\S]*?\}/g, "");
  text = text.replace(/\{\\(?:fonttbl|colortbl|stylesheet|info|pict|nonshppict)[\s\S]*?\}/gi, "");

  // Convert paragraph and formatting control words
  text = text.replace(/\\par(?:\s+|$)/gi, "\n");
  text = text.replace(/\\line(?:\s+|$)/gi, "\n");
  text = text.replace(/\\tab(?:\s+|$)/gi, "\t");

  // Hex escapes \'xx (e.g., \'e9 -> é)
  text = text.replace(/\\'([0-9a-fA-F]{2})/g, (_, hex) => {
    const code = parseInt(hex, 16);
    return !isNaN(code) ? String.fromCharCode(code) : "";
  });

  // Unicode escapes \uNNNN? (e.g., \u8220?)
  text = text.replace(/\\u(-?\d+)(?:\?[ ]?|[ ])?/g, (_, dec) => {
    let code = parseInt(dec, 10);
    if (code < 0) code += 65536;
    return !isNaN(code) && code > 0 ? String.fromCharCode(code) : "";
  });

  // Strip remaining control words \keyword or \keyword-123
  text = text.replace(/\\[a-zA-Z]+-?\d*[ ]?/g, "");

  // Strip group brackets
  text = text.replace(/[{}]/g, "");

  // Normalize whitespace
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

/**
 * Compound File Binary Format (CFBF / OLE2) Sector & Stream Reader
 */
interface OleDirectoryEntry {
  name: string;
  type: number;
  startSector: number;
  size: number;
}

class Ole2Reader {
  private view: DataView;
  private bytes: Uint8Array;
  private sectorSize: number;
  private miniSectorSize: number;
  private fat: number[] = [];
  private miniFat: number[] = [];
  private miniStream: Uint8Array = new Uint8Array(0);
  public entries: Map<string, OleDirectoryEntry> = new Map();

  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    const sectorShift = this.view.getUint16(0x1e, true);
    this.sectorSize = 1 << sectorShift;
    const miniSectorShift = this.view.getUint16(0x20, true);
    this.miniSectorSize = 1 << miniSectorShift;

    this.loadFat();
    this.loadDirectory();
    this.loadMiniFat();
  }

  private getSectorOffset(sect: number): number {
    return (sect + 1) * this.sectorSize;
  }

  private loadFat(): void {
    const numFatSectors = this.view.getUint32(0x2c, true);
    const fatSectorIds: number[] = [];

    // First 109 FAT sectors from header
    for (let i = 0; i < 109 && i < numFatSectors; i++) {
      const sect = this.view.getUint32(0x4c + i * 4, true);
      if (sect < 0xfffffffa) {
        fatSectorIds.push(sect);
      }
    }

    // Additional DIFAT sectors if document is very large (> 6.8MB)
    const numDifatSectors = this.view.getUint32(0x48, true);
    let nextDifat = this.view.getUint32(0x44, true);
    for (let d = 0; d < numDifatSectors && nextDifat < 0xfffffffa; d++) {
      const offset = this.getSectorOffset(nextDifat);
      const entriesPerSector = this.sectorSize / 4;
      for (let i = 0; i < entriesPerSector - 1; i++) {
        if (offset + i * 4 + 4 <= this.bytes.length) {
          const sect = this.view.getUint32(offset + i * 4, true);
          if (sect < 0xfffffffa) {
            fatSectorIds.push(sect);
          }
        }
      }
      nextDifat = this.view.getUint32(offset + (entriesPerSector - 1) * 4, true);
    }

    // Build FAT lookup table
    for (const fatSect of fatSectorIds) {
      const offset = this.getSectorOffset(fatSect);
      const entries = this.sectorSize / 4;
      for (let i = 0; i < entries; i++) {
        if (offset + i * 4 + 4 <= this.bytes.length) {
          this.fat.push(this.view.getUint32(offset + i * 4, true));
        }
      }
    }
  }

  private readSectorChain(startSector: number, totalSize?: number): Uint8Array {
    const chunks: Uint8Array[] = [];
    let cur = startSector;
    let bytesRead = 0;

    while (cur < 0xfffffffa && cur < this.fat.length) {
      const offset = this.getSectorOffset(cur);
      if (offset >= this.bytes.length) break;
      const take = Math.min(this.sectorSize, this.bytes.length - offset);
      chunks.push(this.bytes.subarray(offset, offset + take));
      bytesRead += take;

      if (totalSize !== undefined && bytesRead >= totalSize) break;
      const next = this.fat[cur];
      if (next === undefined || next === cur) break;
      cur = next;
    }

    const result = new Uint8Array(bytesRead);
    let pos = 0;
    for (const c of chunks) {
      result.set(c, pos);
      pos += c.length;
    }
    return totalSize !== undefined && totalSize < result.length
      ? result.subarray(0, totalSize)
      : result;
  }

  private loadDirectory(): void {
    const dirStart = this.view.getUint32(0x30, true);
    const dirBytes = this.readSectorChain(dirStart);
    const dirView = new DataView(dirBytes.buffer, dirBytes.byteOffset, dirBytes.byteLength);

    const numEntries = Math.floor(dirBytes.length / 128);
    for (let i = 0; i < numEntries; i++) {
      const entryOffset = i * 128;
      const nameLen = dirView.getUint16(entryOffset + 0x40, true);
      if (nameLen <= 2) continue;

      let name = "";
      const charCount = Math.floor((nameLen - 2) / 2);
      for (let c = 0; c < charCount; c++) {
        const code = dirView.getUint16(entryOffset + c * 2, true);
        name += String.fromCharCode(code);
      }

      const type = dirView.getUint8(entryOffset + 0x42);
      const startSector = dirView.getUint32(entryOffset + 0x74, true);
      const size = dirView.getUint32(entryOffset + 0x78, true);

      this.entries.set(name.toLowerCase(), { name, type, startSector, size });
    }
  }

  private loadMiniFat(): void {
    const miniFatStart = this.view.getUint32(0x3c, true);
    if (miniFatStart >= 0xfffffffa) return;

    const miniFatBytes = this.readSectorChain(miniFatStart);
    const miniFatView = new DataView(
      miniFatBytes.buffer,
      miniFatBytes.byteOffset,
      miniFatBytes.byteLength,
    );
    const count = Math.floor(miniFatBytes.length / 4);
    for (let i = 0; i < count; i++) {
      this.miniFat.push(miniFatView.getUint32(i * 4, true));
    }

    const rootEntry = this.entries.get("root entry");
    if (rootEntry && rootEntry.startSector < 0xfffffffa) {
      this.miniStream = this.readSectorChain(rootEntry.startSector, rootEntry.size);
    }
  }

  public getStream(name: string): Uint8Array | null {
    const entry = this.entries.get(name.toLowerCase());
    if (!entry) return null;

    if (entry.size < 4096 && this.miniStream.length > 0) {
      // Mini stream chain
      const chunks: Uint8Array[] = [];
      let cur = entry.startSector;
      let bytesRead = 0;

      while (cur < 0xfffffffa && cur < this.miniFat.length) {
        const offset = cur * this.miniSectorSize;
        if (offset >= this.miniStream.length) break;
        const take = Math.min(this.miniSectorSize, this.miniStream.length - offset);
        chunks.push(this.miniStream.subarray(offset, offset + take));
        bytesRead += take;

        if (bytesRead >= entry.size) break;
        const next = this.miniFat[cur];
        if (next === undefined || next === cur) break;
        cur = next;
      }

      const res = new Uint8Array(bytesRead);
      let pos = 0;
      for (const c of chunks) {
        res.set(c, pos);
        pos += c.length;
      }
      return entry.size < res.length ? res.subarray(0, entry.size) : res;
    }

    return this.readSectorChain(entry.startSector, entry.size);
  }
}

/**
 * Extracts pure, pristine text from a binary Word 97-2004 (.doc) file by parsing
 * the OLE2 Compound File structure and reading the WordDocument stream Piece Table (CLX/Plcfpcd).
 */
export function extractTextFromBinaryDoc(bytes: Uint8Array): string {
  try {
    const reader = new Ole2Reader(bytes);
    const wordDocStream = reader.getStream("worddocument");
    if (!wordDocStream || wordDocStream.length < 512) {
      return fallbackBinaryTextScanner(bytes);
    }

    const wordView = new DataView(
      wordDocStream.buffer,
      wordDocStream.byteOffset,
      wordDocStream.byteLength,
    );

    // Verify Word FIB identifier
    const wIdent = wordView.getUint16(0x00, true);
    if (wIdent !== 0xa5ec) {
      return fallbackBinaryTextScanner(wordDocStream);
    }

    const flags = wordView.getUint16(0x0a, true);
    const use1Table = (flags & 0x0200) !== 0;
    const tableStreamName = use1Table ? "1table" : "0table";
    const tableStream = reader.getStream(tableStreamName);

    if (!tableStream || tableStream.length === 0) {
      return fallbackBinaryTextScanner(wordDocStream);
    }

    const tableView = new DataView(
      tableStream.buffer,
      tableStream.byteOffset,
      tableStream.byteLength,
    );

    // Read fcClx and lcbClx from FIB (offset 0x01A2 for Word 97-2003)
    if (wordDocStream.length < 0x01aa) {
      return fallbackBinaryTextScanner(wordDocStream);
    }

    const fcClx = wordView.getUint32(0x01a2, true);
    const lcbClx = wordView.getUint32(0x01a6, true);

    if (fcClx + lcbClx > tableStream.length || lcbClx === 0) {
      return fallbackBinaryTextScanner(wordDocStream);
    }

    // Parse CLX structure in Table Stream to locate Piece Table (clxt = 0x02)
    let clxPos = fcClx;
    const clxEnd = fcClx + lcbClx;
    let pieceTableOffset = -1;
    let pieceTableLcb = 0;

    while (clxPos < clxEnd) {
      const clxt = tableView.getUint8(clxPos);
      if (clxt === 0x01) {
        // clxtGrfhic
        const cbGrfhic = tableView.getUint16(clxPos + 1, true);
        clxPos += 3 + cbGrfhic;
      } else if (clxt === 0x02) {
        // clxtPlcfpcd (Piece Table)
        pieceTableLcb = tableView.getUint32(clxPos + 1, true);
        pieceTableOffset = clxPos + 5;
        break;
      } else {
        break;
      }
    }

    if (pieceTableOffset === -1 || pieceTableLcb < 4) {
      return fallbackBinaryTextScanner(wordDocStream);
    }

    const pieceCount = Math.floor((pieceTableLcb - 4) / 12);
    if (pieceCount <= 0 || pieceCount > 100000) {
      return fallbackBinaryTextScanner(wordDocStream);
    }

    // Read CP (Character Position) array: (pieceCount + 1) entries
    const cps: number[] = [];
    for (let i = 0; i <= pieceCount; i++) {
      cps.push(tableView.getUint32(pieceTableOffset + i * 4, true));
    }

    // Read PCD (Piece Descriptor) array: pieceCount entries (8 bytes each)
    const pcdStart = pieceTableOffset + (pieceCount + 1) * 4;
    const piecesText: string[] = [];

    for (let i = 0; i < pieceCount; i++) {
      const charCount = (cps[i + 1] ?? 0) - (cps[i] ?? 0);
      if (charCount <= 0) continue;

      const pcdOffset = pcdStart + i * 8;
      if (pcdOffset + 6 > tableStream.length) break;

      const fc = tableView.getUint32(pcdOffset + 2, true);
      const isCompressed = (fc & 0x40000000) !== 0;

      if (isCompressed) {
        // 8-bit CP1252 / Latin-1 compressed text
        const byteOffset = (fc & 0x3fffffff) >>> 1;
        if (byteOffset + charCount <= wordDocStream.length) {
          const slice = wordDocStream.subarray(byteOffset, byteOffset + charCount);
          let s = "";
          for (let b = 0; b < slice.length; b++) {
            const ch = slice[b]!;
            if (ch === 13) s += "\n";
            else if (ch === 7) s += "\t";
            else if (ch === 12) s += "\n";
            else if (ch >= 32 || ch === 10 || ch === 9) s += String.fromCharCode(ch);
          }
          piecesText.push(s);
        }
      } else {
        // 16-bit UTF-16LE uncompressed text
        const byteOffset = fc;
        const byteCount = charCount * 2;
        if (byteOffset + byteCount <= wordDocStream.length) {
          const sliceView = new DataView(
            wordDocStream.buffer,
            wordDocStream.byteOffset + byteOffset,
            byteCount,
          );
          let s = "";
          for (let u = 0; u < charCount; u++) {
            const code = sliceView.getUint16(u * 2, true);
            if (code === 13) s += "\n";
            else if (code === 7) s += "\t";
            else if (code === 12) s += "\n";
            else if (code >= 32 || code === 10 || code === 9) s += String.fromCharCode(code);
          }
          piecesText.push(s);
        }
      }
    }

    const fullText = piecesText.join("").trim();
    if (fullText.length > 20) {
      return fullText;
    }

    return fallbackBinaryTextScanner(wordDocStream);
  } catch (err) {
    console.warn("Piece table extraction failed, falling back to stream scan:", err);
    return fallbackBinaryTextScanner(bytes);
  }
}

/**
 * Robust binary text scanner that extracts human-readable text runs (UTF-16LE and ASCII)
 * from any binary document stream, filtering out metadata headers, font tables, and binary noise.
 */
export function fallbackBinaryTextScanner(bytes: Uint8Array): string {
  const textBlocks: string[] = [];
  const minRunLength = 4;

  // 1. Scan for UTF-16LE text runs
  let utf16Buf = "";
  for (let i = 0; i < bytes.length - 1; i += 2) {
    const code = bytes[i]! | (bytes[i + 1]! << 8);
    if (code === 13 || code === 10) {
      if (utf16Buf.length >= minRunLength) textBlocks.push(utf16Buf);
      utf16Buf = "";
    } else if (code === 9 || (code >= 32 && code <= 126) || code >= 160) {
      utf16Buf += String.fromCharCode(code);
    } else {
      if (utf16Buf.length >= minRunLength) textBlocks.push(utf16Buf);
      utf16Buf = "";
    }
  }
  if (utf16Buf.length >= minRunLength) textBlocks.push(utf16Buf);

  // 2. Scan for ASCII / Latin-1 text runs
  let asciiBuf = "";
  for (let i = 0; i < bytes.length; i++) {
    const code = bytes[i]!;
    if (code === 13 || code === 10) {
      if (asciiBuf.length >= minRunLength) textBlocks.push(asciiBuf);
      asciiBuf = "";
    } else if (code === 9 || (code >= 32 && code <= 126)) {
      asciiBuf += String.fromCharCode(code);
    } else {
      if (asciiBuf.length >= minRunLength) textBlocks.push(asciiBuf);
      asciiBuf = "";
    }
  }
  if (asciiBuf.length >= minRunLength) textBlocks.push(asciiBuf);

  // Filter out system / binary artifact keywords
  const ignoredKeywords = new Set([
    "worddocument",
    "root entry",
    "summaryinformation",
    "documentsummaryinformation",
    "compobj",
    "data",
    "table",
    "microsoft word document",
    "msworddoc",
    "word.document.8",
  ]);

  const cleanLines = textBlocks
    .map((b) => b.trim())
    .filter((b) => {
      if (b.length < 3) return false;
      const lower = b.toLowerCase();
      if (ignoredKeywords.has(lower)) return false;
      // Require at least 40% alphanumeric characters to reject binary gibberish
      const letters = b.replace(/[^a-zA-Z0-9]/g, "").length;
      return letters / b.length >= 0.4;
    });

  // Deduplicate and combine consecutive lines
  const uniqueLines: string[] = [];
  const seen = new Set<string>();
  for (const line of cleanLines) {
    if (!seen.has(line)) {
      seen.add(line);
      uniqueLines.push(line);
    }
  }

  return uniqueLines.join("\n").trim();
}

/**
 * Universal text extraction for Word (.docx, .doc), HTML, RTF, and text files.
 */
export async function extractTextFromWordOrDoc(
  bytes: Uint8Array,
  filename: string = "document.doc",
): Promise<DocExtractionResult> {
  const len = bytes.length;
  if (len === 0) {
    return { text: "", wordCount: 0, lineCount: 0, format: "txt" };
  }

  // 1. Check for Modern DOCX (ZIP archive: PK\x03\x04)
  const isZip = len >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
  if (isZip) {
    try {
      const mammoth = await import("mammoth");
      const nodeBuf =
        typeof Buffer !== "undefined"
          ? (Buffer.isBuffer(bytes)
              ? bytes
              : Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength))
          : (bytes as any);
      const slicedArrayBuffer = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      );

      const result = await mammoth.extractRawText({
        buffer: nodeBuf,
        arrayBuffer: slicedArrayBuffer,
      } as any);

      const text = (result.value || "").trim();
      if (text.length > 0) {
        return {
          text,
          wordCount: text.split(/\s+/).filter(Boolean).length,
          lineCount: text.split("\n").filter((l) => l.trim().length > 0).length,
          format: "docx",
        };
      }
    } catch (e) {
      console.warn("Mammoth extraction error on zip:", e);
    }
  }

  // 2. Check for HTML Word Document (e.g., MASTER_PROJECT_PROMPT___EAGLE_TE.doc)
  // Look at first 2048 bytes for HTML tags
  const headerSample = new TextDecoder("utf-8", { fatal: false }).decode(
    bytes.subarray(0, Math.min(len, 4096)),
  );

  const isHtml =
    /<!DOCTYPE\s+html/i.test(headerSample) ||
    /<html[\s>]/i.test(headerSample) ||
    /<body[\s>]/i.test(headerSample) ||
    /<w:WordDocument/i.test(headerSample) ||
    (headerSample.includes("<div") && headerSample.includes("</div>")) ||
    (headerSample.includes("<p") && headerSample.includes("</p>"));

  if (isHtml) {
    const fullHtml = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    const text = extractTextFromHtml(fullHtml);
    if (text.length > 0) {
      return {
        text,
        wordCount: text.split(/\s+/).filter(Boolean).length,
        lineCount: text.split("\n").filter((l) => l.trim().length > 0).length,
        format: "html",
      };
    }
  }

  // 3. Check for RTF Document ({\rtf)
  const isRtf = headerSample.trimStart().startsWith("{\\rtf");
  if (isRtf) {
    const fullRtf = new TextDecoder("latin1").decode(bytes);
    const text = extractTextFromRtf(fullRtf);
    if (text.length > 0) {
      return {
        text,
        wordCount: text.split(/\s+/).filter(Boolean).length,
        lineCount: text.split("\n").filter((l) => l.trim().length > 0).length,
        format: "rtf",
      };
    }
  }

  // 4. Check for Binary Word 97-2004 CFBF / OLE2 (\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1)
  const isOle2 =
    len >= 8 &&
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0 &&
    bytes[4] === 0xa1 &&
    bytes[5] === 0xb1 &&
    bytes[6] === 0x1a &&
    bytes[7] === 0xe1;

  if (isOle2) {
    const text = extractTextFromBinaryDoc(bytes);
    if (text.length > 0) {
      return {
        text,
        wordCount: text.split(/\s+/).filter(Boolean).length,
        lineCount: text.split("\n").filter((l) => l.trim().length > 0).length,
        format: "doc",
      };
    }
  }

  // 5. UTF-8 / Plain Text Fallback
  const plainText = new TextDecoder("utf-8", { fatal: false }).decode(bytes).trim();
  if (plainText.length > 0) {
    // If it contains HTML markup that wasn't caught earlier, clean it
    const cleanedText = plainText.includes("<") && plainText.includes(">")
      ? extractTextFromHtml(plainText)
      : plainText;

    const finalText = cleanedText || plainText;
    return {
      text: finalText,
      wordCount: finalText.split(/\s+/).filter(Boolean).length,
      lineCount: finalText.split("\n").filter((l) => l.trim().length > 0).length,
      format: "txt",
    };
  }

  return { text: "", wordCount: 0, lineCount: 0, format: "txt" };
}
