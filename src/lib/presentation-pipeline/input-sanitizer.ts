import type { PresentationDirectives, SanitizedInputResult } from "./types";

const ARABIC_HEBREW_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u0590-\u05FF]/g;
const LATIN_WORD_REGEX = /[A-Za-zÀ-ÖØ-öø-ÿ\u0600-\u06FF\u0590-\u05FF\u4E00-\u9FFF]{2,}/g;

const EXTRACTION_ERROR_PREFIXES = [
  "[pdf extraction error",
  "[docx extraction error",
  "[extraction failed",
  "[ocr failed",
  "error extracting text",
  "failed to parse pdf",
  "corrupted pdf",
];

const INTERNAL_INSTRUCTION_LEAK_PATTERNS: RegExp[] = [
  /^\s*<<<\s*(?:SYSTEM|INSTRUCTIONS?|PROMPT)[\s\S]*?>>>\s*$/i,
  /^\s*(?:SYSTEM PROMPT|SYSTEM INSTRUCTIONS|PRESENTATION GENERATION INSTRUCTIONS|INTERNAL INSTRUCTIONS)\s*:/i,
  /^\s*RETURN\s+(?:ONLY\s+)?VALID\s+JSON\b/i,
  /^\s*DO\s+NOT\s+(?:OUTPUT|INCLUDE)\s+MARKDOWN\s+FENCES\b/i,
  /^\s*IMPORTANT:\s*WORK\s+ON\s+PRESENTATION\s+MAKER\s+ONLY\b/i,
  /^\s*ASSIGNMENT\s+INFORMATION\s*[—:-]\s*ALL\s+METADATA\s+FIELDS\s+OPTIONAL\s*$/i,
];

/**
 * Checks whether a raw extracted string represents binary garbage, corrupted encoding,
 * unparsed PDF/ZIP internals, or an explicit extraction error sentinel.
 */
export function detectUnreadableExtraction(rawText: string): string | null {
  if (!rawText || typeof rawText !== "string") {
    return "No source content was provided. Please paste content or upload a readable document.";
  }

  const trimmed = rawText.trim();
  if (!trimmed) {
    return "The supplied document or text input is empty.";
  }

  const lower = trimmed.toLowerCase();
  if (EXTRACTION_ERROR_PREFIXES.some((p) => lower.startsWith(p))) {
    return `Document text could not be extracted cleanly (${trimmed.slice(0, 140)}). Please provide a clearer text-based PDF, DOCX, or paste the content directly.`;
  }

  const sample = trimmed.slice(0, 4000);

  // Raw compressed or binary header leakage (catches truncated %PDF streams even with short ASCII words)
  if (/^%PDF-\d\.\d/i.test(trimmed)) {
    const hasBinaryStreamTokens = /\b(?:obj|endobj|stream|endstream|xref|trailer)\b/.test(trimmed);
    const pdfTokensShort = (sample.match(/\/(?:Type|Font|Resources|MediaBox|Contents|XObject|Filter|FlateDecode)\b/g) || []).length;
    if (hasBinaryStreamTokens || pdfTokensShort >= 2 || trimmed.includes("\uFFFD")) {
      return "Raw PDF binary syntax was received instead of extracted readable text.";
    }
  }
  if (/^PK\x03\x04/.test(trimmed)) {
    return "Raw ZIP/DOCX binary bytes were received instead of extracted readable text.";
  }

  // Excessive null bytes or Unicode replacement characters (broken PDF font CMap / scan garbage)
  const replacementMatches = sample.match(/\uFFFD|\x00/g);
  if (
    replacementMatches &&
    (replacementMatches.length / sample.length > 0.08 ||
      (sample.length < 250 && replacementMatches.length >= 3))
  ) {
    return "The uploaded file contains severely corrupted character encoding (garbled glyphs) and cannot be reliably understood.";
  }

  // PDF structural token storm without readable prose
  const pdfTokenMatches = sample.match(/\/(?:Type|Font|Resources|MediaBox|Contents|XObject|Filter|FlateDecode)\b/g);
  const realWords = trimmed.match(LATIN_WORD_REGEX) || [];
  if (pdfTokenMatches && pdfTokenMatches.length >= 6 && realWords.length < 18) {
    return "Only raw PDF structural streams could be read; no natural language content was extracted.";
  }

  if (realWords.length < 2) {
    return "No meaningful words or sentences were found in the extracted source. If this is an image-only scan, try OCR or a text-based document.";
  }

  return null;
}

/**
 * Normalizes line breaks, removes harmless invisible control chars, and strips
 * accidental prompt/system wrapper lines while preserving 100% of genuine user content.
 * Strictly separates user source text from generation directives and metadata.
 */
