/**
 * DocuMind High-Precision OCR Noise & Artifact Cleaner
 *
 * Automatically removes UI symbols, icon artifacts, stray punctuation,
 * and garbled glyphs commonly produced by screenshot/UI OCR engines.
 */

export function cleanOcrArtifacts(text: string): string {
  if (!text) return "";

  const lines = text.split("\n");
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

    // 1. Discard isolated single/double character noise lines (e.g. lone "A", "]", "|", "_", "~", ")", "1", ";")
    if (
      l.length <= 2 &&
      /^[A-Za-z0-9~_|\^\*\]\)\(\>\<\#\$\@\+\=\-\.\,\;\:\!\?\/\\\{\}]+$/.test(l) &&
      !/^\d+$/.test(l)
    ) {
      continue;
    }

    // 2. Discard lines that are solely punctuation or icon debris (e.g. "]] |", "*- -", "_~_")
    if (/^[~_|\^\*\]\)\(\>\<\#\$\@\+\=\-\.\,\;\:\!\?\/\\\{\}\s]{2,}$/.test(l)) {
      continue;
    }

    // 3. Remove stray leading OCR UI/icon artifacts:
    // e.g. "~ E-DC", "*_ Pinned", "] | Photo", "J One team", ") See youin", "1 Forwarded"
    l = l.replace(/^[\~_\*\^\|\>\<#\$@\+\=]+\s*/, "");
    l = l.replace(/^[\]\)\(\}\s]*\|[\s\]\)]*/, "");
    l = l.replace(/^[\*_\~\|\s]+/, "");
    l = l.replace(/^[0-9]\s+(?=[A-Z][a-z])/, "");
    l = l.replace(/^[JjIil1\)\(\]\[]\s+(?=[A-Z][a-z])/, "");
    l = l.replace(/^[0-9\)\(\]\[]\s+(?=[a-z])/, "");

    // 4. Strip specific UI/app icon artifacts commonly decoded from chat/social apps:
    l = l.replace(/\[W\]\$?\s*@?/gi, ""); // emoji/views icon debris
    l = l.replace(/^[0-9\(\s]*\(DD\s*/gi, ""); // speech bubble comment icon debris
    l = l.replace(/^[0-9\s]*Leave a comment/i, "Leave a comment");
    l = l.replace(/\(\s*\)\s*/g, " "); // empty parens from avatar circles
    l = l.replace(/\s*#$/g, ""); // stray hash at end of line

    // 5. Unclosed bracket on headings: e.g. "[ HUAWEI COMPETITION" -> "HUAWEI COMPETITION"
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

    // 6. Clean multiple consecutive spaces
    l = l.replace(/[ \t]{2,}/g, " ").trim();

    if (l) {
      cleaned.push(l);
    }
  }

  // De-hyphenate broken words across line wraps (e.g. "technology-\nrelated" -> "technology-related")
  let result = cleaned.join("\n");
  result = result.replace(/(\b[a-zA-Z]{2,})-\n\s*([a-zA-Z]{2,}\b)/g, "$1-$2");

  return result.trim();
}

/**
 * Merges artificial line wraps from screenshots/mobile chats into natural paragraphs
 * while preserving list items, headings, and intentional empty lines.
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

    // Is this a distinct item/heading that shouldn't be merged?
    const isBulletOrList = /^[-*•\d.]\s+/.test(trimmed);
    const isHeading =
      /^#+\s+/.test(trimmed) ||
      (trimmed.length < 50 && !trimmed.endsWith(".") && !isBulletOrList && /^[A-Z0-9]/.test(trimmed));

    if (isBulletOrList || isHeading) {
      if (currentParagraph) {
        paragraphs.push(currentParagraph.trim());
        currentParagraph = "";
      }
      paragraphs.push(trimmed);
      continue;
    }

    // Continue current paragraph or start new
    if (currentParagraph) {
      // Check if previous line ended with hyphen
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

  return paragraphs.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
