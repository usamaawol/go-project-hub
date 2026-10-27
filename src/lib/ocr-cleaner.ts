/**
 * DocuMind High-Precision OCR Noise & Artifact Cleaner
 *
 * Automatically removes UI symbols, icon artifacts, stray punctuation,
 * timestamps, social buttons, and garbled glyphs commonly produced by
 * screenshot/mobile UI OCR engines.
 */

/**
 * Strips UI chrome, buttons, timestamps, icon debris, stray symbols,
 * and garbled glyphs from raw OCR text.
 */
export function cleanOcrArtifacts(text: string): string {
  if (!text) return "";

  // 1. Join URLs that were artificially broken across line wraps
  let joined = text.replace(
    /(https?:\/\/[^\s]+)\n([a-zA-Z0-9_\-\.\/\?\=\&\%\#]+)/g,
    "$1$2",
  );

  // 2. De-hyphenate broken words across line wraps (e.g. "technology-\nbased" -> "technology-based")
  joined = joined.replace(/(\b[a-zA-Z]{2,})-\n\s*([a-zA-Z]{2,}\b)/g, "$1-$2");

  const lines = joined.split("\n");
  const cleaned: string[] = [];

  for (let rawLine of lines) {
    let l = rawLine.trim();

    // Preserve intentional paragraph spacing (max 1 consecutive blank line)
    if (!l) {
      if (cleaned.length > 0 && cleaned[cleaned.length - 1] !== "") {
        cleaned.push("");
      }
      continue;
    }

    // Strip leading OCR symbols & quote bars early (preserve hashtags like #Huawei)
    l = l.replace(/^(?!#[a-zA-Z0-9_])[\~_\*\^\|\>\<#\$@\+\=]+\s*/, "");
    l = l.replace(/^[\]\)\(\}\s]*\|[\s\]\)]*/, "");
    l = l.replace(/^[\*_\~\|\s]+/, "");

    // Discard isolated single/double character noise lines (e.g. lone "A", "]", "|", "_", "~", ")", "1", ";")
    if (
      l.length <= 2 &&
      /^[A-Za-z0-9~_|\^\*\]\)\(\>\<\#\$\@\+\=\-\.\,\;\:\!\?\/\\\{\}]+$/.test(l) &&
      !/^\d+$/.test(l)
    ) {
      continue;
    }

    // Discard lines that are solely punctuation or icon debris (e.g. "]] |", "*- -", "_~_")
    if (/^[~_|\^\*\]\)\(\>\<\#\$\@\+\=\-\.\,\;\:\!\?\/\\\{\}\s]{2,}$/.test(l)) {
      continue;
    }

    // Discard UI action buttons, badges, status bars, subscriber counts, and comments UI
    // E.g. "1 (OD Leave a comment >", "Leave a comment >", "Pinned message", "Photo", "1,187 subscribers"
    if (
      /(?:Leave a comment|Pinned message|\bPhoto\b|\bVideo\b|\bAudio\b|\b\d+(?:,\d+)*\s*subscribers?\b|\bcomments?\s*>)/i.test(
        l,
      )
    ) {
      continue;
    }

    // Forwarded message line: clean icon debris e.g. "1 Forwarded from () HU Huawei ICT Academy"
    if (/Forwarded from/i.test(l)) {
      l = l.replace(/^[0-9IlJj\)\(\]\[:;~_\s]*Forwarded from\s*[\(\)\[\]\s]*/i, "Forwarded from ");
      l = l.replace(/\(\)\s*/g, ""); // strip empty parens from channel logo
    }

    // Strip timestamps, view counts, and reactions at line ends
    // E.g. "See youin Baile! [W]¢ © 47 1032 AM", "c @ 47 1032 AM", "47 10:32 AM", "@ 47 1032 AM"
    l = l.replace(
      /\s*(?:\[[A-Za-z0-9]+\])?\s*[¢©@cCeE]?\s*[@#]?\s*\d{1,6}\s+\d{1,2}[:.]?\d{2}\s*(?:AM|PM)?$/i,
      "",
    );
    l = l.replace(/\s+\d{1,2}[:.]\d{2}\s*(?:AM|PM)$/i, "");
    l = l.replace(/\s*(?:\[[A-Za-z0-9]+\]|[¢©@cCeE])\s*\d{0,6}\s*$/i, "");
    l = l.replace(/\s*\[W\][¢©@]?\s*$/i, "");

    // Fix fused words commonly produced by mobile OCR engines
    l = l.replace(/\byouin\b/gi, "you in");
    l = l.replace(/\bAre vou\b/gi, "Are you");

    // Leading stray letters/numbers/symbols before words (e.g. "1 Students", ") to participate", "I This is", ": ideas", "§ Don't")
    l = l.replace(/^[0-9IlJj1\)\(\]\[:;§©®™~_|*^]+\s+(?=[A-Za-z0-9#\(\['"«])/, "");

    // Strip emoji artifacts at line start:
    // e.g. "1 [EB REGISTER HERE:", "[EB ", "1 ® REGISTRATION DEADLINE:", "(OD "
    l = l.replace(/^(?:[0-9\(\)\[\]\s*]*\(?OD\)?\s*)/i, "");
    l = l.replace(/^(?:\[[A-Za-z0-9]{1,4}\]?\s*)/i, "");
    l = l.replace(/^[0-9\(\)\[\]\s*]*[®©™]\s*/, "");
    l = l.replace(/^[0-9IlJj1\)\(\]\[:;§©®™~_|*^]+\s+(?=[A-Za-z0-9#\(\['"«])/, "");

    // End-of-line noise symbols like stray "#" at end of heading
    l = l.replace(/\s+[#~_*^|]+$/, "");

    // Unclosed bracket on headings: e.g. "[ HUAWEI COMPETITION - HARAMAYA UNIVERSITY!"
    if (l.startsWith("[") && !l.includes("]")) {
      l = l.replace(/^\[\s*/, "");
    }
    if (l.endsWith("]") && !l.includes("[")) {
      l = l.replace(/\s*\]$/, "");
    }

    // Symmetrical square brackets wrapping an entire sentence or heading (not a tag or community name)
    const wrappedHeadingMatch = l.match(/^\[\s*([A-Z0-9\s\-\:\!\?]{6,})\s*\]$/);
    if (wrappedHeadingMatch && wrappedHeadingMatch[1]) {
      l = wrappedHeadingMatch[1].trim();
    }

    // Clean multiple consecutive spaces
    l = l.replace(/[ \t]{2,}/g, " ").trim();

    if (l) {
      cleaned.push(l);
    }
  }

  let result = cleaned.join("\n");
  result = result.replace(/(\b[a-zA-Z]{2,})-\n\s*([a-zA-Z]{2,}\b)/g, "$1-$2");

  return result.trim();
}

/**
 * Merges artificial line wraps from screenshots/mobile chats into natural paragraphs
 * while preserving list items, headings, URLs, hashtags, and intentional empty lines.
 */
export function mergeSentenceWraps(text: string): string {
  if (!text) return "";

  const lines = text.split("\n");
  const paragraphs: string[] = [];
  let currentParagraph = "";

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? "";
    const trimmed = raw.trim();

    if (!trimmed) {
      if (currentParagraph) {
        paragraphs.push(currentParagraph.trim());
        currentParagraph = "";
      }
      paragraphs.push("");
      continue;
    }

    // Is this a distinct element that should NEVER be merged into a previous paragraph?
    const isUrl = /^https?:\/\//i.test(trimmed);
    const isHashtags = /^#[A-Za-z0-9_]/.test(trimmed);
    const isBulletOrList = /^[-*•\d.]\s+/.test(trimmed);
    const isSectionLabel =
      /^Forwarded from/i.test(trimmed) ||
      /^REGISTER HERE:/i.test(trimmed) ||
      /^REGISTRATION DEADLINE/i.test(trimmed) ||
      /^Contact Information/i.test(trimmed) ||
      /^Google Docs/i.test(trimmed);
    const isHeadingOrBanner =
      /^#+\s+/.test(trimmed) ||
      /^[A-Z0-9\s\-\:\!]{8,}$/.test(trimmed) ||
      trimmed.startsWith("E-DC") ||
      trimmed.includes("[East Developers Community]") ||
      (trimmed.length < 60 &&
        !trimmed.endsWith(".") &&
        !trimmed.endsWith(",") &&
        !isBulletOrList &&
        /^[A-Z]/.test(trimmed) &&
        trimmed.includes("-"));

    if (isUrl || isHashtags || isBulletOrList || isSectionLabel || isHeadingOrBanner) {
      if (currentParagraph) {
        paragraphs.push(currentParagraph.trim());
        currentParagraph = "";
      }
      // If hashtags follow hashtags, group them together on the same line
      if (
        isHashtags &&
        paragraphs.length > 0 &&
        /^#[A-Za-z0-9_]/.test(paragraphs[paragraphs.length - 1] ?? "")
      ) {
        paragraphs[paragraphs.length - 1] += " " + trimmed;
      } else {
        paragraphs.push(trimmed);
      }
      continue;
    }

    // Check if the previous statement ended with terminal punctuation (? or ! or :)
    if (currentParagraph) {
      const prevEndsWithTerminator = /[?!:]$/.test(currentParagraph.trim());
      if (prevEndsWithTerminator) {
        paragraphs.push(currentParagraph.trim());
        currentParagraph = trimmed;
        continue;
      }

      if (currentParagraph.endsWith("-")) {
        currentParagraph = currentParagraph.slice(0, -1) + trimmed;
      } else {
        currentParagraph += " " + trimmed;
      }
    } else {
      currentParagraph = trimmed;
    }
  }

  if (currentParagraph) {
    paragraphs.push(currentParagraph.trim());
  }

  return paragraphs
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Composite OCR processor that removes all UI debris, buttons, timestamps,
 * stray glyphs, fixes broken URLs, and formats text into clean flowing paragraphs.
 */
export function cleanAndFormatOcrText(text: string): string {
  if (!text) return "";
  const cleaned = cleanOcrArtifacts(text);
  return mergeSentenceWraps(cleaned);
}