export function sanitizePresentationInput(
  rawSourceText: string,
  _directives?: PresentationDirectives,
): SanitizedInputResult {
  const unreadableError = detectUnreadableExtraction(rawSourceText);
  if (unreadableError) {
    return {
      valid: false,
      errorReason: unreadableError,
      cleanSourceText: "",
      paragraphs: [],
      wordCount: 0,
      detectedLanguage: "English",
      isRtl: false,
      strippedNoiseCount: 0,
    };
  }

  // Normalize line endings, inline markdown bold/backticks, stuck DOCX table joins, decorative bullets, and invisible zero-width junk
  const normalized = rawSourceText
    .replace(/\r\n?/g, "\n")
    .replace(/[\u200B-\u200D\uFEFF\uFE00-\uFE0F]/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*{2,}/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/([A-Z]{4,})([A-Z][a-z]+)\b/g, "$1 $2")
    .replace(/^[\s]*[▪▫❖➢➣➤📌🌱⭐⚠️✓•]+\s*/gmu, "- ")
    .replace(/\t+/g, " ");

  const rawLines = normalized.split("\n");

  // Detect repeated running headers/footers/watermarks (short <=48 char lines repeated >=3 times)
  const lineFreq = new Map<string, number>();
  for (const rl of rawLines) {
    const norm = rl.trim().replace(/\s+/g, " ").toLowerCase();
    if (norm.length >= 3 && norm.length <= 48 && !norm.startsWith("-") && !norm.startsWith("•")) {
      lineFreq.set(norm, (lineFreq.get(norm) || 0) + 1);
    }
  }
  const repeatedChromeLines = new Set(
    Array.from(lineFreq.entries())
      .filter(([txt, count]) => count >= 3 && txt.split(/\s+/).length <= 6)
      .map(([txt]) => txt),
  );

  const cleanLines: string[] = [];
  let strippedNoiseCount = 0;

  for (const line of rawLines) {
    const t = line.trim();
    if (!t) {
      cleanLines.push("");
      continue;
    }

    // Filter obvious page-number / watermark / running header/footer chrome lines
    if (
      /^(?:page\s+\d+(?:\s*(?:of|\/)\s*\d+)?|[-—–\s]*\d+\s+(?:of|\/)\s+\d+[-—–\s]*|[-_=*~]{5,})$/i.test(t) ||
      repeatedChromeLines.has(t.replace(/\s+/g, " ").toLowerCase())
    ) {
      strippedNoiseCount++;
      continue;
    }

    // Strip internal prompt wrapper markers ONLY if matched unambiguously
    if (
      rawLines.length > 4 &&
      INTERNAL_INSTRUCTION_LEAK_PATTERNS.some((re) => re.test(t))
    ) {
      strippedNoiseCount++;
      continue;
    }

    cleanLines.push(line.replace(/[ \t]+$/g, ""));
  }

  const collapsed = cleanLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();

  // Build logical paragraphs / blocks preserving markdown headings & grouped lists
  const rawBlocks = collapsed
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  // Split blocks that pack multiple headings + lists onto single newlines (common in PDFs & pasted notes)
  const paragraphs: string[] = [];
  for (const block of rawBlocks) {
    const subLines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (subLines.length > 3) {
      // Group consecutive list/body lines under true headings rather than smashing entire PDF pages together
      let current = "";
      for (const sl of subLines) {
        const isGenericSubLabel =
          /^(?:\d+(?:\.\d+)?\s+)?(?:responsibilities|attributes|methods|operations|properties|ethiopian example|primary focus)\s*:?$/i.test(
            sl,
          ) ||
          /^(?:\d+(?:\.\d+)?\s+)?the\s+(?:system|project|application)\s+will\b/i.test(sl);
        const isNumberedHeading =
          !isGenericSubLabel &&
          /^\d+(?:\.\d+){0,2}[.)]?\s+[A-Z\u0600-\u06FF]/.test(sl) &&
          sl.length <= 70 &&
          !/[.!?]$/.test(sl) &&
          !/:.{10,}/.test(sl);
        const isHeading =
          !isGenericSubLabel &&
          (/^#{1,4}\s+/.test(sl) ||
            isNumberedHeading ||
            /^(?:section|chapter|part|module)\s+[A-Z0-9]+\s*[:—–-]/i.test(sl) ||
            (/^[A-Z][A-Za-z0-9\s,&:/-]{3,60}:$/.test(sl) && current.length > 0));
        if (isHeading && current) {
          paragraphs.push(current.trim());
          current = sl;
        } else {
          current = current ? `${current}\n${sl}` : sl;
        }
      }
      if (current) paragraphs.push(current.trim());
    } else {
      paragraphs.push(block);
    }
  }

  const finalText = paragraphs.join("\n\n").trim();
  if (!finalText) {
    return {
      valid: false,
      errorReason: "After cleaning page noise, no substantive source text remained to build a presentation.",
      cleanSourceText: "",
      paragraphs: [],
      wordCount: 0,
      detectedLanguage: "English",
      isRtl: false,
      strippedNoiseCount,
    };
  }

  const words = finalText.split(/\s+/).filter(Boolean);
  const rtlMatches = finalText.match(ARABIC_HEBREW_REGEX) || [];
  const totalLetters = finalText.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\u0600-\u06FF\u0590-\u05FF]/g, "").length || 1;
  const isRtl = rtlMatches.length / totalLetters > 0.25;

  const hasArabic = /[\u0600-\u06FF]/.test(finalText);
  const hasHebrew = /[\u0590-\u05FF]/.test(finalText);
  const detectedLanguage = isRtl ? (hasArabic ? "Arabic" : hasHebrew ? "Hebrew" : "Arabic") : "English";

  return {
    valid: true,
    cleanSourceText: finalText,
    paragraphs,
    wordCount: words.length,
    detectedLanguage,
    isRtl,
    strippedNoiseCount,
  };
}
